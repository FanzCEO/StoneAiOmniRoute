import { NextResponse } from "next/server";
import { requireManagementAuth } from "@/lib/api/requireManagementAuth";
import { listRuntimeWorkloads, upsertRuntimeWorkload } from "@/lib/db/omniSightRuntime";

export async function GET(request:Request){
  const auth=await requireManagementAuth(request); if(auth)return auth;
  const limit=Number(new URL(request.url).searchParams.get("limit")??100);
  return NextResponse.json({workloads:listRuntimeWorkloads(Number.isFinite(limit)?limit:100)});
}
export async function POST(request:Request){
  const auth=await requireManagementAuth(request); if(auth)return auth;
  const body=await request.json().catch(()=>null);
  if(!body||typeof body.workloadType!=="string"||typeof body.workloadName!=="string")
    return NextResponse.json({error:"workloadType and workloadName are required"},{status:400});
  return NextResponse.json({workload:upsertRuntimeWorkload(body)},{status:201});
}
