# StoneAI Council Trials

Status: initial production contract
Doctrine: Intelligence does not create authority. Human authorization controls consequential execution.

## Purpose
Council Trials turns multi-model inference into an evidence-backed, adversarial, auditable decision pipeline.

## Pipeline
1. Intake: classify task, risk, budget, jurisdiction, required evidence and execution permissions.
2. OmniRoute: select diverse independent models by capability, cost, latency and provider independence.
3. Independent findings: models answer without seeing peers.
4. Evidence: normalize claims into evidence objects with source, timestamp, provenance and confidence.
5. Cross-examination: critic models challenge unsupported claims, contradictions and calculations.
6. Consensus and dissent: cluster claims by semantic agreement. Preserve minority findings. Never equate majority vote with truth.
7. Esther review: inspect evidence sufficiency, contradictions, policy/governance constraints and accountability.
8. Human authority gate: consequential actions require an explicit human authorization artifact.
9. Governed execution: authorized agents execute only scoped capabilities.
10. Receipt: persist inputs, model/provider versions, evidence, dissent, authorization, actions, outputs, cost and hashes.

## Core contracts
```ts
export type TrialRisk = "low" | "moderate" | "high" | "critical";
export interface Evidence { id:string; claimId:string; uri?:string; digest?:string; observedAt:string; provenance:string; confidence:number; }
export interface Finding { id:string; member:string; provider:string; model:string; claims:string[]; evidenceIds:string[]; confidence:number; }
export interface Dissent { claimId:string; members:string[]; reason:string; evidenceIds:string[]; }
export interface HumanAuthorization { actorId:string; scope:string[]; issuedAt:string; expiresAt?:string; signature:string; }
export interface TrialReceipt { trialId:string; risk:TrialRisk; findings:Finding[]; evidence:Evidence[]; dissents:Dissent[]; authorization?:HumanAuthorization; actions:string[]; totalCostUsd:number; digest:string; }
```

## Non-negotiable invariants
- Independent first-pass reasoning.
- Provider/model identity and version recorded.
- Claims and evidence are separate objects.
- Dissent is never discarded during synthesis.
- Confidence is calibrated evidence, not decoration.
- No critical execution without valid human authorization.
- Authorization is scoped, expiring/revocable where applicable, and cannot be manufactured by a model.
- Execution is deny-by-default.
- Every trial emits a tamper-evident receipt.
- Sensitive inputs follow tenant isolation and retention policy.

## StoneBench
Every release measures:
- factual/evidence accuracy and citation validity
- unsupported-claim and contradiction rate
- dissent recall
- confidence calibration
- coding/task execution success
- adversarial-member resilience
- governance bypass resistance
- authorization enforcement
- latency and cost per successful trial
- rollback/recovery success
- receipt completeness and reproducibility

A release cannot claim improvement without benchmark evidence. The "100x" objective is an aspirational product target, not a factual performance claim until StoneBench demonstrates it.

## Integration ownership
- StoneAiOmniRoute: model discovery, diversity constraints, routing, fallback, budgets and telemetry.
- Stone Council service: trial orchestration, findings, cross-examination, consensus/dissent.
- Esther: judicial/evidence review and accountability matrix.
- Command Center: human authorization UI, trial visualization, receipts and governed execution controls.
- Ledger: append-only receipt anchoring and verification.

## API shape
POST /v1/trials
GET /v1/trials/:id
POST /v1/trials/:id/evidence
POST /v1/trials/:id/cross-examine
POST /v1/trials/:id/authorize
POST /v1/trials/:id/execute
GET /v1/trials/:id/receipt

## Acceptance gates
A Council Trials implementation is production-ready only when integration tests prove independent calls, evidence provenance, preserved dissent, Esther review, human authorization enforcement, deny-by-default execution, signed/tamper-evident receipts, tenant isolation, budget stops, and StoneBench regression reporting.
