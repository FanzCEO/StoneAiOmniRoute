import { randomUUID } from "node:crypto";
import { getDbInstance } from "./core";

export interface OmniSightRuntimeWorkload {
  id?: string; workloadType: string; workloadName: string; environment?: string;
  imageRef?: string; imageDigest?: string; artifactRef?: string; commitSha?: string;
  repository?: string; deploymentRef?: string; internetExposed?: boolean; privileged?: boolean;
  identityRef?: string; metadata?: Record<string, unknown>;
}
export function upsertRuntimeWorkload(input: OmniSightRuntimeWorkload) {
  const db=getDbInstance(), now=new Date().toISOString();
  const id=input.id||randomUUID();
  db.prepare(`INSERT INTO omnisight_runtime_workloads (
    id,workload_type,workload_name,environment,image_ref,image_digest,artifact_ref,commit_sha,repository,
    deployment_ref,internet_exposed,privileged,identity_ref,metadata_json,first_seen_at,last_seen_at
  ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  ON CONFLICT(id) DO UPDATE SET
    workload_type=excluded.workload_type,workload_name=excluded.workload_name,environment=excluded.environment,
    image_ref=excluded.image_ref,image_digest=excluded.image_digest,artifact_ref=excluded.artifact_ref,
    commit_sha=excluded.commit_sha,repository=excluded.repository,deployment_ref=excluded.deployment_ref,
    internet_exposed=excluded.internet_exposed,privileged=excluded.privileged,identity_ref=excluded.identity_ref,
    metadata_json=excluded.metadata_json,last_seen_at=excluded.last_seen_at`).run(
    id,input.workloadType,input.workloadName,input.environment??null,input.imageRef??null,input.imageDigest??null,
    input.artifactRef??null,input.commitSha??null,input.repository??null,input.deploymentRef??null,
    input.internetExposed?1:0,input.privileged?1:0,input.identityRef??null,
    input.metadata?JSON.stringify(input.metadata):null,now,now);
  return {id,...input,lastSeenAt:now};
}
export function listRuntimeWorkloads(limit=100) {
  const n=Math.max(1,Math.min(500,Math.trunc(limit)));
  return getDbInstance().prepare("SELECT * FROM omnisight_runtime_workloads ORDER BY last_seen_at DESC LIMIT ?").all(n);
}
export function correlateWorkloadEvidence(workloadId:string) {
  const db=getDbInstance();
  const workload=db.prepare("SELECT * FROM omnisight_runtime_workloads WHERE id=?").get(workloadId) as any;
  if(!workload) return null;
  const scans=db.prepare(`SELECT * FROM omnisight_security_scans
    WHERE (image_digest IS NOT NULL AND image_digest = ?)
       OR (commit_sha IS NOT NULL AND commit_sha = ?)
       OR (artifact_ref IS NOT NULL AND artifact_ref = ?)
    ORDER BY created_at DESC`).all(workload.image_digest,workload.commit_sha,workload.artifact_ref);
  return {workload,scans};
}
