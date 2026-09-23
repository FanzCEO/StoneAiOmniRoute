# OmniSight Code-to-Cloud Security

OmniSight owns StoneAI's native code-to-cloud security model. Commercial products such as Wiz Code
may be connected as optional sensors, but no external vendor is the authority for release decisions.

## Native pipeline

1. Discover code, dependency, secret, IaC, container, SBOM, supply-chain and runtime findings.
2. Normalize scanner output into `StoneSecurityFinding`.
3. Deduplicate by stable ID/fingerprint.
4. Apply deterministic Stone security policy.
5. Block or admit the release.
6. Persist the decision and supporting findings into the Evidence Plane.
7. Correlate admitted artifacts with runtime inventory in OmniSight.

Current reusable sensors already present in OmniRoute include Semgrep, Gitleaks, OSV Scanner, Trivy,
CycloneDX/Syft SBOM generation and OpenSSF Scorecard. SARIF is a preferred interchange format when a
sensor supports it.

## Default gate

- secrets: blocking
- critical findings: blocking
- fixable high findings: configurable blocking
- supply-chain findings: configurable blocking
- explicit exceptions: fingerprint/ID based and remain visible as evidence

An exception changes disposition, not history. Findings must not be erased merely to make a gate green.

## Code-to-cloud correlation

Future API/UI work should correlate:

repository -> commit -> build -> SBOM -> image digest -> deployment -> workload -> route -> evidence

This permits an operator to start from a vulnerable package and identify every running workload, or
start from a workload and reconstruct exactly which source and dependency graph produced it.

## Scanner adapters

Native adapters should remain small and replaceable. Planned/allowed inputs include:

- Semgrep/SARIF for SAST
- Gitleaks for secrets
- OSV for dependency vulnerabilities
- Trivy/SARIF for images, filesystem and IaC
- Syft/CycloneDX for SBOM
- OpenSSF Scorecard for repository/supply-chain posture
- optional Wiz Code or other enterprise scanners through the same normalized finding contract

## Authority

Scanner output is evidence. OmniSight normalizes it. OmniTrust evaluates policy. Human authorization
remains authoritative where Stone governance requires it. Intelligence does not create authority.
