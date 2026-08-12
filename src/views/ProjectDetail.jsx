import React, { useState, useEffect } from 'react';
import { X, Edit3, Trash2, FolderKanban, Package, ListTodo, MessageSquare, Plus, Check, Wand2, Zap, Clock } from 'lucide-react';
import { colorFor, taskStatusMeta, priorityMeta } from '../utils/constants';
import { fmtDateLong, fmtDate, uid, toISO, addDays, fromISO, today, isPast, daysBetween } from '../utils/date';
import { Field } from '../components/ui';
import { ProjectEditor } from '../components/modals';
import { suggestModules } from '../services/heuristics';

export function ProjectDetail({ project, projects, employees, users, updates, tasks, modules, deliverables = [],
  onClose, onSave, onDelete, onAddUpdate, onAddDeliverable, onDeleteDeliverable, onMarkDelivered,
  onCreateTask, onEditTask, onAdvanceTask, onDeleteTask,
  onCreateModule, onUpdateModule, onDeleteModule }) {
  const [tab, setTab] = useState("overview");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(project);
  const c = colorFor(project.color);
  
  useEffect(() => { setDraft(project); setEditing(false); }, [project.id, project]);
  
  const projTasks = tasks.filter(t => t.projectId === project.id);
  const projModules = modules.filter(m => m.projectId === project.id).sort((a,b) => a.order - b.order);
  const projUpdates = updates.filter(u => u.projectId === project.id).reverse();
  const owner = users.find(u => u.id === project.ownerId);
  const members = employees.filter(e => project.memberIds.includes(e.id));
  const save = () => { onSave(draft); setEditing(false); };
  
  const tabs = [
    { id:"overview", label:"overview", icon:FolderKanban },
    { id:"modules",  label:"modules",  icon:Package,       count:projModules.length },
    { id:"tasks",    label:"tasks",    icon:ListTodo,      count:projTasks.filter(t=>t.status!=="done").length },
    { id:"vault",    label:"vault",    icon:FolderKanban,  count:deliverables?.filter(d=>d.projectId===project.id).length },
    { id:"updates",  label:"updates",  icon:MessageSquare, count:projUpdates.length },
  ];
  
  return (
    <div style={{ position:"fixed", inset:0, zIndex:40, display:"flex", justifyContent:"flex-end", background:"rgba(0,0,0,.5)" }} onClick={onClose}>
      <div className="slide-in" style={{ width:"100%", maxWidth:640, height:"100%", overflowY:"auto", display:"flex", flexDirection:"column", background:"var(--bg)", borderLeft:"1px solid var(--border)" }} onClick={e => e.stopPropagation()}>
        {/* header */}
        <div style={{ position:"sticky", top:0, zIndex:10, padding:"16px 24px", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"space-between", background:"var(--bg)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, minWidth:0 }}>
            <div style={{ width:12, height:12, borderRadius:2, background:c.ring, flexShrink:0 }} />
            <div>
              <div className="font-display" style={{ fontWeight:600, fontSize:16, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{project.name}</div>
              <div className="font-mono" style={{ fontSize:10, color:"var(--text-3)", marginTop:2, display:"flex", alignItems:"center", gap:6 }}>
                ID: {project.id}
                <button onClick={() => { navigator.clipboard.writeText(project.id); alert("Project ID copied!"); }} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--blue)", fontSize:9, padding:0 }}>copy</button>
              </div>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:4 }}>
            {project.status !== "delivered" && <button className="btn btn-ghost" onClick={() => { onMarkDelivered(project.id); onClose(); }}>mark delivered</button>}
            {tab==="overview"&&!editing && <button className="btn btn-ghost" onClick={() => setEditing(true)}><Edit3 style={{ width:14, height:14 }} /> edit</button>}
            <button className="btn btn-ghost" onClick={onClose}><X style={{ width:16, height:16 }} /></button>
          </div>
        </div>
        {/* tabs */}
        <div style={{ display:"flex", borderBottom:"1px solid var(--border)" }}>
          {tabs.map(t => {
            const Icon = t.icon; const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => { setTab(t.id); setEditing(false); }}
                style={{ flex:1, padding:"10px 16px", fontSize:12, display:"flex", alignItems:"center", justifyContent:"center", gap:6,
                  borderBottom:`2px solid ${active?"var(--amber)":"transparent"}`, color:active?"var(--text)":"var(--text-2)",
                  background:"none", border:"none", cursor:"pointer" }}>
                <Icon style={{ width:14, height:14 }} />{t.label}
                {t.count > 0 && <span className="font-mono" style={{ fontSize:10, padding:"1px 4px", borderRadius:3, background:"var(--surface-2)", color:"var(--text-3)" }}>{t.count}</span>}
              </button>
            );
          })}
        </div>
        <div style={{ flex:1, padding:24 }}>
          {tab==="overview" && (editing ? (
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <ProjectEditor draft={draft} setDraft={setDraft} employees={employees} users={users} />
              <div style={{ display:"flex", alignItems:"center", gap:8, paddingTop:8 }}>
                <button className="btn btn-primary" onClick={save}>save</button>
                <button className="btn btn-secondary" onClick={() => { setDraft(project); setEditing(false); }}>cancel</button>
                <button className="btn btn-danger" onClick={() => { if(confirm("delete project?")) { onDelete(project.id); onClose(); }}} style={{ marginLeft:"auto" }}><Trash2 style={{ width:14, height:14 }} /> delete</button>
              </div>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
              <Field label="client" value={project.client} />
              <Field label="description" value={project.description || "—"} multiline />
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                <Field label="starts" value={fmtDateLong(project.startDate)} mono />
                <Field label="deadline" value={project.isOngoing ? "∞ Ongoing" : fmtDateLong(project.deadline)} mono accent={!project.isOngoing && isPast(project.deadline) ? "red" : null} />
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:16 }}>
                <Field label="estimated" value={`${project.estimatedDays} days`} mono />
                <Field label="priority" value={project.priority} mono />
                <Field label="status" value={project.status.replace("_"," ")} mono />
              </div>
              <Field label="owner" value={owner?.name || "—"} />
              <div>
                <label className="fl">members</label>
                <div style={{ marginTop:8, display:"flex", flexWrap:"wrap", gap:6 }}>
                  {members.map(m => (
                    <div key={m.id} style={{ display:"flex", alignItems:"center", gap:6, padding:"4px 8px", borderRadius:6, fontSize:12, background:"var(--surface-2)", border:"1px solid var(--border)" }}>
                      <div style={{ width:16, height:16, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:500, background:"var(--surface-3)" }}>{m.name[0]}</div>
                      {m.name}
                    </div>
                  ))}
                  {members.length===0 && <span style={{ fontSize:12, color:"var(--text-3)" }}>none</span>}
                </div>
              </div>
            </div>
          ))}
          {tab==="modules" && <ModulesTab project={project} modules={projModules} tasks={projTasks} onCreateModule={onCreateModule} onUpdateModule={onUpdateModule} onDeleteModule={onDeleteModule} />}
          {tab==="tasks" && <TasksKanban tasks={projTasks} employees={employees} users={users} modules={projModules} onNew={() => onCreateTask({projectId:project.id})} onEdit={onEditTask} onAdvance={onAdvanceTask} onDelete={onDeleteTask} />}
          {tab==="vault" && <VaultTab project={project} deliverables={deliverables.filter(d=>d.projectId===project.id)} onAddDeliverable={onAddDeliverable} onDeleteDeliverable={onDeleteDeliverable} />}
          {tab==="updates" && <UpdatesTab project={project} updates={projUpdates} onAddUpdate={onAddUpdate} />}
        </div>
      </div>
    </div>
  );
}

