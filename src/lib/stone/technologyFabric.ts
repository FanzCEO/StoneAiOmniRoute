export type StoneTechnologyMode =
  | "runtime"
  | "mcp"
  | "forensics"
  | "skills"
  | "quality"
  | "execution";

export type StoneTechnologyMaturity =
  | "production"
  | "production-optional"
  | "sandbox-only"
  | "ci"
  | "experimental";

export type StoneTechnology = {
  id: string;
  name: string;
  upstream: string;
  mode: StoneTechnologyMode;
  maturity: StoneTechnologyMaturity;
  enabledEnv: string;
  endpointEnv?: string;
  authority: "subordinate";
  dataBoundary: string;
  purpose: string;
  defaultEnabled: boolean;
  pinnedRef: string;
  pinnedCommit: string;
  productionPolicy: string;
};

export const STONE_TECHNOLOGY_FABRIC: readonly StoneTechnology[] = [
  {
    id: "yao",
    name: "Yao / Jev",
    upstream: "https://github.com/YaoApp/yao",
    mode: "runtime",
    maturity: "production-optional",
    enabledEnv: "STONE_YAO_ENABLED",
    endpointEnv: "STONE_YAO_BASE_URL",
    authority: "subordinate",
    dataBoundary: "Typed decisions and application-runtime execution only; no Stone authority.",
    purpose: "Structured Choice/Score/Noul decisions, agent runtime, MCP and application services.",
    defaultEnabled: false,
    pinnedRef: "v1.0.0-rc23",
    pinnedCommit: "a289dd55abe357941506e2114fb8c5ec21b99149",
    productionPolicy: "license-hold",
  },
  {
    id: "codebase-memory",
    name: "Codebase Memory MCP",
    upstream: "https://github.com/DeusData/codebase-memory-mcp",
    mode: "mcp",
    maturity: "production-optional",
    enabledEnv: "STONE_CODEBASE_MEMORY_ENABLED",
    endpointEnv: "STONE_CODEBASE_MEMORY_BASE_URL",
    authority: "subordinate",
    dataBoundary: "Read/index approved repositories only; writes require normal Stone/GitHub authorization.",
    purpose: "Persistent engineering graph, cross-repository impact analysis and architectural memory.",
    defaultEnabled: false,
    pinnedRef: "v0.11.0",
    pinnedCommit: "8972ea69c6ad94b1ef1d4ffbf0a92d78d2db1798",
    productionPolicy: "approved-optional",
  },
  {
    id: "mvt",
    name: "Mobile Verification Toolkit",
    upstream: "https://github.com/mvt-project/mvt",
    mode: "forensics",
    maturity: "sandbox-only",
    enabledEnv: "STONE_MVT_ENABLED",
    authority: "subordinate",
    dataBoundary: "Consent-gated forensic acquisitions only; evidence remains case-scoped.",
    purpose: "iOS/Android forensic analysis and IOC-based defensive investigation.",
    defaultEnabled: false,
    pinnedRef: "v2026.9.21",
    pinnedCommit: "e0697a58e977dc7035efe37363ea784ed8c6bc88",
    productionPolicy: "consent-gated-sandbox",
  },
  {
    id: "financial-services",
    name: "Anthropic Financial Services",
    upstream: "https://github.com/anthropics/financial-services",
    mode: "skills",
    maturity: "production-optional",
    enabledEnv: "STONE_FINANCIAL_SKILLS_ENABLED",
    authority: "subordinate",
    dataBoundary: "Analysis/staging only; no autonomous money movement, ledger posting, onboarding approval or investment decision.",
    purpose: "Reusable financial analysis, reconciliation, close, KYC research and valuation workflows.",
    defaultEnabled: false,
    pinnedRef: "574ed3624aebd0418c7e96cd101262f30210ab26",
    pinnedCommit: "574ed3624aebd0418c7e96cd101262f30210ab26",
    productionPolicy: "approved-analysis-only",
  },
  {
    id: "impeccable",
    name: "Impeccable",
    upstream: "https://github.com/pbakaus/impeccable",
    mode: "quality",
    maturity: "ci",
    enabledEnv: "STONE_IMPECCABLE_ENABLED",
    authority: "subordinate",
    dataBoundary: "Design-quality checks and agent guidance only; no runtime authority.",
    purpose: "Deterministic UI/design quality gates plus agent design workflows.",
    defaultEnabled: false,
    pinnedRef: "skill-v4.3.1",
    pinnedCommit: "cd12f8660e2dde57b9615c8a6b8ea674101f9cfc",
    productionPolicy: "ci-approved-with-checksum",
  },
  {
    id: "agent-substrate",
    name: "Agent Substrate",
    upstream: "https://github.com/agent-substrate/substrate",
    mode: "execution",
    maturity: "experimental",
    enabledEnv: "STONE_SUBSTRATE_ENABLED",
    endpointEnv: "STONE_SUBSTRATE_BASE_URL",
    authority: "subordinate",
    dataBoundary: "Sandboxed execution backend only; Stone owns identity, authorization, budgets, policy and receipts.",
    purpose: "Suspend/resume stateful agent workloads behind the Stone execution-provider interface.",
    defaultEnabled: false,
    pinnedRef: "v0.1.0",
    pinnedCommit: "fa6d949685a6318940a9a0195c867c864009b820",
    productionPolicy: "experimental-shadow-only",
  },
] as const;

/** Resolve a conventional boolean environment flag without granting implicit truthiness. */
export function envFlag(name: string, fallback = false): boolean {
  const raw = process.env[name];
  if (raw == null || raw.trim() === "") return fallback;
  return /^(1|true|yes|on)$/i.test(raw.trim());
}

/** Return true only when the configured endpoint is a usable HTTP(S) URL. */
export function validEndpoint(value: string | undefined): boolean {
  const candidate = value?.trim();
  if (!candidate) return false;

  try {
    const url = new URL(candidate);
    return (url.protocol === "http:" || url.protocol === "https:") && Boolean(url.hostname);
  } catch {
    return false;
  }
}

/** Resolve the deploy-time enablement and configuration readiness of every Stone technology. */
export function getStoneTechnologyState() {
  return STONE_TECHNOLOGY_FABRIC.map((technology) => ({
    ...technology,
    enabled: envFlag(technology.enabledEnv, technology.defaultEnabled),
    configured: technology.endpointEnv ? validEndpoint(process.env[technology.endpointEnv]) : true,
  }));
}
