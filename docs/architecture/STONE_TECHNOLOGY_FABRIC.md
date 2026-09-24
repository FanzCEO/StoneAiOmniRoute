# Stone Production Technology Fabric

This document defines how externally maintained technologies enter the Stone execution stack without becoming authorities.

## Authority invariant

**INTELLIGENCE DOES NOT CREATE AUTHORITY.**

Every component in this registry is subordinate to Stone identity, authorization, policy, budgets, evidence and receipts. No third-party runtime, MCP server, skill pack, forensic tool, design agent or execution substrate may mint Stone authority.

## Integrated capabilities

| Capability | Upstream | Production role | Activation |
| --- | --- | --- | --- |
| Yao / Jev | YaoApp/yao | Optional typed-decision/application runtime | `STONE_YAO_ENABLED=1` + `STONE_YAO_BASE_URL` |
| Codebase Memory MCP | DeusData/codebase-memory-mcp | Approved-repository engineering graph | `STONE_CODEBASE_MEMORY_ENABLED=1` + `STONE_CODEBASE_MEMORY_BASE_URL` |
| MVT | mvt-project/mvt | Consent-gated mobile forensic worker | `STONE_MVT_ENABLED=1` |
| Financial Services | anthropics/financial-services | Provider-neutral financial skill source | `STONE_FINANCIAL_SKILLS_ENABLED=1` |
| Impeccable | pbakaus/impeccable | UI/design CI and agent quality gate | `STONE_IMPECCABLE_ENABLED=1` |
| Agent Substrate | agent-substrate/substrate | Experimental execution-provider backend | `STONE_SUBSTRATE_ENABLED=1` + `STONE_SUBSTRATE_BASE_URL` |

All capabilities default off. Enabling a capability is a deployment decision, not an authority grant.

## Production rules

1. Pin upstream versions/digests. Never deploy floating `latest`.
2. Verify upstream license, provenance, checksums/signatures where available, and produce an SBOM.
3. Run networked components with least-privilege egress and scoped credentials.
4. Do not mount the Docker socket or unrestricted host filesystems.
5. Normalize third-party outputs into Stone-owned schemas before downstream consumption.
6. Keep a per-capability kill switch. A failed optional capability must not take down core routing.
7. Emit Stone evidence/receipts for state-changing operations.
8. MVT requires explicit device/case authorization and must never be used for non-consensual collection.
9. Financial skills may analyze and stage work but cannot independently move money or approve financial state changes.
10. Agent Substrate remains experimental until its upstream API/stability posture is suitable for the production execution-provider contract.

## Runtime visibility

`GET /api/health/technology-fabric` exposes deployment configuration state without returning secrets. A configured enabled component with a required endpoint missing returns HTTP 503 and identifies the integration by ID.

This endpoint is configuration readiness, not a remote dependency probe. Remote probes belong in authenticated monitoring because upstream topology should not be exposed through public liveness.

## Deployment progression

**Stage A — landed:** typed registry, kill switches, configuration-readiness API, authority/data boundaries.

**Stage B — deploy:** pin upstream artifacts; provision isolated services/workers; configure secrets and egress; activate Yao, Codebase Memory and design/financial skill ingestion where approved.

**Stage C — prove:** smoke tests, failure/rollback tests, receipt verification, SBOM/provenance evidence and production monitoring.

**Stage D — graduate:** only capabilities with stable operational evidence move from optional/experimental classifications into mandatory production dependencies.
