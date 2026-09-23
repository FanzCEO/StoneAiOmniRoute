"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/shared/components";

type Scan = {
  id: string; source: string; artifactRef?: string; commitSha?: string; imageDigest?: string;
  allowed: boolean; blockingCount: number; advisoryCount: number;
  summary: Record<string, number>; createdAt: string;
};
type Finding = Record<string, unknown>;

export default function OmniSightSecurityPage() {
  const [scans,setScans]=useState<Scan[]>([]);
  const [selected,setSelected]=useState<Scan|null>(null);
  const [findings,setFindings]=useState<Finding[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string|null>(null);

  const refresh=useCallback(async()=>{
    setLoading(true); setError(null);
    try{
      const res=await fetch("/api/security/omnisight/scans?limit=100");
      const body=await res.json();
      if(!res.ok) throw new Error(body?.error||"Unable to load OmniSight scans");
      setScans(Array.isArray(body.scans)?body.scans:[]);
    }catch(e){setError(e instanceof Error?e.message:"Unable to load OmniSight scans");}
    finally{setLoading(false);}
  },[]);

  useEffect(()=>{void refresh();},[refresh]);
  useEffect(()=>{if(!selected){setFindings([]);return;} void (async()=>{
    const res=await fetch(`/api/security/omnisight/scans/${selected.id}/findings`);
    const body=await res.json().catch(()=>({}));
    setFindings(res.ok&&Array.isArray(body.findings)?body.findings:[]);
  })();},[selected]);

  const totals=useMemo(()=>scans.reduce((a,s)=>{
    a.blocking+=s.blockingCount||0; a.advisory+=s.advisoryCount||0;
    if(!s.allowed)a.blockedScans++; return a;
  },{blocking:0,advisory:0,blockedScans:0}),[scans]);

  return <div className="space-y-5">
    <div className="flex items-start justify-between gap-4">
      <div><h1 className="text-2xl font-semibold text-text-main">OmniSight Security</h1>
        <p className="mt-1 text-sm text-text-muted">Stone-owned code-to-cloud findings, release gates, and evidence.</p></div>
      <button onClick={()=>void refresh()} className="rounded-lg border border-border px-3 py-2 text-sm">Refresh</button>
    </div>
    <div className="grid gap-3 md:grid-cols-4">
      {[
        ["Scans",scans.length],["Blocked scans",totals.blockedScans],["Blocking findings",totals.blocking],["Advisories",totals.advisory]
      ].map(([label,value])=><Card key={String(label)} className="p-4"><p className="text-xs uppercase tracking-wider text-text-muted">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></Card>)}
    </div>
    {error&&<div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600">{error}</div>}
    <Card className="overflow-hidden">
      {loading?<div className="p-8 text-center text-sm text-text-muted">Loading OmniSight evidence…</div>:
      scans.length===0?<div className="p-8 text-center text-sm text-text-muted">No persisted scans yet. CI evidence will appear here after ingestion into the management API.</div>:
      <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm">
        <thead className="border-b border-border bg-sidebar/40 text-xs uppercase text-text-muted"><tr>
          <th className="px-4 py-3">Time</th><th className="px-4 py-3">Sensor</th><th className="px-4 py-3">Decision</th>
          <th className="px-4 py-3">Critical</th><th className="px-4 py-3">High</th><th className="px-4 py-3">Commit / Artifact</th><th className="px-4 py-3"></th>
        </tr></thead><tbody className="divide-y divide-border">{scans.map(s=><tr key={s.id} className="hover:bg-sidebar/30">
          <td className="px-4 py-3 text-xs text-text-muted">{new Date(s.createdAt).toLocaleString()}</td>
          <td className="px-4 py-3 font-medium">{s.source}</td>
          <td className="px-4 py-3"><span className={`rounded-full border px-2 py-1 text-xs ${s.allowed?"border-green-500/30 bg-green-500/10 text-green-600":"border-red-500/30 bg-red-500/10 text-red-600"}`}>{s.allowed?"Allowed":"Blocked"}</span></td>
          <td className="px-4 py-3">{s.summary?.critical??0}</td><td className="px-4 py-3">{s.summary?.high??0}</td>
          <td className="max-w-[260px] truncate px-4 py-3 font-mono text-xs text-text-muted">{s.commitSha||s.imageDigest||s.artifactRef||"—"}</td>
          <td className="px-4 py-3 text-right"><button onClick={()=>setSelected(s)} className="rounded-lg border border-border px-3 py-1.5 text-xs">Evidence</button></td>
        </tr>)}</tbody></table></div>}
    </Card>
    {selected&&<Card className="p-4"><div className="mb-3 flex items-center justify-between"><div>
      <h2 className="font-semibold">Evidence: {selected.source}</h2><p className="text-xs font-mono text-text-muted">{selected.id}</p></div>
      <button onClick={()=>setSelected(null)} className="rounded-lg border border-border px-3 py-1.5 text-xs">Close</button></div>
      <pre className="max-h-[520px] overflow-auto rounded-lg bg-sidebar/40 p-4 text-xs">{JSON.stringify(findings,null,2)}</pre></Card>}
  </div>;
}
