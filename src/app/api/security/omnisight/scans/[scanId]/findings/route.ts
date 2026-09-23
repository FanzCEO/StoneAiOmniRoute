import { NextResponse } from "next/server";
import { requireManagementAuth } from "@/lib/api/requireManagementAuth";
import { getOmniSightFindings } from "@/lib/db/omniSightSecurity";

export async function GET(request: Request, context: { params: Promise<{ scanId: string }> }) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;
  const { scanId } = await context.params;
  return NextResponse.json({ scanId, findings: getOmniSightFindings(scanId) });
}
