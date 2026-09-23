import { NextResponse } from "next/server";
import { requireManagementAuth } from "@/lib/api/requireManagementAuth";
import { correlateWorkloadEvidence } from "@/lib/db/omniSightRuntime";

export async function GET(request:Request, context:{params:Promise<{workloadId:string}>}){
  const auth=await requireManagementAuth(request); if(auth)return auth;
  const {workloadId}=await context.params;
  const result=correlateWorkloadEvidence(workloadId);
  if(!result)return NextResponse.json({error:"Workload not found"},{status:404});
  return NextResponse.json(result);
}