function ModulesTab({ project, modules, tasks, onCreateModule, onUpdateModule, onDeleteModule }) {
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [suggested, setSuggested] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const [draft, setDraft] = useState({ name:"", description:"", deadline:project.deadline });

  const runSuggest = () => { setSuggested(suggestModules(project)); setShowSuggestion(true); };
  const acceptSuggestions = () => { suggested.forEach(m => onCreateModule(m)); setShowSuggestion(false); setSuggested([]); };
  const addModule = () => {
    if (!draft.name) return;
    const safeDL = draft.deadline > project.deadline ? project.deadline : draft.deadline;
    onCreateModule({ id:uid(), projectId:project.id, name:draft.name, description:draft.description, deadline:safeDL, order:modules.length+1 });
    setDraft({ name:"", description:"", deadline:project.deadline }); setShowAdd(false);
  };
  const saveEdit = (mod) => {
    const safeDL = draft.deadline > project.deadline ? project.deadline : draft.deadline;
    onUpdateModule({ ...mod, name:draft.name, description:draft.description, deadline:safeDL });
    setEditId(null);
  };

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
        <div style={{ fontSize:12, color:"var(--text-2)" }}>PRD milestones. progress rolls up from tasks.</div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={runSuggest} className="btn btn-secondary"><Wand2 style={{ width:14, height:14 }} /> suggest</button>
          <button onClick={() => { setShowAdd(true); setDraft({ name:"", description:"", deadline:project.deadline }); }} className="btn btn-primary"><Plus style={{ width:14, height:14 }} /> module</button>
        </div>
      </div>
      {showSuggestion && (
        <div className="fade-in" style={{ marginBottom:16, padding:16, borderRadius:8, background:"rgba(74,158,255,.06)", border:"1px solid rgba(74,158,255,.3)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
            <Wand2 style={{ width:16, height:16, color:"var(--blue)" }} />
            <span className="font-display" style={{ fontWeight:600, fontSize:13, color:"var(--blue)" }}>suggested structure</span>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:16 }}>
            {suggested.map(m => (
              <div key={m.id} style={{ display:"flex", alignItems:"center", gap:8, padding:8, borderRadius:6, background:"var(--surface)" }}>
                <Package style={{ width:14, height:14, color:"var(--text-3)" }} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:500 }}>{m.name}</div>
                  <div style={{ fontSize:10, color:"var(--text-3)" }}>{m.description}</div>
                </div>
                <div className="font-mono" style={{ fontSize:10, color:"var(--text-2)" }}>{fmtDate(m.deadline)}</div>
              </div>
            ))}
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button className="btn btn-primary" onClick={acceptSuggestions}><Check style={{ width:14, height:14 }} /> add all</button>
            <button className="btn btn-secondary" onClick={() => setShowSuggestion(false)}>dismiss</button>
          </div>
        </div>
      )}
      {showAdd && (
        <div className="fade-in" style={{ marginBottom:16, padding:16, borderRadius:8, background:"var(--surface)", border:"1px solid var(--border-strong)", display:"flex", flexDirection:"column", gap:10 }}>
          <input value={draft.name} onChange={e => setDraft({...draft,name:e.target.value})} placeholder="module name" style={{ width:"100%", boxSizing:"border-box" }} autoFocus />
          <input value={draft.description} onChange={e => setDraft({...draft,description:e.target.value})} placeholder="short description" style={{ width:"100%", boxSizing:"border-box" }} />
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <input type="date" value={draft.deadline} onChange={e => setDraft({...draft,deadline:e.target.value})} max={project.deadline} />
            <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
              <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>cancel</button>
              <button className="btn btn-primary" onClick={addModule} disabled={!draft.name}>add</button>
            </div>
          </div>
        </div>
      )}
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {modules.map(m => {
          const modTasks = tasks.filter(t => t.moduleId === m.id);
          const done = modTasks.filter(t => t.status === "done").length;
          const pct = modTasks.length > 0 ? Math.round((done/modTasks.length)*100) : 0;
          const days = daysBetween(today(), m.deadline);
          const late = days < 0;
          const isEditing = editId === m.id;
          
          if (isEditing) {
            return (
              <div key={m.id} className="fade-in" style={{ padding:12, borderRadius:8, background:"var(--surface)", border:"1px solid var(--amber)", display:"flex", flexDirection:"column", gap:8 }}>
                <input value={draft.name} onChange={e => setDraft({...draft,name:e.target.value})} style={{ width:"100%", boxSizing:"border-box" }} />
                <input value={draft.description} onChange={e => setDraft({...draft,description:e.target.value})} style={{ width:"100%", boxSizing:"border-box" }} />
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <input type="date" value={draft.deadline} onChange={e => setDraft({...draft,deadline:e.target.value})} max={project.deadline} />
                  <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
                    <button className="btn btn-secondary" onClick={() => setEditId(null)}>cancel</button>
                    <button className="btn btn-primary" onClick={() => saveEdit(m)}>save</button>
                  </div>
                </div>
              </div>
            );
          }
          return (
            <div key={m.id} style={{ padding:12, borderRadius:8, background:"var(--surface)", border:"1px solid var(--border)" }}>
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:8 }}>
                <div style={{ display:"flex", alignItems:"flex-start", gap:8, flex:1, minWidth:0 }}>
                  <div style={{ width:24, height:24, borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", background:"var(--surface-3)", flexShrink:0 }}>
                    <span className="font-mono" style={{ fontSize:10 }}>{m.order}</span>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:500 }}>{m.name}</div>
                    {m.description && <div style={{ fontSize:11, marginTop:2, color:"var(--text-3)" }}>{m.description}</div>}
                  </div>
                </div>
                <div style={{ textAlign:"right", flexShrink:0, marginLeft:8 }}>
                  <div className="font-mono" style={{ fontSize:10, color: late?"var(--red)":"var(--text-2)" }}>{fmtDate(m.deadline)}</div>
                  <div className="font-mono" style={{ fontSize:10, color: late?"var(--red)":"var(--text-3)" }}>{late?`${Math.abs(days)}d late`:`${days}d left`}</div>
                </div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ flex:1, height:3, borderRadius:2, overflow:"hidden", background:"var(--surface-3)" }}>
                  <div style={{ height:"100%", width:`${pct}%`, background: pct===100?"var(--green)":"var(--amber)" }} />
                </div>
                <span className="font-mono" style={{ fontSize:10, color:"var(--text-2)" }}>{done}/{modTasks.length}</span>
                <button onClick={() => { setEditId(m.id); setDraft({ name:m.name, description:m.description||"", deadline:m.deadline }); }} style={{ padding:4, borderRadius:4, background:"none", border:"none", cursor:"pointer", color:"var(--text-3)" }} title="edit"><Edit3 style={{ width:12, height:12 }} /></button>
                <button onClick={() => { if(confirm("delete module?")) onDeleteModule(m.id); }} style={{ padding:4, borderRadius:4, background:"none", border:"none", cursor:"pointer", color:"var(--text-3)" }} title="delete"><Trash2 style={{ width:12, height:12 }} /></button>
              </div>
            </div>
          );
        })}
        {modules.length===0 && !showSuggestion && (
          <div style={{ padding:32, textAlign:"center", borderRadius:8, background:"var(--surface)", border:"1px dashed var(--border)" }}>
            <div style={{ fontSize:13, marginBottom:8, color:"var(--text-2)" }}>no modules yet.</div>
            <button onClick={runSuggest} className="btn btn-secondary"><Wand2 style={{ width:14, height:14 }} /> suggest structure</button>
          </div>
        )}
      </div>
    </div>
  );
}

