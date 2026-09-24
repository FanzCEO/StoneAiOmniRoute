import { NextResponse } from "next/server";
import { requireManagementAuth } from "@/lib/api/requireManagementAuth";
import { getComponentBlastRadius } from "@/lib/db/omniSightSbom";

export async function GET(request:Request){
  const auth=await requireManagementAuth(request); if(auth)return auth;
  const url=new URL(request.url), q=(url.searchParams.get("q")??"").trim();
  if(!q)return NextResponse.json({error:"q is required"},{status:400});
  const limit=Number(url.searchParams.get("limit")??100);
  return NextResponse.json({query:q,results:getComponentBlastRadius(q,Number.isFinite(limit)?limit:100)});
}
