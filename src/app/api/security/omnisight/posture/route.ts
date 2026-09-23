import { NextResponse } from "next/server";
import { requireManagementAuth } from "@/lib/api/requireManagementAuth";
import { getDbInstance } from "@/lib/db/core";

export async function GET(request:Request){
  const auth=await requireManagementAuth(request); if(auth)return auth;
  const db=getDbInstance();
  const severity=db.prepare("SELECT severity, COUNT(*) AS count FROM omnisight_security_findings GROUP BY severity").all();
  const categories=db.prepare("SELECT category, COUNT(*) AS count FROM omnisight_security_findings GROUP BY category ORDER BY count DESC").all();
  const sources=db.prepare("SELECT source, COUNT(*) AS count FROM omnisight_security_scans GROUP BY source ORDER BY count DESC").all();
  const exposure=db.prepare(`SELECT
    COUNT(*) AS workloads,
    SUM(CASE WHEN internet_exposed=1 THEN 1 ELSE 0 END) AS internet_exposed,
    SUM(CASE WHEN privileged=1 THEN 1 ELSE 0 END) AS privileged
    FROM omnisight_runtime_workloads`).get();
  const risky=db.prepare(`SELECT w.id,w.workload_name,w.environment,w.image_digest,w.commit_sha,
    COUNT(f.id) AS blocking_findings
    FROM omnisight_runtime_workloads w
    JOIN omnisight_security_scans s ON
      (w.image_digest IS NOT NULL AND w.image_digest=s.image_digest) OR
      (w.commit_sha IS NOT NULL AND w.commit_sha=s.commit_sha) OR
      (w.artifact_ref IS NOT NULL AND w.artifact_ref=s.artifact_ref)
    JOIN omnisight_security_findings f ON f.scan_id=s.id AND f.disposition='blocking'
    GROUP BY w.id ORDER BY blocking_findings DESC LIMIT 25`).all();
  return NextResponse.json({severity,categories,sources,exposure,riskyWorkloads:risky});
}
