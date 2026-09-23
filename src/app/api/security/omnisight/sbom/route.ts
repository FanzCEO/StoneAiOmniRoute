import { NextResponse } from "next/server";
import { requireManagementAuth } from "@/lib/api/requireManagementAuth";
import { findSbomComponents, ingestCycloneDxSbom } from "@/lib/db/omniSightSbom";

export async function GET(request:Request){
  const auth=await requireManagementAuth(request); if(auth)return auth;
  const url=new URL(request.url), q=url.searchParams.get("q")??"";
  if(!q.trim())return NextResponse.json({components:[]});
  return NextResponse.json({components:findSbomComponents(q,Number(url.searchParams.get("limit")??100))});
}
export async function POST(request:Request){
  const auth=await requireManagementAuth(request); if(auth)return auth;
  const body=await request.json().catch(()=>null);
  if(!body?.sbom||typeof body.sbom!=="object")return NextResponse.json({error:"CycloneDX sbom is required"},{status:400});
  const result=ingestCycloneDxSbom({scanId:body.scanId,artifactRef:body.artifactRef,imageDigest:body.imageDigest,sbom:body.sbom});
  return NextResponse.json(result,{status:201});
}
