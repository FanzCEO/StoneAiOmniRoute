import { describe, expect, it } from "vitest";
import { evaluateSecurityGate, type StoneSecurityFinding } from "@/lib/security/omniSightCode";

const secret: StoneSecurityFinding = {
  id:"gitleaks:key:src/a.ts:1", fingerprint:"fp-secret", source:"gitleaks",
  category:"secret", severity:"critical", title:"Secret detected"
};

describe("OmniSight governed exceptions",()=>{
  it("keeps blocking findings blocking without an active exception",()=>{
    const gate=evaluateSecurityGate([secret]);
    expect(gate.allowed).toBe(false);
    expect(gate.blocking).toHaveLength(1);
  });
  it("changes disposition but retains evidence when an exception fingerprint is applied",()=>{
    const gate=evaluateSecurityGate([secret],{allowFindingIds:["fp-secret"]});
    expect(gate.allowed).toBe(true);
    expect(gate.blocking).toHaveLength(0);
    expect(gate.advisory).toEqual([secret]);
    expect(gate.summary.critical).toBe(1);
  });
});
