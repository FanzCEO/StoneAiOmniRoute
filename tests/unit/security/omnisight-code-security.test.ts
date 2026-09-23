import { describe, expect, it } from "vitest";
import { evaluateSecurityGate, fromGitleaks, fromOsv, fromSarif, normalizeSeverity } from "@/lib/security/omniSightCode";

describe("OmniSight code security", () => {
  it("normalizes scanner severities", () => {
    expect(normalizeSeverity("CRITICAL")).toBe("critical");
    expect(normalizeSeverity("warning")).toBe("medium");
    expect(normalizeSeverity("error")).toBe("high");
  });

  it("blocks secrets and critical findings by default", () => {
    const findings = fromGitleaks([{ RuleID:"generic-api-key", Description:"secret", File:"src/a.ts", StartLine:7, Fingerprint:"fp" }]);
    const gate = evaluateSecurityGate(findings);
    expect(gate.allowed).toBe(false);
    expect(gate.blocking).toHaveLength(1);
    expect(gate.summary.critical).toBe(1);
  });

  it("allows explicit fingerprint exceptions without deleting evidence", () => {
    const findings = fromGitleaks([{ RuleID:"fixture", Description:"test fixture", File:"tests/a.ts", StartLine:1, Fingerprint:"known-fixture" }]);
    const gate = evaluateSecurityGate(findings, { allowFindingIds:["known-fixture"] });
    expect(gate.allowed).toBe(true);
    expect(gate.advisory).toHaveLength(1);
  });

  it("normalizes SARIF findings", () => {
    const findings = fromSarif({ runs:[{ tool:{driver:{name:"Trivy"}}, results:[{ ruleId:"CVE-X", level:"error", message:{text:"vuln"}, locations:[{physicalLocation:{artifactLocation:{uri:"image"},region:{startLine:1}}}] }] }] });
    expect(findings[0].category).toBe("container");
    expect(findings[0].severity).toBe("high");
  });

  it("normalizes OSV dependency vulnerabilities and fix evidence", () => {
    const findings = fromOsv({results:[{packages:[{package:{name:"pkg",version:"1.0.0"},vulnerabilities:[{id:"CVE-TEST",database_specific:{severity:"HIGH"},affected:[{ranges:[{events:[{fixed:"1.0.1"}]}]}]}]}]}]});
    expect(findings[0].category).toBe("dependency");
    expect(findings[0].fixAvailable).toBe(true);
    expect(findings[0].fixVersion).toBe("1.0.1");
  });
});
