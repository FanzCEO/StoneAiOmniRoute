import { randomUUID } from "node:crypto";
import { getDbInstance } from "./core";

export interface SecurityExceptionInput {
  findingId?:string; fingerprint?:string; reason:string; scope?:string; approvedBy:string; expiresAt:string;
}
export function createSecurityException(input:SecurityExceptionInput){
  if(!input.findingId&&!input.fingerprint)throw new Error("findingId or fingerprint is required");
  const expiry=new Date(input.expiresAt);
  if(!Number.isFinite(expiry.getTime())||expiry.getTime()<=Date.now())throw new Error("expiresAt must be in the future");
  const id=randomUUID(), createdAt=new Date().toISOString();
  getDbInstance().prepare(`INSERT INTO omnisight_security_exceptions
    (id,finding_id,fingerprint,reason,scope,approved_by,expires_at,created_at)
    VALUES (?,?,?,?,?,?,?,?)`).run(id,input.findingId??null,input.fingerprint??null,input.reason,
      input.scope??"finding",input.approvedBy,expiry.toISOString(),createdAt);
  return {id,...input,scope:input.scope??"finding",expiresAt:expiry.toISOString(),createdAt};
}
export function listActiveSecurityExceptions(){
  return getDbInstance().prepare(`SELECT * FROM omnisight_security_exceptions
    WHERE revoked_at IS NULL AND expires_at > ? ORDER BY expires_at ASC`).all(new Date().toISOString());
}
export function revokeSecurityException(id:string){
  const revokedAt=new Date().toISOString();
  const result=getDbInstance().prepare(`UPDATE omnisight_security_exceptions SET revoked_at=?
    WHERE id=? AND revoked_at IS NULL`).run(revokedAt,id);
  return {revoked:result.changes>0,revokedAt};
}
