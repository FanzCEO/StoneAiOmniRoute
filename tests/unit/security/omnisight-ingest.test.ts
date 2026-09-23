import { describe, expect, it } from "vitest";
import { evaluateScannerOutput, ingestScannerOutput } from "@/lib/security/omniSightIngest";

describe("OmniSight scanner ingestion", () => {
  it("ingests Semgrep-style SARIF", () => {
    const findings=ingestScannerOutput("sarif",{runs:[{tool:{driver:{name:"Semgrep"}},results:[{ruleId:"xss",level:"error",message:{text:"unsafe output"}}]}]},"semgrep");
    expect(findings).toHaveLength(1);
    expect(findings[0].source).toBe("Semgrep");
    expect(findings[0].severity).toBe("high");
  });
  it("blocks a gitleaks finding", () => {
    const result=evaluateScannerOutput("gitleaks",[{RuleID:"api-key",File:"src/x.ts",StartLine:4,Description:"secret"}]);
    expect(result.gate.allowed).toBe(false);
    expect(result.gate.blocking).toHaveLength(1);
  });
  it("can block fixable high dependency vulnerabilities by policy", () => {
    const payload={results:[{packages:[{package:{name:"dep",version:"1"},vulnerabilities:[{id:"CVE-X",database_specific:{severity:"HIGH"},affected:[{ranges:[{events:[{fixed:"2"}]}]}]}]}]}]};
    const result=evaluateScannerOutput("osv",payload,{blockFixableHigh:true});
    expect(result.gate.allowed).toBe(false);
  });
});
