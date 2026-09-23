#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

function arg(name, fallback) {
  const i=process.argv.indexOf(name);
  return i >= 0 && process.argv[i+1] ? process.argv[i+1] : fallback;
}
const format=arg("--format","sarif"), input=arg("--input"), source=arg("--source",format);
const commitSha=arg("--commit",process.env.GITHUB_SHA||""), output=arg("--output",".artifacts/omnisight-security.json");
if(!input || !fs.existsSync(input)){ console.error("[omnisight] input missing:",input||"(none)"); process.exit(2); }

const payload=JSON.parse(fs.readFileSync(input,"utf8"));
const severities={info:0,low:0,medium:0,high:0,critical:0};
const findings=[];

function sev(v){
  const s=String(v??"").toLowerCase();
  if(s.includes("critical")) return "critical";
  if(s.includes("high")||s==="error") return "high";
  if(s.includes("medium")||s.includes("moderate")||s==="warning") return "medium";
  if(s.includes("low")||s==="note") return "low";
  return "info";
}
if(format==="sarif"){
  for(const run of Array.isArray(payload?.runs)?payload.runs:[]) for(const result of Array.isArray(run?.results)?run.results:[]){
    const severity=sev(result?.properties?.severity??result?.level);
    const ruleId=result?.ruleId??result?.rule?.id??"unknown";
    const loc=result?.locations?.[0]?.physicalLocation;
    findings.push({id:[source,ruleId,loc?.artifactLocation?.uri??"unknown",loc?.region?.startLine??0].join(":").toLowerCase(),
      source,category:String(source).toLowerCase().includes("trivy")?"container":"sast",severity,
      title:result?.message?.text??String(ruleId),location:{path:loc?.artifactLocation?.uri,line:loc?.region?.startLine},
      fingerprint:result?.partialFingerprints?.primaryLocationLineHash,evidence:{ruleId}});
  }
} else if(format==="gitleaks" && Array.isArray(payload)){
  for(const e of payload) findings.push({id:["gitleaks",e.RuleID??"unknown",e.File??"unknown",e.StartLine??0].join(":").toLowerCase(),
    source:"gitleaks",category:"secret",severity:"critical",title:e.Description??e.RuleID??"Secret detected",
    location:{path:e.File,line:e.StartLine},fingerprint:e.Fingerprint,evidence:{ruleId:e.RuleID}});
} else { console.error("[omnisight] unsupported format:",format); process.exit(2); }

for(const f of findings) severities[f.severity]++;
const blocking=findings.filter(f=>f.category==="secret"||f.severity==="critical");
const report={schema:"stone.omnisight.security/v1",source,commitSha,allowed:blocking.length===0,
  summary:severities,blockingCount:blocking.length,advisoryCount:findings.length-blocking.length,findings};
fs.mkdirSync(path.dirname(output),{recursive:true});
fs.writeFileSync(output,JSON.stringify(report,null,2)+"\n");
console.log("[omnisight]",JSON.stringify({source,commitSha,allowed:report.allowed,summary:severities,blockingCount:blocking.length}));
if(!report.allowed) process.exit(1);
