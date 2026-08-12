import React, { useMemo } from 'react';
import { FolderKanban, ListTodo, AlertTriangle, Sparkles, ArrowUpRight, MessageSquare } from 'lucide-react';
import { StatCard } from '../components/ui';
import { Topbar } from '../components/layout';
import { isPast, daysBetween, today, fmtDateLong, fmtDate, fromISO } from '../utils/date';
import { colorFor, PALETTE } from '../utils/constants';

export function Dashboard({ projects, employees, users, updates, suggestions, tasks, modules, user, setView, setOpenProjectId, openTaskById }) {
  const active = projects.filter(p => p.status !== "delivered");
  const overdue = active.filter(p => isPast(p.deadline));
  const dueThisWeek = active.filter(p => { const d = daysBetween(today(), p.deadline); return d >= 0 && d <= 7; });
  const pending = suggestions.filter(s => s.status === "pending");
  const myTasks = tasks.filter(t => t.assigneeId === user.id && t.status !== "done").sort((a,b) => a.deadline.localeCompare(b.deadline)).slice(0,6);
  const overdueTasks = tasks.filter(t => t.status !== "done" && isPast(t.deadline));
  const openTasks = tasks.filter(t => t.status !== "done").length;

  const load = useMemo(() => {
    const map = {};
    employees.forEach(e => { map[e.id] = { projects: 0, tasks: 0 }; });
    active.forEach(p => p.memberIds.forEach(m => { if (map[m]) map[m].projects++; }));
    tasks.filter(t => t.status !== "done").forEach(t => { if (map[t.assigneeId]) map[t.assigneeId].tasks++; });
    return map;
  }, [active, employees, tasks]);

  const recentUpdates = [...updates].reverse().slice(0, 5);

  return (
    <div style={{ flex:1, overflowY:"auto" }}>
      <Topbar title={`morning, ${user.name.split(" ")[0].toLowerCase()}.`} subtitle={fmtDateLong(today())} />
      <div style={{ padding:24, display:"flex", flexDirection:"column", gap:24 }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
          <StatCard label="active projects" value={active.length} icon={FolderKanban} onClick={() => setView("projects")} />
          <StatCard label="open tasks" value={openTasks} icon={ListTodo} onClick={() => setView("tasks")} />
          <StatCard label="overdue" value={overdue.length + overdueTasks.length} icon={AlertTriangle} accent={overdue.length + overdueTasks.length > 0 ? "red" : null} />
          <StatCard label="ai suggestions" value={pending.length} icon={Sparkles} accent={pending.length > 0 ? "blue" : null} onClick={() => setView("ai")} />
        </div>

        {(overdue.length > 0 || overdueTasks.length > 0) && (
          <div className="fade-in" style={{ padding:16, borderRadius:8, background:"rgba(248,113,113,.06)", border:"1px solid rgba(248,113,113,.3)", display:"flex", alignItems:"flex-start", gap:12 }}>
            <AlertTriangle style={{ width:18, height:18, color:"var(--red)", flexShrink:0, marginTop:2 }} />
            <div style={{ flex:1 }}>
              <div className="font-display" style={{ fontWeight:600, fontSize:14, color:"var(--red)", marginBottom:4 }}>attention needed</div>
              <div style={{ fontSize:12, color:"var(--text-2)", lineHeight:1.6 }}>
                {overdue.map(p => <span key={p.id} style={{ display:"inline" }}><button onClick={() => setOpenProjectId(p.id)} style={{ color:"var(--text)", background:"none", border:"none", cursor:"pointer", textDecoration:"underline", fontSize:12 }}>{p.name}</button> ({Math.abs(daysBetween(p.deadline, today()))}d late) · </span>)}
                {overdueTasks.length > 0 && <span>{overdueTasks.length} overdue task{overdueTasks.length > 1 ? "s" : ""}</span>}
              </div>
            </div>
          </div>
        )}

        <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:24 }}>
          {/* next 7 days */}
          <div style={{ borderRadius:8, background:"var(--surface)", border:"1px solid var(--border)" }}>
            <div style={{ padding:"16px 20px", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div>
                <div className="font-display" style={{ fontWeight:600, fontSize:14 }}>next 7 days</div>
                <div style={{ fontSize:11, marginTop:2, color:"var(--text-2)" }}>projects with approaching deadlines</div>
              </div>
              <button className="btn btn-ghost" onClick={() => setView("calendar")}>calendar <ArrowUpRight style={{ width:14, height:14 }} /></button>
            </div>
            <div style={{ padding:8 }}>
              {dueThisWeek.length === 0 && <div style={{ padding:"32px 0", textAlign:"center", fontSize:13, color:"var(--text-2)" }}>clear week ahead.</div>}
              {dueThisWeek.map(p => {
                const c = colorFor(p.color);
                const days = daysBetween(today(), p.deadline);
                return (
                  <button key={p.id} onClick={() => setOpenProjectId(p.id)} style={{ width:"100%", textAlign:"left", padding:"10px 12px", borderRadius:6, display:"flex", alignItems:"center", gap:12, background:"transparent", border:"none", cursor:"pointer", color:"var(--text)" }}>
                    <div style={{ width:3, height:32, borderRadius:2, background:c.ring }} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:500 }}>{p.name}</div>
                      <div className="font-mono" style={{ fontSize:10, color:"var(--text-3)" }}>{p.client}</div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div className="font-mono" style={{ fontSize:11, color: days <= 2 ? "var(--red)" : days <= 4 ? "var(--amber)" : "var(--text-2)" }}>{days === 0 ? "today" : days === 1 ? "tomorrow" : `${days}d left`}</div>
                      <div className="font-mono" style={{ fontSize:10, color:"var(--text-3)" }}>{fmtDate(p.deadline)}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* my tasks */}
          <div style={{ borderRadius:8, background:"var(--surface)", border:"1px solid var(--border)" }}>
            <div style={{ padding:"16px 20px", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div>
                <div className="font-display" style={{ fontWeight:600, fontSize:14 }}>my tasks</div>
                <div style={{ fontSize:11, marginTop:2, color:"var(--text-2)" }}>assigned to you</div>
              </div>
              {myTasks.length > 0 && <button className="btn btn-ghost" onClick={() => setView("tasks")}>all <ArrowUpRight style={{ width:14, height:14 }} /></button>}
            </div>
            <div style={{ padding:8 }}>
              {myTasks.length === 0 && <div style={{ padding:"32px 0", textAlign:"center", fontSize:13, color:"var(--text-2)" }}>nothing assigned.</div>}
              {myTasks.map(t => {
                const p = projects.find(x => x.id === t.projectId);
                const c = p ? colorFor(p.color) : PALETTE[0];
                return (
                  <button key={t.id} onClick={() => openTaskById(t.id)} style={{ width:"100%", textAlign:"left", padding:"8px 12px", borderRadius:6, display:"flex", alignItems:"center", gap:8, background:"transparent", border:"none", cursor:"pointer", color:"var(--text)" }}>
                    <div style={{ width:6, height:6, borderRadius:3, background:c.ring, flexShrink:0 }} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.title}</div>
                      <div className="font-mono" style={{ fontSize:10, color:"var(--text-3)" }}>{p?.name}</div>
                    </div>
                    <div className="font-mono" style={{ fontSize:10, color: isPast(t.deadline) ? "var(--red)" : "var(--text-2)" }}>{fmtDate(t.deadline)}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:24 }}>
          {/* team load */}
          <div style={{ borderRadius:8, background:"var(--surface)", border:"1px solid var(--border)" }}>
            <div style={{ padding:"16px 20px", borderBottom:"1px solid var(--border)" }}>
              <div className="font-display" style={{ fontWeight:600, fontSize:14 }}>team load</div>
              <div style={{ fontSize:11, marginTop:2, color:"var(--text-2)" }}>projects + open tasks per person</div>
            </div>
            <div style={{ padding:12, display:"flex", flexDirection:"column", gap:10 }}>
              {employees.map(e => {
                const d = load[e.id] || { projects:0, tasks:0 };
                const heavy = d.projects >= 3 || d.tasks >= 6;
                const pct = Math.min(Math.max((d.projects/4)*100, (d.tasks/10)*100), 100);
                return (
                  <div key={e.id}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", fontSize:12, marginBottom:4 }}>
                      <span>{e.name}</span>
                      <span className="font-mono" style={{ fontSize:10, color: heavy ? "var(--red)" : "var(--text-2)" }}>{d.projects}p · {d.tasks}t</span>
                    </div>
                    <div style={{ height:4, borderRadius:2, overflow:"hidden", background:"var(--surface-3)" }}>
                      <div style={{ height:"100%", width:`${pct}%`, background: heavy ? "var(--red)" : "var(--amber)", transition:"width .3s" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {/* recent updates */}
          <div style={{ borderRadius:8, background:"var(--surface)", border:"1px solid var(--border)" }}>
            <div style={{ padding:"16px 20px", borderBottom:"1px solid var(--border)" }}>
              <div className="font-display" style={{ fontWeight:600, fontSize:14 }}>recent client updates</div>
              <div style={{ fontSize:11, marginTop:2, color:"var(--text-2)" }}>logged from whatsapp / email / calls</div>
            </div>
            <div style={{ padding:8 }}>
              {recentUpdates.length === 0 && <div style={{ padding:"32px 0", textAlign:"center", fontSize:13, color:"var(--text-2)" }}>no updates yet. log one from a project's updates tab.</div>}
              {recentUpdates.map(u => {
                const p = projects.find(x => x.id === u.projectId);
                return (
                  <div key={u.id} style={{ padding:"10px 12px", display:"flex", alignItems:"flex-start", gap:12, borderBottom:"1px solid var(--border)" }}>
                    <MessageSquare style={{ width:14, height:14, marginTop:2, flexShrink:0, color:"var(--text-3)" }} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12 }}><span style={{ fontWeight:500 }}>{p?.name || "unknown"}</span> <span style={{ color:"var(--text-2)" }}>· {u.note}</span></div>
                      <div className="font-mono" style={{ fontSize:10, marginTop:4, color:"var(--text-3)" }}>
                        {new Date(u.createdAt).toLocaleDateString("en-US", { month:"short", day:"numeric", hour:"numeric", minute:"2-digit" })}
                        {u.requestedDeadline && <span> · <span style={{ color:"var(--amber)" }}>requested: {fmtDate(u.requestedDeadline)}</span></span>}
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
