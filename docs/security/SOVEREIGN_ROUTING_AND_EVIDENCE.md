# StoneAI Sovereign Routing and Evidence Plane

StoneAI treats model intelligence as a governed dependency. Provider price, speed, and benchmark
quality never override an explicit data-handling policy.

## Deterministic route gate

Before adaptive scoring, a candidate may be evaluated against:

- data classification: public, internal, confidential, restricted
- provider allowlist
- permitted jurisdictions
- proven zero-retention requirement
- proven no-training requirement
- direct-provider requirement
- transparent routing / declared subprocessors
- self-hosted-only requirement
- cross-provider fallback permission

Confidential and restricted traffic fails closed when retention, training use, or route transparency
is unknown. A denied candidate receives score 0 before cost, latency, health, or capability ranking.

The policy code is `src/lib/routing/sovereignRouting.ts` and is integrated into
`src/lib/routing/adaptiveRouting.ts`.

## Evidence receipt contract

Every governed execution should persist enough information to reconstruct the routing decision:

- request/tenant/workspace identifiers (non-secret)
- data classification and policy version
- requested and selected model
- selected provider and route type (direct, declared subprocessor, self-hosted)
- allowed/observed jurisdiction metadata
- retention and training-use posture used by the decision
- candidates denied and deterministic reason codes
- fallback attempts and whether cross-provider fallback was permitted
- timestamps, latency, cost/accounting data, and final execution status
- approval/authority identifiers when human approval is required

Never put raw secrets, provider API keys, access tokens, or unnecessary prompt content in the receipt.

## Reusable patterns adopted from external research

### JEV-style deterministic authority boundary

AI/semantic evaluators may advise on policy quality, evidence sufficiency, agent completion, PR quality,
or UI quality. They do not replace deterministic tests, authorization, schema validation, or human
authority. Semantic verdicts are evidence inputs, not authority.

Useful Stone surfaces:
- Council: evidence sufficiency checks before a decree can advance
- Esther / OmniJudicial: semantic policy review plus deterministic enforcement
- Agent Swarm: supervisor evaluation and completion claims checked against artifacts/tests
- CI: PR review and implementation-completeness checks alongside normal test gates
- Frontend QA: semantic UX review alongside deterministic accessibility and browser tests

### Local-first operator workspace

Adopt the useful architectural idea behind local knowledge workspaces: durable Markdown-compatible
artifacts, backlinks/references, templates, searchable project context, and task/project views.
Stone remains the system of record for governed execution; local notes are a portable operator surface.

### Agency / multi-tenant operations patterns

Useful commercial patterns for Stone/FanXus agents include tenant workspaces, white-label surfaces,
multi-channel agents, BYO provider credentials, usage/billing boundaries, provider switching, and
self-hosted/sovereign deployments. These must sit behind Stone tenant isolation and authority controls.

## Provider-risk rule

Do not encode news allegations as permanent provider guilt. Regulatory reports and vendor allegations
are risk signals that may trigger review, stricter policy, or temporary operator controls. The routing
engine enforces documented posture and tenant policy rather than nationality or headlines.

## Model intake

New model families such as MiMo are admitted through the provider registry and then governed by the
same routing policy. Open/self-hostable weights are useful for sovereign deployments, but "open" alone
does not prove privacy, retention, provenance, or operational security.
