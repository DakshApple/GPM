import React from 'react';
import { Plus, User } from 'lucide-react';
import { Topbar } from '../components/layout';
import { daysBetween, today, isPast } from '../utils/date';

export { APIVaultView } from './APIVaultView';

export function TeamView({ users, employees, projects, tasks, onNewEmployee }) {
  const active = projects.filter(p => p.status !== "delivered");
  return (
    <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column" }}>
      <Topbar title="team" subtitle="capacity & current focus" actions={<button className="btn btn-primary" onClick={onNewEmployee}><Plus style={{ width:14, height:14 }} /> person</button>} />
      <div style={{ padding:24 }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:24 }}>
          {/* admins */}
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div className="fl" style={{ paddingBottom:8, borderBottom:"1px solid var(--border)" }}>admins ({users.length})</div>
            {users.map(u => (
              <div key={u.id} style={{ padding:16, borderRadius:8, background:"var(--surface)", border:"1px solid var(--border)" }}>
                <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
                  <div style={{ width:40, height:40, borderRadius:20, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:500, background:"var(--surface-3)" }}>{u.name[0]}</div>
                  <div>
                    <div style={{ fontSize:14, fontWeight:500 }}>{u.name}</div>
                    <div className="font-mono" style={{ fontSize:11, color:"var(--text-3)" }}>{u.title || "admin"}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* team */}
          <div style={{ gridColumn:"span 2", display:"flex", flexDirection:"column", gap:12 }}>
            <div className="fl" style={{ paddingBottom:8, borderBottom:"1px solid var(--border)" }}>employees ({employees.length})</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:12 }}>
              {employees.map(e => {
                const myProjects = active.filter(p => p.memberIds.includes(e.id));
                const myTasks = tasks.filter(t => t.assigneeId === e.id && t.status !== "done");
                const next7Days = myTasks.filter(t => { const d = daysBetween(today(), t.deadline); return d >= 0 && d <= 7; });
                const hours7d = next7Days.reduce((s,t) => s + (t.estimatedHours || 4), 0);
                const isOverloaded = hours7d > 40 || myProjects.length >= 3;
                return (
                  <div key={e.id} style={{ padding:16, borderRadius:8, background:"var(--surface)", border: isOverloaded ? "1px solid var(--red)" : "1px solid var(--border)" }}>
                    <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:12 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                        <div style={{ width:40, height:40, borderRadius:20, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:500, background:"var(--surface-3)" }}>{e.name[0]}</div>
                        <div>
                          <div style={{ fontSize:14, fontWeight:500 }}>{e.name}</div>
                          <div className="font-mono" style={{ fontSize:11, color:"var(--text-3)" }}>{e.role}</div>
                        </div>
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <div className="font-mono" style={{ fontSize:10, padding:"2px 6px", borderRadius:4, background:isOverloaded?"rgba(248,113,113,.15)":"var(--surface-2)", color:isOverloaded?"var(--red)":"var(--text-2)" }}>{hours7d}h / 40h</div>
                        <div className="font-mono" style={{ fontSize:9, color:"var(--text-3)", marginTop:4 }}>next 7 days</div>
                      </div>
                    </div>
                    <div style={{ fontSize:11, color:"var(--text-2)", marginBottom:8 }}>{e.skills.join(", ")}</div>
                    <div style={{ display:"flex", gap:16, paddingTop:12, borderTop:"1px solid var(--border)" }} className="font-mono">
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:9, color:"var(--text-3)", marginBottom:4 }}>active projects</div>
                        <div style={{ fontSize:13, color:"var(--text)" }}>{myProjects.length}</div>
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:9, color:"var(--text-3)", marginBottom:4 }}>open tasks</div>
                        <div style={{ fontSize:13, color:"var(--text)" }}>{myTasks.length}</div>
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:9, color:"var(--text-3)", marginBottom:4 }}>late tasks</div>
                        <div style={{ fontSize:13, color: myTasks.some(t=>isPast(t.deadline))?"var(--red)":"var(--text)" }}>{myTasks.filter(t=>isPast(t.deadline)).length}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SuggestionsView({ suggestions, applySuggestion, dismissSuggestion }) {
  const pending = suggestions.filter(s => s.status === "pending");
  const processed = suggestions.filter(s => s.status !== "pending").slice(0, 50); // limit history
  return (
    <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column" }}>
      <Topbar title="ai scheduler" subtitle="heuristic collision detection & capacity forecasting" actions={<button className="btn btn-secondary" onClick={() => window.location.reload()}>run check</button>} />
      <div style={{ padding:24 }}>
        <div style={{ marginBottom:32 }}>
          <div className="fl" style={{ paddingBottom:8, borderBottom:"1px solid var(--border)", marginBottom:12 }}>pending ({pending.length})</div>
          {pending.length === 0 && <div style={{ padding:"32px 0", textAlign:"center", fontSize:13, color:"var(--text-2)" }}>all clear. the scheduler is happy.</div>}
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {pending.map(s => (
              <div key={s.id} className="fade-in" style={{ padding:16, borderRadius:8, background:"rgba(74,158,255,.05)", border:"1px solid rgba(74,158,255,.3)", display:"flex", gap:16 }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                    <span className="font-mono" style={{ fontSize:10, padding:"2px 6px", borderRadius:4, background:s.severity==="high"?"rgba(248,113,113,.15)":"rgba(245,166,35,.15)", color:s.severity==="high"?"var(--red)":"var(--amber)" }}>{s.type.replace(/_/g," ")}</span>
                    <span className="font-display" style={{ fontSize:14, fontWeight:500 }}>{s.projectName}</span>
                  </div>
                  <div style={{ fontSize:13, lineHeight:1.5, color:"var(--text)" }}>{s.reason}</div>
                  <div style={{ marginTop:12, display:"flex", gap:8 }}>
                    {s.action !== "flag" && <button className="btn btn-primary" onClick={() => applySuggestion(s.id)}>apply {s.action.replace("_"," ")}</button>}
                    <button className="btn btn-secondary" onClick={() => dismissSuggestion(s.id)}>dismiss</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {processed.length > 0 && (
          <div>
            <div className="fl" style={{ paddingBottom:8, borderBottom:"1px solid var(--border)", marginBottom:12 }}>history</div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {processed.map(s => (
                <div key={s.id} style={{ padding:12, borderRadius:8, background:"var(--surface)", border:"1px solid var(--border)", display:"flex", alignItems:"flex-start", gap:12 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, lineHeight:1.5, color:"var(--text-2)" }}>{s.reason}</div>
                    <div className="font-mono" style={{ fontSize:10, color:"var(--text-3)", marginTop:4 }}>{s.status} · {new Date(s.createdAt).toLocaleString("en-US")}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
