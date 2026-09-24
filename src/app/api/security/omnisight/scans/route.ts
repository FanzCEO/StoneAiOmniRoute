import { NextResponse } from "next/server";
import { requireManagementAuth } from "@/lib/api/requireManagementAuth";
import { evaluateScannerOutput, type OmniSightScannerFormat } from "@/lib/security/omniSightIngest";
import { persistOmniSightScan, listOmniSightScans } from "@/lib/db/omniSightSecurity";
import { listActiveSecurityExceptions } from "@/lib/db/omniSightExceptions";
import type { StoneSecurityPolicy } from "@/lib/security/omniSightCode";

const FORMATS = new Set<OmniSightScannerFormat>(["sarif", "gitleaks", "osv", "stone"]);

export async function GET(request: Request) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? 50);
  return NextResponse.json({ scans: listOmniSightScans(Number.isFinite(limit) ? limit : 50) });
}

export async function POST(request: Request) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  let body: any;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

  const format = body?.format as OmniSightScannerFormat;
  if (!FORMATS.has(format)) {
    return NextResponse.json({ error: "format must be sarif, gitleaks, osv, or stone" }, { status: 400 });
  }
  if (body?.payload === undefined) {
    return NextResponse.json({ error: "payload is required" }, { status: 400 });
  }

  const requestedPolicy: StoneSecurityPolicy = body.policy && typeof body.policy === "object" ? body.policy : {};
  const exceptionIds = listActiveSecurityExceptions().flatMap((row:any) =>
    [row.finding_id, row.fingerprint].filter((value): value is string => typeof value === "string" && value.length > 0)
  );
  const policy: StoneSecurityPolicy = {
    ...requestedPolicy,
    allowFindingIds: [...new Set([...(requestedPolicy.allowFindingIds ?? []), ...exceptionIds])],
  };
  const { findings, gate } = evaluateScannerOutput(format, body.payload, policy, body.source);
  const scan = persistOmniSightScan({
    source: typeof body.source === "string" ? body.source : format,
    artifactRef: typeof body.artifactRef === "string" ? body.artifactRef : undefined,
    commitSha: typeof body.commitSha === "string" ? body.commitSha : undefined,
    imageDigest: typeof body.imageDigest === "string" ? body.imageDigest : undefined,
  }, findings, gate, policy);

  return NextResponse.json({ scan, gate }, { status: gate.allowed ? 201 : 422 });
}
