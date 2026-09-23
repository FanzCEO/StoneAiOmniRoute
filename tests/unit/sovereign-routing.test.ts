import { describe, expect, it } from "vitest";
import {
  canFallbackAcrossProviders,
  evaluateSovereignRoute,
} from "@/lib/routing/sovereignRouting";
import { scoreCandidate } from "@/lib/routing/adaptiveRouting";

describe("sovereign routing", () => {
  it("fails closed for restricted data when retention and route transparency are unknown", () => {
    const decision = evaluateSovereignRoute(
      { providerId: "opaque-provider" },
      { dataClass: "restricted" }
    );
    expect(decision.allowed).toBe(false);
    expect(decision.reasons).toContain("sensitive-data-opaque-route");
    expect(decision.reasons).toContain("sensitive-data-retention-unknown");
    expect(decision.reasons).toContain("sensitive-data-training-use-unknown");
  });

  it("allows an approved sovereign route with proven controls", () => {
    const decision = evaluateSovereignRoute(
      {
        providerId: "self-hosted-mimo",
        jurisdictions: ["us"],
        retention: "zero",
        trainingUse: "prohibited",
        routeTransparency: "direct",
        selfHosted: true,
        directProvider: true,
      },
      {
        dataClass: "restricted",
        allowedProviders: ["self-hosted-mimo"],
        allowedJurisdictions: ["us"],
        requireZeroRetention: true,
        requireNoTraining: true,
        requireDirectRoute: true,
        requireTransparentRoute: true,
        requireSelfHosted: true,
        allowCrossProviderFallback: false,
      }
    );
    expect(decision.allowed).toBe(true);
    expect(canFallbackAcrossProviders({ allowCrossProviderFallback: false })).toBe(false);
  });

  it("removes a sovereignty-denied provider before cost or capability can win", () => {
    const result = scoreCandidate({
      providerId: "cheap-but-opaque",
      modelId: "model",
      capabilityScore: 1,
      allocation: "allow",
      healthScore: 1,
      circuit: "closed",
      quota: "healthy",
      costPreference: 1,
      sovereignRequirements: {
        dataClass: "confidential",
        requireTransparentRoute: true,
      },
      sovereignPosture: {
        providerId: "cheap-but-opaque",
        retention: "zero",
        trainingUse: "prohibited",
        routeTransparency: "opaque",
      },
    });
    expect(result.eligible).toBe(false);
    expect(result.score).toBe(0);
    expect(result.reasons).toContain("route-transparency-not-proven");
  });
});
