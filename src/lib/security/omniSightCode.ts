/**
 * OmniSight Code Security: native code-to-cloud finding model.
 * External scanners are sensors; Stone policy remains the authority.
 */
export type StoneSecuritySeverity = "info" | "low" | "medium" | "high" | "critical";
export type StoneSecurityCategory = "sast" | "dependency" | "secret" | "iac" | "container" | "sbom" | "supply-chain" | "runtime" | "misconfiguration";

export interface StoneSecurityFinding {
  id: string;
  source: string;
  category: StoneSecurityCategory;
  severity: StoneSecuritySeverity;
  title: string;
  description?: string;
  cve?: string[];
  location?: { path?: string; line?: number; column?: number; image?: string; package?: string; version?: string; resource?: string };
  fixAvailable?: boolean;
  fixVersion?: string;
  fingerprint?: string;
  evidence?: Record<string, unknown>;
}
export interface StoneSecurityPolicy {
  blockCritical?: boolean;
  blockFixableHigh?: boolean;
  blockSecrets?: boolean;
  blockSupplyChain?: boolean;
  allowFindingIds?: string[];
}
export interface StoneSecurityGateResult {
  allowed: boolean;
  blocking: StoneSecurityFinding[];
  advisory: StoneSecurityFinding[];
  summary: Record<StoneSecuritySeverity, number>;
}
const SEVERITIES: StoneSecuritySeverity[] = ["info","low","medium","high","critical"];

export function normalizeSeverity(value: unknown): StoneSecuritySeverity {
  const raw = String(value ?? "").toLowerCase();
  if (raw.includes("critical")) return "critical";
  if (raw.includes("high") || raw === "error") return "high";
  if (raw.includes("medium") || raw.includes("moderate") || raw === "warning") return "medium";
  if (raw.includes("low") || raw === "note") return "low";
  return "info";
}
export function summarizeFindings(findings: StoneSecurityFinding[]) {
  const summary = Object.fromEntries(SEVERITIES.map((s) => [s,0])) as Record<StoneSecuritySeverity,number>;
  for (const f of findings) summary[f.severity]++;
  return summary;
}
export function evaluateSecurityGate(findings: StoneSecurityFinding[], policy: StoneSecurityPolicy = {}): StoneSecurityGateResult {
  const allow = new Set(policy.allowFindingIds ?? []);
  const blocking: StoneSecurityFinding[] = [];
  const advisory: StoneSecurityFinding[] = [];
  for (const f of findings) {
    if (allow.has(f.id) || (f.fingerprint && allow.has(f.fingerprint))) { advisory.push(f); continue; }
    const mustBlock =
      (policy.blockSecrets !== false && f.category === "secret") ||
      (policy.blockCritical !== false && f.severity === "critical") ||
      (policy.blockFixableHigh === true && f.severity === "high" && f.fixAvailable === true) ||
      (policy.blockSupplyChain === true && f.category === "supply-chain");
    (mustBlock ? blocking : advisory).push(f);
  }
  return { allowed: blocking.length === 0, blocking, advisory, summary: summarizeFindings(findings) };
}
function stableId(source:string, rule:unknown, path:unknown, line:unknown) {
  return [source,rule ?? "unknown",path ?? "unknown",line ?? 0].map((p)=>String(p).replace(/\s+/g,"-").toLowerCase()).join(":");
}
export function fromSarif(input: unknown, source = "sarif"): StoneSecurityFinding[] {
  const doc = input as any; const findings: StoneSecurityFinding[] = [];
  for (const run of Array.isArray(doc?.runs) ? doc.runs : []) {
    const driver = run?.tool?.driver?.name || source;
    for (const result of Array.isArray(run?.results) ? run.results : []) {
      const physical=result?.locations?.[0]?.physicalLocation, region=physical?.region, path=physical?.artifactLocation?.uri;
      const ruleId=result?.ruleId || result?.rule?.id || "unknown";
      findings.push({id:stableId(driver,ruleId,path,region?.startLine),source:String(driver),
        category:String(driver).toLowerCase().includes("trivy") ? "container" : "sast",
        severity:normalizeSeverity(result?.level ?? result?.properties?.severity),
        title:result?.message?.text || String(ruleId),location:{path,line:region?.startLine,column:region?.startColumn},
        fingerprint:result?.partialFingerprints?.primaryLocationLineHash || result?.fingerprints?.primaryLocationLineHash,evidence:{ruleId}});
    }
  } return findings;
}
export function fromGitleaks(input: unknown): StoneSecurityFinding[] {
  if (!Array.isArray(input)) return [];
  return input.filter((e)=>e && typeof e==="object").map((e:any)=>({
    id:stableId("gitleaks",e.RuleID ?? e.ruleId,e.File ?? e.file,e.StartLine),source:"gitleaks",category:"secret" as const,
    severity:"critical" as const,title:e.Description || e.RuleID || "Secret detected",
    location:{path:e.File ?? e.file,line:e.StartLine ?? e.startLine},fingerprint:e.Fingerprint ?? e.fingerprint,evidence:{ruleId:e.RuleID ?? e.ruleId}}));
}
export function fromOsv(input: unknown): StoneSecurityFinding[] {
  const doc=input as any, findings:StoneSecurityFinding[]=[];
  for(const result of Array.isArray(doc?.results)?doc.results:[]) for(const pkg of Array.isArray(result?.packages)?result.packages:[]) {
    const name=pkg?.package?.name, version=pkg?.package?.version;
    for(const vuln of Array.isArray(pkg?.vulnerabilities)?pkg.vulnerabilities:[]) {
      const fixed=Array.isArray(vuln?.affected)?vuln.affected.flatMap((a:any)=>a?.ranges??[]).flatMap((r:any)=>r?.events??[]).find((e:any)=>e?.fixed)?.fixed:undefined;
      findings.push({id:["osv",vuln?.id??"unknown",name??"unknown",version??"unknown"].join(":"),source:"osv",category:"dependency",
        severity:normalizeSeverity(vuln?.database_specific?.severity),title:vuln?.summary||vuln?.id||"Dependency vulnerability",
        description:vuln?.details,cve:[vuln?.id,...(vuln?.aliases??[])].filter((x:unknown)=>/^CVE-/i.test(String(x))),
        location:{package:name,version},fixAvailable:Boolean(fixed),fixVersion:fixed,evidence:{aliases:vuln?.aliases??[]}});
    }
  } return findings;
}
