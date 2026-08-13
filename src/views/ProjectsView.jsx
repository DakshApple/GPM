import React, { useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { Topbar } from '../components/layout';
import { colorFor } from '../utils/constants';
import { daysBetween, today } from '../utils/date';

export function ProjectsView({ projects, employees, users, tasks, onOpenProject, onNewProject }) {
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const list = projects.filter(p => {
    if (filter==="active"&&p.status==="delivered") return false;
    if (filter==="delivered"&&p.status!=="delivered") return false;
    if (q && !p.name.toLowerCase().includes(q.toLowerCase()) && !p.client.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });
  return (
    <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column" }}>
      <Topbar title="projects" subtitle={`${projects.filter(p=>p.status!=="delivered").length} active · ${projects.filter(p=>p.status==="delivered").length} delivered`}
        actions={<>
          <div style={{ position:"relative" }}>
            <Search style={{ width:14, height:14, position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:"var(--text-3)" }} />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="search..." style={{ paddingLeft:32, height:34 }} />
          </div>
          <button className="btn btn-primary" onClick={onNewProject}><Plus style={{ width:14, height:14 }} /> new project</button>
        </>}
      />
      <div style={{ padding:24 }}>
        <div style={{ display:"flex", gap:4, marginBottom:16 }}>
          {[["all","all"],["active","active"],["delivered","delivered"]].map(([k,label]) => (
            <button key={k} onClick={() => setFilter(k)} className="btn" style={{ background: filter===k?"var(--surface-2)":"transparent", color: filter===k?"var(--text)":"var(--text-2)", borderColor: filter===k?"var(--border-strong)":"var(--border)" }}>{label}</button>
          ))}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:12 }}>
          {list.map(p => {
            const c = colorFor(p.color);
            const owner = users.find(u => u.id === p.ownerId);
            const members = employees.filter(e => p.memberIds.includes(e.id));
            const projTasks = tasks.filter(t => t.projectId === p.id);
            const doneTasks = projTasks.filter(t => t.status === "done").length;
            const days = daysBetween(today(), p.deadline);
            return (
              <button key={p.id} onClick={() => onOpenProject(p.id)} style={{ textAlign:"left", padding:16, borderRadius:8, background:"var(--surface)", border:"1px solid var(--border)", cursor:"pointer", color:"var(--text)", transition:"transform .15s" }}>
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:8 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, flex:1, minWidth:0 }}>
                    <div style={{ width:8, height:8, borderRadius:2, background:c.ring, flexShrink:0 }} />
                    <div className="font-display" style={{ fontWeight:600, fontSize:14, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</div>
                  </div>
                  <span className="font-mono" style={{ fontSize:10, padding:"3px 8px", borderRadius:4, flexShrink:0, marginLeft:8,
                    background: p.status==="delivered"?"rgba(74,222,128,.15)":p.status==="in_progress"?"rgba(245,166,35,.15)":p.status==="on_hold"?"rgba(239,68,68,.15)":"var(--surface-3)",
                    color: p.status==="delivered"?"var(--green)":p.status==="in_progress"?"var(--amber)":p.status==="on_hold"?"var(--red)":"var(--text-2)" }}>{p.status.replace("_"," ")}</span>
                </div>
                <div style={{ fontSize:12, color:"var(--text-2)", marginBottom:8 }}>{p.client}</div>
                <div className="line-clamp-2" style={{ fontSize:11, color:"var(--text-3)", marginBottom:12, lineHeight:1.5 }}>{p.description}</div>
                {projTasks.length > 0 && (
                  <div style={{ marginBottom:12 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                      <span className="fl">tasks</span><span className="font-mono" style={{ fontSize:10, color:"var(--text-3)" }}>{doneTasks}/{projTasks.length}</span>
                    </div>
                    <div style={{ height:3, borderRadius:2, overflow:"hidden", background:"var(--surface-3)" }}>
                      <div style={{ height:"100%", width:`${(doneTasks/projTasks.length)*100}%`, background:c.ring }} />
                    </div>
                  </div>
                )}
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", fontSize:11 }} className="font-mono">
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ display:"flex" }}>
                      {members.slice(0,4).map((m,i) => <div key={m.id} style={{ width:20, height:20, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:500, background:"var(--surface-2)", border:"2px solid var(--surface)", marginLeft:i>0?-6:0 }}>{m.name[0]}</div>)}
                    </div>
                    <span style={{ color:"var(--text-2)" }}>{owner ? owner.name.split(" ")[0] : ""}</span>
                  </div>
                  <span style={{ color: p.isOngoing ? "var(--amber)" : days<0?"var(--red)":days<=3?"var(--amber)":"var(--text-2)" }}>
                    {p.isOngoing ? "∞ ongoing" : p.status==="delivered"?"delivered":days<0?`${Math.abs(days)}d late`:`${days}d left`}
                  </span>
                </div>
              </button>
            );
          })}
          {list.length===0 && <div style={{ gridColumn:"span 2", padding:"64px 0", textAlign:"center", fontSize:13, color:"var(--text-2)" }}>nothing here.</div>}
        </div>
      </div>
    </div>
  );
}
