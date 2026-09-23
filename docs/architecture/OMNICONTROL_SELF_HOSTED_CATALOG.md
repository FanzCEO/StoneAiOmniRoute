# OmniControl Self-Hosted Service Catalog

StoneAI should reduce avoidable SaaS dependency without turning the control plane into a pile of
unmaintainable forks. OmniControl treats self-hosted applications as governed workloads.

## Runtime strategy

Supported deployment targets should converge on:

1. Docker Compose for small/single-node installations.
2. Podman where daemonless/rootless operation is preferred.
3. Kubernetes for clustered production workloads.
4. Docker Model Runner, Ollama, llama.cpp, vLLM, MLX, LM Studio and compatible local runtimes for AI.
5. External SaaS only where it provides a material capability or operational advantage.

Portainer may remain an optional operator integration, but it is not an architectural dependency.
The Stone control plane must own its deployment contract and service inventory so third-party UI or
licensing changes cannot strand operations.

## Catalog manifest

Every installable service should eventually expose a normalized manifest:

- id, name, version and upstream source
- license and source-availability status
- container images pinned by digest where practical
- required CPU/RAM/GPU/storage
- ports and network exposure
- volumes and backup policy
- secrets and required credentials
- health/readiness probes
- update channel
- tenant scope
- data classification
- outbound network requirements
- sovereignty posture
- SBOM/provenance references
- vulnerability/security state
- owner and rollback instructions

## Candidate categories

These are categories for controlled evaluation, not automatic installation.

### AI and knowledge
- Ollama
- llama.cpp
- vLLM
- MLX
- Docker Model Runner
- Open WebUI
- LibreChat
- AnythingLLM
- LobeHub
- Jan
- Hugging Face Chat UI

The existing OmniRoute local provider catalog already contains Ollama, llama.cpp, vLLM, MLX,
LM Studio, Llamafile, Triton, Docker Model Runner, XInference and oobabooga. Prefer routing through
that abstraction instead of coupling Stone to a specific chat UI.

### Operations
Evaluate open-source container/service management projects such as Komodo and Arcane as optional
operator surfaces. Stone's own inventory, policy, evidence and deployment APIs remain canonical.

### Productivity replacement
Prefer containerized/open-source services when they can replace recurring SaaS spend without reducing
security, reliability, compliance, backup quality, accessibility or operator experience.

## OmniSight security inventory

Every governed workload should feed an inventory containing:

- running image and immutable digest
- SBOM/provenance where available
- listening/exposed ports
- public/private network classification
- mounted volumes and sensitive paths
- runtime identity and privilege level
- secrets references, never secret values
- outbound destinations
- health status
- vulnerability findings and remediation state
- authentication mode and administrative surface
- last update / patch age

High-risk defaults such as privileged containers, host networking, Docker socket mounts, unpinned
images, unexpected public ports and plaintext secrets should be surfaced as policy findings.

## Supply-chain policy

A catalog entry is not trusted because it is popular or open source. Admission should verify license,
maintenance state, release provenance, dependency/SBOM information where available, security posture
and operational fit. Pin production artifacts and make upgrades explicit and reversible.

## Cost policy

Track avoided SaaS cost separately from infrastructure cost. Self-hosting is useful only when compute,
storage, backups, observability, patching and operator time do not erase the benefit.
