/**
 * Sovereign routing policy.
 *
 * Deterministic pre-routing gate for data residency, retention, training-use,
 * route transparency, and cross-provider fallback constraints. This is intentionally
 * local/System-1 logic: no model call is allowed to decide whether sensitive data
 * may leave an approved boundary.
 */

export type DataClass = "public" | "internal" | "confidential" | "restricted";
export type RetentionMode = "unknown" | "retained" | "zero";
export type TrainingUse = "unknown" | "allowed" | "prohibited";
export type RouteTransparency = "direct" | "declared_subprocessors" | "opaque";

export interface SovereignProviderPosture {
  providerId: string;
  jurisdictions?: string[];
  retention?: RetentionMode;
  trainingUse?: TrainingUse;
  routeTransparency?: RouteTransparency;
  selfHosted?: boolean;
  directProvider?: boolean;
}

export interface SovereignRouteRequirements {
  dataClass?: DataClass;
  allowedProviders?: string[];
  allowedJurisdictions?: string[];
  requireZeroRetention?: boolean;
  requireNoTraining?: boolean;
  requireDirectRoute?: boolean;
  requireTransparentRoute?: boolean;
  requireSelfHosted?: boolean;
  allowCrossProviderFallback?: boolean;
}

export interface SovereignRouteDecision {
  allowed: boolean;
  reasons: string[];
  evidence: Record<string, unknown>;
}

const SENSITIVE = new Set<DataClass>(["confidential", "restricted"]);

function normalize(values?: string[]): string[] {
  return (values ?? []).map((value) => value.trim().toLowerCase()).filter(Boolean);
}

export function evaluateSovereignRoute(
  posture: SovereignProviderPosture,
  requirements: SovereignRouteRequirements = {}
): SovereignRouteDecision {
  const reasons: string[] = [];
  const dataClass = requirements.dataClass ?? "public";
  const allowedProviders = new Set(normalize(requirements.allowedProviders));
  const allowedJurisdictions = new Set(normalize(requirements.allowedJurisdictions));
  const providerJurisdictions = normalize(posture.jurisdictions);

  if (allowedProviders.size > 0 && !allowedProviders.has(posture.providerId.toLowerCase())) {
    reasons.push("provider-not-approved");
  }

  if (
    allowedJurisdictions.size > 0 &&
    (providerJurisdictions.length === 0 ||
      !providerJurisdictions.some((jurisdiction) => allowedJurisdictions.has(jurisdiction)))
  ) {
    reasons.push("jurisdiction-not-approved");
  }

  if (requirements.requireZeroRetention && posture.retention !== "zero") {
    reasons.push("zero-retention-not-proven");
  }

  if (requirements.requireNoTraining && posture.trainingUse !== "prohibited") {
    reasons.push("no-training-not-proven");
  }

  if (requirements.requireDirectRoute && posture.directProvider !== true) {
    reasons.push("direct-route-required");
  }

  if (
    requirements.requireTransparentRoute &&
    posture.routeTransparency !== "direct" &&
    posture.routeTransparency !== "declared_subprocessors"
  ) {
    reasons.push("route-transparency-not-proven");
  }

  if (requirements.requireSelfHosted && posture.selfHosted !== true) {
    reasons.push("self-hosted-route-required");
  }

  // Sensitive classes fail closed on unknown routing/retention posture.
  if (SENSITIVE.has(dataClass)) {
    if (!posture.routeTransparency || posture.routeTransparency === "opaque") {
      reasons.push("sensitive-data-opaque-route");
    }
    if (!posture.retention || posture.retention === "unknown") {
      reasons.push("sensitive-data-retention-unknown");
    }
    if (!posture.trainingUse || posture.trainingUse === "unknown") {
      reasons.push("sensitive-data-training-use-unknown");
    }
  }

  return {
    allowed: reasons.length === 0,
    reasons,
    evidence: {
      policy: "sovereign-routing-v1",
      providerId: posture.providerId,
      dataClass,
      jurisdictions: posture.jurisdictions ?? [],
      retention: posture.retention ?? "unknown",
      trainingUse: posture.trainingUse ?? "unknown",
      routeTransparency: posture.routeTransparency ?? "opaque",
      selfHosted: posture.selfHosted === true,
      directProvider: posture.directProvider === true,
      allowCrossProviderFallback: requirements.allowCrossProviderFallback !== false,
    },
  };
}

export function canFallbackAcrossProviders(
  requirements: SovereignRouteRequirements = {}
): boolean {
  return requirements.allowCrossProviderFallback !== false;
}


/**
 * Trusted defaults for runtimes that execute entirely inside the tenant-controlled
 * boundary. Remote/cloud providers intentionally receive no implicit trust here:
 * their posture must be supplied from verified provider metadata.
 */
export const LOCAL_SOVEREIGN_PROVIDER_IDS = new Set([
  "mlx-gemma",
  "mlx-qwen",
  "ollama-local",
  "lm-studio",
  "vllm",
  "lemonade",
  "llamafile",
  "llama-cpp",
  "triton",
  "docker-model-runner",
  "xinference",
  "oobabooga",
]);

export function inferLocalSovereignPosture(
  providerId: string
): SovereignProviderPosture | null {
  if (!LOCAL_SOVEREIGN_PROVIDER_IDS.has(providerId)) return null;
  return {
    providerId,
    jurisdictions: ["tenant-controlled"],
    retention: "zero",
    trainingUse: "prohibited",
    routeTransparency: "direct",
    selfHosted: true,
    directProvider: true,
  };
}
