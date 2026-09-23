import { randomUUID } from "node:crypto";
import { getDbInstance } from "./core";
import type { StoneSecurityFinding, StoneSecurityGateResult, StoneSecurityPolicy } from "@/lib/security/omniSightCode";

export interface OmniSightScanContext {
  source: string;
  artifactRef?: string;
  commitSha?: string;
  imageDigest?: string;
}

export interface OmniSightStoredScan extends OmniSightScanContext {
  id: string;
  allowed: boolean;
  blockingCount: number;
  advisoryCount: number;
  summary: Record<string, number>;
  createdAt: string;
}

export function persistOmniSightScan(
  context: OmniSightScanContext,
  findings: StoneSecurityFinding[],
  gate: StoneSecurityGateResult,
  policy: StoneSecurityPolicy
): OmniSightStoredScan {
  const db = getDbInstance();
  const id = randomUUID();
  const now = new Date().toISOString();
  const blockingIds = new Set(gate.blocking.map((f) => f.id));

  const tx = db.transaction(() => {
    db.prepare(`INSERT INTO omnisight_security_scans (
      id, source, artifact_ref, commit_sha, image_digest, policy_json, allowed,
      blocking_count, advisory_count, summary_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      id, context.source, context.artifactRef ?? null, context.commitSha ?? null,
      context.imageDigest ?? null, JSON.stringify(policy), gate.allowed ? 1 : 0,
      gate.blocking.length, gate.advisory.length, JSON.stringify(gate.summary), now
    );

    const insert = db.prepare(`INSERT INTO omnisight_security_findings (
      id, scan_id, finding_id, fingerprint, source, category, severity, title,
      description, location_json, cve_json, fix_available, fix_version,
      evidence_json, disposition, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

    for (const finding of findings) {
      insert.run(
        randomUUID(), id, finding.id, finding.fingerprint ?? null, finding.source,
        finding.category, finding.severity, finding.title, finding.description ?? null,
        finding.location ? JSON.stringify(finding.location) : null,
        finding.cve ? JSON.stringify(finding.cve) : null,
        finding.fixAvailable ? 1 : 0, finding.fixVersion ?? null,
        finding.evidence ? JSON.stringify(finding.evidence) : null,
        blockingIds.has(finding.id) ? "blocking" : "advisory", now
      );
    }
  });
  tx();

  return { id, ...context, allowed: gate.allowed, blockingCount: gate.blocking.length,
    advisoryCount: gate.advisory.length, summary: gate.summary, createdAt: now };
}

export function listOmniSightScans(limit = 50): OmniSightStoredScan[] {
  const safeLimit = Math.max(1, Math.min(200, Math.trunc(limit)));
  const rows = getDbInstance().prepare(
    "SELECT * FROM omnisight_security_scans ORDER BY created_at DESC LIMIT ?"
  ).all(safeLimit) as Record<string, unknown>[];
  return rows.map((row) => ({
    id: String(row.id), source: String(row.source),
    artifactRef: typeof row.artifact_ref === "string" ? row.artifact_ref : undefined,
    commitSha: typeof row.commit_sha === "string" ? row.commit_sha : undefined,
    imageDigest: typeof row.image_digest === "string" ? row.image_digest : undefined,
    allowed: row.allowed === 1 || row.allowed === true,
    blockingCount: Number(row.blocking_count ?? 0), advisoryCount: Number(row.advisory_count ?? 0),
    summary: JSON.parse(String(row.summary_json ?? "{}")), createdAt: String(row.created_at),
  }));
}

export function getOmniSightFindings(scanId: string): Record<string, unknown>[] {
  return getDbInstance().prepare(
    "SELECT * FROM omnisight_security_findings WHERE scan_id = ? ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END, created_at ASC"
  ).all(scanId) as Record<string, unknown>[];
}
