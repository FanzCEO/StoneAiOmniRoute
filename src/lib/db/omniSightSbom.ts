import { randomUUID } from "node:crypto";
import { getDbInstance } from "./core";

export function ingestCycloneDxSbom(input:{scanId?:string;artifactRef?:string;imageDigest?:string;sbom:unknown}){
  const doc=input.sbom as any;
  const components=Array.isArray(doc?.components)?doc.components:[];
  const db=getDbInstance(), now=new Date().toISOString();
  const insert=db.prepare(`INSERT INTO omnisight_sbom_components
    (id,scan_id,artifact_ref,image_digest,bom_ref,component_type,name,version,purl,cpe,licenses_json,hashes_json,supplier,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const tx=db.transaction(()=>{
    for(const c of components){
      if(!c?.name)continue;
      insert.run(randomUUID(),input.scanId??null,input.artifactRef??null,input.imageDigest??null,c["bom-ref"]??null,
        c.type??null,String(c.name),c.version??null,c.purl??null,c.cpe??null,
        c.licenses?JSON.stringify(c.licenses):null,c.hashes?JSON.stringify(c.hashes):null,
        c.supplier?.name??c.publisher??null,now);
    }
  }); tx();
  return {componentCount:components.filter((c:any)=>Boolean(c?.name)).length,createdAt:now};
}
export function findSbomComponents(query:string,limit=100){
  const q=`%${query}%`, n=Math.max(1,Math.min(500,Math.trunc(limit)));
  return getDbInstance().prepare(`SELECT * FROM omnisight_sbom_components
    WHERE name LIKE ? OR version LIKE ? OR purl LIKE ? OR cpe LIKE ?
    ORDER BY created_at DESC LIMIT ?`).all(q,q,q,q,n);
}
