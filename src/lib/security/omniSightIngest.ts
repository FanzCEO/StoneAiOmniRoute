import { evaluateSecurityGate, fromGitleaks, fromOsv, fromSarif, type StoneSecurityFinding, type StoneSecurityPolicy } from "./omniSightCode";

export type OmniSightScannerFormat = "sarif" | "gitleaks" | "osv" | "stone";

export function ingestScannerOutput(format: OmniSightScannerFormat, payload: unknown, source?: string): StoneSecurityFinding[] {
  switch (format) {
    case "sarif": return fromSarif(payload, source ?? "sarif");
    case "gitleaks": return fromGitleaks(payload);
    case "osv": return fromOsv(payload);
    case "stone":
      return Array.isArray(payload)
        ? payload.filter((f): f is StoneSecurityFinding => Boolean(f && typeof f === "object" && "id" in f && "severity" in f))
        : [];
  }
}

export function evaluateScannerOutput(
  format: OmniSightScannerFormat,
  payload: unknown,
  policy: StoneSecurityPolicy = {},
  source?: string
) {
  const findings = ingestScannerOutput(format, payload, source);
  return { findings, gate: evaluateSecurityGate(findings, policy) };
}
