import React from 'react';
import { Topbar } from '../components/layout';
import { toISO, addDays, fromISO, daysBetween, today, isPast, clamp } from '../utils/date';
import { colorFor } from '../utils/constants';

export function TimelineView({ projects, tasks, onOpenProject }) {
  const active = projects.filter(p => p.status !== "delivered");
  if (active.length === 0) return (
    <div style={{ flex:1, display:"flex", flexDirection:"column" }}>
      <Topbar title="timeline" subtitle="gantt view" />
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, color:"var(--text-2)" }}>no active projects.</div>
    </div>
  );
  
  const minStart = active.reduce((m, p) => p.startDate < m ? p.startDate : m, today());
  const maxEnd = active.reduce((m, p) => p.deadline > m ? p.deadline : m, today());
  const start = toISO(addDays(fromISO(minStart), -2));
  const end = toISO(addDays(fromISO(maxEnd), 2));
  const totalDays = Math.max(21, daysBetween(start, end) + 1);
  const dayWidth = 32;
  const days = Array.from({ length: totalDays }, (_, i) => toISO(addDays(fromISO(start), i)));

  const getProgress = (p) => {
    const projTasks = tasks.filter(t => t.projectId === p.id);
    if (projTasks.length === 0) {
      const total = daysBetween(p.startDate, p.deadline);
      const done = clamp(daysBetween(p.startDate, today()), 0, total);
      return total > 0 ? Math.round((done/total)*100) : 0;
    }
    const doneCount = projTasks.filter(t => t.status === "done").length;
    return Math.round((doneCount / projTasks.length) * 100);
  };

  const getStatus = (p) => {
    if (isPast(p.deadline) && getProgress(p) < 100) return { label:"overdue", color:"var(--red)" };
    const timeUsed = Math.round((daysBetween(p.startDate, today()) / Math.max(1, daysBetween(p.startDate, p.deadline))) * 100);
    const progress = getProgress(p);
    if (progress < timeUsed - 20) return { label:"behind", color:"var(--red)" };
    if (progress > timeUsed + 10) return { label:"ahead", color:"var(--green)" };
    return { label:"on track", color:"var(--amber)" };
  };

  return (
    <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column" }}>
      <Topbar title="timeline" subtitle="progress based on task completion" />
      <div style={{ flex:1, padding:24 }}>
        <div style={{ borderRadius:8, overflow:"hidden", background:"var(--surface)", border:"1px solid var(--border)" }}>
          <div style={{ display:"flex" }}>
            <div style={{ width:240, flexShrink:0, padding:"12px 16px", borderRight:"1px solid var(--border)", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center" }}>
              <span className="fl">project</span>
            </div>
            <div style={{ flex:1, overflowX:"auto", borderBottom:"1px solid var(--border)" }}>
              <div style={{ display:"flex", minWidth:totalDays*dayWidth }}>
                {days.map(iso => {
                  const d = fromISO(iso);
                  const isFirst = d.getDate()===1;
                  const isToday = iso===today();
                  return (
                    <div key={iso} style={{ flexShrink:0, width:dayWidth, padding:"8px 0", textAlign:"center", borderRight:`1px solid ${isFirst?"var(--border-strong)":"var(--border)"}`, background: isToday?"rgba(245,166,35,.06)":"transparent" }}>
                      <div className="font-mono" style={{ fontSize:9, color:"var(--text-3)" }}>{d.toLocaleDateString("en-US",{weekday:"short"})[0]}</div>
                      <div className="font-mono" style={{ fontSize:11, fontWeight:500, color: isToday?"var(--amber)":"var(--text)" }}>{d.getDate()}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          {active.map(p => {
            const c = colorFor(p.color);
            const offset = daysBetween(start, p.startDate);
            const span = daysBetween(p.startDate, p.deadline)+1;
            const progress = getProgress(p);
            const status = getStatus(p);
            return (
              <div key={p.id} style={{ display:"flex", borderBottom:"1px solid var(--border)" }}>
                <button onClick={() => onOpenProject(p.id)} style={{ width:240, flexShrink:0, padding:"12px 16px", borderRight:"1px solid var(--border)", textAlign:"left", display:"flex", alignItems:"flex-start", gap:8, background:"none", border:"none", cursor:"pointer", color:"var(--text)" }}>
                  <div style={{ width:2, borderRadius:1, background:c.ring, minHeight:32, marginTop:2 }} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</div>
                    <div className="font-mono" style={{ fontSize:10, color:"var(--text-3)", marginTop:2 }}>{p.client}</div>
                    <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:4 }}>
                      <div style={{ width:4, height:4, borderRadius:2, background:status.color }} />
                      <span style={{ fontSize:10, color:status.color }}>{status.label}</span>
                      <span className="font-mono" style={{ fontSize:10, color:"var(--text-3)" }}>{progress}%</span>
                    </div>
                  </div>
                </button>
                <div style={{ flex:1, position:"relative", overflowX:"auto" }}>
                  <div style={{ minWidth:totalDays*dayWidth, height:64, position:"relative" }}>
                    {(() => { const todayOff = daysBetween(start, today()); if (todayOff < 0 || todayOff >= totalDays) return null; return <div style={{ position:"absolute", top:0, bottom:0, left:todayOff*dayWidth+dayWidth/2, width:1, background:"var(--amber)", opacity:.4 }} />; })()}
                    <button onClick={() => onOpenProject(p.id)} style={{ position:"absolute", borderRadius:6, display:"flex", alignItems:"center", overflow:"hidden", left:offset*dayWidth+2, width:span*dayWidth-4, top:12, height:40, background:c.bg, border:`1px solid ${c.border}`, cursor:"pointer", color:"var(--text)" }}>
                      <div style={{ position:"absolute", inset:0, right:`${100-progress}%`, background:c.ring, opacity:.35 }} />
                      <div style={{ position:"relative", padding:"0 8px", display:"flex", alignItems:"center", gap:8, width:"100%" }}>
                        <div style={{ width:3, height:24, borderRadius:2, background:c.ring }} />
                        <span style={{ fontSize:11, fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1 }}>{p.name}</span>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ display:"flex", gap:16, marginTop:16, fontSize:11, color:"var(--text-2)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}><div style={{ width:8, height:8, borderRadius:4, background:"var(--green)" }} /> ahead</div>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}><div style={{ width:8, height:8, borderRadius:4, background:"var(--amber)" }} /> on track</div>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}><div style={{ width:8, height:8, borderRadius:4, background:"var(--red)" }} /> behind / overdue</div>
        </div>
      </div>
    </div>
  );
}