function TasksKanban({ tasks, employees, users, modules, onNew, onEdit, onAdvance, onDelete }) {
  const cols = ["todo","in_progress","review","done"];
  const byStatus = Object.fromEntries(cols.map(c => [c, tasks.filter(t => t.status === c)]));
  const all = [...(users||[]), ...(employees||[])];
  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
        <div style={{ fontSize:12, color:"var(--text-2)" }}>{tasks.length} total · click card to advance</div>
        <button className="btn btn-primary" onClick={onNew}><Plus style={{ width:14, height:14 }} /> task</button>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        {cols.map(col => {
          const meta = taskStatusMeta[col]; const Icon = meta.icon;
          return (
            <div key={col} style={{ borderRadius:8, padding:8, background:"var(--surface)", border:"1px solid var(--border)", minHeight:160 }}>
              <div style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 8px", marginBottom:4 }}>
                <Icon style={{ width:12, height:12, color:meta.color }} />
                <span className="fl" style={{ color:meta.color, textTransform:"uppercase" }}>{meta.label}</span>
                <span className="font-mono" style={{ fontSize:10, color:"var(--text-3)", marginLeft:"auto" }}>{byStatus[col].length}</span>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {byStatus[col].map(t => {
                  const assignee = all.find(a => a.id === t.assigneeId);
                  const mod = modules?.find(m => m.id === t.moduleId);
                  const pMeta = priorityMeta[t.priority];
                  return (
                    <div key={t.id} style={{ padding:10, borderRadius:6, background:"var(--surface-2)", border:"1px solid var(--border)" }}>
                      <button onClick={() => { if(t.status!=="done") onAdvance(t.id); }} style={{ textAlign:"left", width:"100%", marginBottom:6, background:"none", border:"none", cursor: t.status!=="done"?"pointer":"default", color:"var(--text)" }} title={t.status==="done"?"":"click to advance"}>
                        <div style={{ fontSize:12, lineHeight:1.4 }}>{t.title}</div>
                      </button>
                      {mod && <div className="font-mono" style={{ fontSize:10, color:"var(--text-3)", marginBottom:6 }}>· {mod.name}</div>}
                      <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:10 }} className="font-mono">
                        {assignee && <div style={{ width:14, height:14, borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center", fontSize:8, fontWeight:500, background:"var(--surface-3)" }}>{assignee.name[0]}</div>}
                        <span style={{ color:pMeta.color }}>{pMeta.label}</span>
                        <span style={{ color: isPast(t.deadline)&&t.status!=="done"?"var(--red)":"var(--text-3)" }}>· {fmtDate(t.deadline)}</span>
                        <button onClick={() => onEdit(t)} style={{ marginLeft:"auto", padding:2, background:"none", border:"none", cursor:"pointer", color:"var(--text-3)" }}><Edit3 style={{ width:10, height:10 }} /></button>
                        <button onClick={() => { if(confirm("delete?")) onDelete(t.id); }} style={{ padding:2, background:"none", border:"none", cursor:"pointer", color:"var(--text-3)" }}><Trash2 style={{ width:10, height:10 }} /></button>
                      </div>
                    </div>
                  );
                })}
                {byStatus[col].length===0 && <div style={{ fontSize:11, padding:"16px 0", textAlign:"center", color:"var(--text-3)" }}>—</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function UpdatesTab({ project, updates, onAddUpdate }) {
  const [note, setNote] = useState("");
  const [reqDL, setReqDL] = useState("");
  const submit = () => {
    if (!note) return;
    onAddUpdate({ id:uid(), projectId:project.id, note, requestedDeadline:reqDL||null, createdAt:new Date().toISOString() });
    setNote(""); setReqDL("");
  };
  return (
    <div>
      <div style={{ padding:12, borderRadius:8, marginBottom:16, background:"var(--surface)", border:"1px solid var(--border-strong)", display:"flex", flexDirection:"column", gap:8 }}>
        <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="what did the client say?" rows={2} style={{ width:"100%", boxSizing:"border-box", resize:"none" }} />
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <label className="fl">new deadline:</label>
          <input type="date" value={reqDL} onChange={e => setReqDL(e.target.value)} style={{ fontSize:12, padding:"6px 8px" }} />
          <button className="btn btn-primary" onClick={submit} disabled={!note} style={{ marginLeft:"auto" }}><Zap style={{ width:14, height:14 }} /> log + run scheduler</button>
        </div>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {updates.map(u => (
          <div key={u.id} style={{ padding:12, borderRadius:6, background:"var(--surface)", border:"1px solid var(--border)" }}>
            <div style={{ fontSize:13, lineHeight:1.5 }}>{u.note}</div>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:8, fontSize:10, color:"var(--text-3)" }} className="font-mono">
              <Clock style={{ width:12, height:12 }} />
              <span>{new Date(u.createdAt).toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}</span>
              {u.requestedDeadline && <><span>·</span><span style={{ color:"var(--amber)" }}>requested: {fmtDate(u.requestedDeadline)}</span></>}
            </div>
          </div>
        ))}
        {updates.length===0 && <div style={{ fontSize:12, padding:"32px 0", textAlign:"center", color:"var(--text-3)" }}>no updates yet.</div>}
      </div>
    </div>
  );
}

export function VaultTab({ project, deliverables, onAddDeliverable, onDeleteDeliverable }) {
  const [draft, setDraft] = useState({ title:"", url:"", type:"link" });
  
  const submit = () => {
    if (!draft.title || !draft.url) return;
    onAddDeliverable({
      id: uid(), projectId: project.id, title: draft.title, url: draft.url,
      type: draft.type, createdAt: new Date().toISOString()
    });
    setDraft({ title:"", url:"", type:"link" });
  };
  
  return (
    <div>
      <div style={{ padding:16, borderRadius:8, marginBottom:24, background:"var(--surface)", border:"1px solid var(--border-strong)", display:"flex", flexDirection:"column", gap:12 }}>
        <div style={{ fontSize:14, fontWeight:500 }}>Add Deliverable / Asset</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <div><label className="fl">Title</label><input value={draft.title} onChange={e => setDraft({...draft, title:e.target.value})} placeholder="e.g. Figma Design" style={{ width:"100%", marginTop:4, boxSizing:"border-box" }} /></div>
          <div>
            <label className="fl">Type</label>
            <select value={draft.type} onChange={e => setDraft({...draft, type:e.target.value})} style={{ width:"100%", marginTop:4, boxSizing:"border-box" }}>
              <option value="link">Link / URL</option>
              <option value="figma">Figma</option>
              <option value="github">GitHub repo</option>
              <option value="drive">Google Drive</option>
            </select>
          </div>
        </div>
        <div>
          <label className="fl">URL / Link</label>
          <input value={draft.url} onChange={e => setDraft({...draft, url:e.target.value})} placeholder="https://..." style={{ width:"100%", marginTop:4, boxSizing:"border-box" }} />
        </div>
        <div style={{ display:"flex", justifyContent:"flex-end" }}>
          <button className="btn btn-primary" onClick={submit} disabled={!draft.title || !draft.url}><Plus style={{ width:14, height:14 }} /> add to vault</button>
        </div>
      </div>
      
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {deliverables.map(d => (
          <div key={d.id} style={{ padding:16, borderRadius:8, background:"var(--surface)", border:"1px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div>
              <div style={{ fontSize:14, fontWeight:500, marginBottom:4 }}>{d.title}</div>
              <div className="font-mono" style={{ fontSize:11, color:"var(--text-3)", marginBottom:8 }}>{new Date(d.createdAt).toLocaleDateString()} · {d.type}</div>
              <a href={d.url} target="_blank" rel="noreferrer" style={{ fontSize:12, color:"var(--blue)", textDecoration:"none" }}>{d.url}</a>
            </div>
            <button onClick={() => { if(confirm("delete deliverable?")) onDeleteDeliverable(d.id); }} style={{ padding:8, background:"none", border:"none", color:"var(--red)", cursor:"pointer" }}><Trash2 style={{ width:16, height:16 }} /></button>
          </div>
        ))}
        {deliverables.length === 0 && <div style={{ textAlign:"center", padding:"48px 0", color:"var(--text-3)", fontSize:13 }}>no deliverables added yet.</div>}
      </div>
    </div>
  );
}
