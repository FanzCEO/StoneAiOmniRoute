import { NextResponse } from "next/server";
import { getStoneTechnologyState } from "@/lib/stone/technologyFabric";

export const dynamic = "force-dynamic";

export async function GET() {
  const technologies = getStoneTechnologyState();
  const enabled = technologies.filter((item) => item.enabled);
  const misconfigured = enabled.filter((item) => !item.configured);

  return NextResponse.json(
    {
      status: misconfigured.length === 0 ? "ok" : "degraded",
      authority: "stone",
      technologies,
      summary: {
        total: technologies.length,
        enabled: enabled.length,
        misconfigured: misconfigured.map((item) => item.id),
      },
      timestamp: new Date().toISOString(),
    },
    {
      status: misconfigured.length === 0 ? 200 : 503,
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    }
  );
}
