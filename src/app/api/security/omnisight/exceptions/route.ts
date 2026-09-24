import { NextResponse } from "next/server";
import { requireManagementAuth } from "@/lib/api/requireManagementAuth";
import { createSecurityException, listActiveSecurityExceptions } from "@/lib/db/omniSightExceptions";

export async function GET(request:Request){
  const auth=await requireManagementAuth(request); if(auth)return auth;
  return NextResponse.json({exceptions:listActiveSecurityExceptions()});
}
export async function POST(request:Request){
  const auth=await requireManagementAuth(request); if(auth)return auth;
  const body=await request.json().catch(()=>null);
  if(!body||typeof body.reason!=="string"||typeof body.approvedBy!=="string"||typeof body.expiresAt!=="string")
    return NextResponse.json({error:"reason, approvedBy, and expiresAt are required"},{status:400});
  try{return NextResponse.json({exception:createSecurityException(body)},{status:201});}
  catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Invalid exception"},{status:400});}
}
