import React, { useState, useEffect } from 'react';
import { X, Plus, Check, Wand2, MessageSquareWarning, CheckCircle2, AlertTriangle, Bug, Code, ArrowRight, CornerDownRight } from 'lucide-react';
import { PALETTE } from '../../utils/constants';
import { uid, toISO, addDays, fromISO, today } from '../../utils/date';
import { suggestTaskBreakdown } from '../../services/heuristics';
export { ChangePasswordModal } from './ChangePasswordModal';


export function ProjectEditor({ draft, setDraft, employees, users }) {
  const set = (k,v) => setDraft({...draft,[k]:v});
  const toggleMember = (id) => set("memberIds", draft.memberIds.includes(id)?draft.memberIds.filter(x=>x!==id):[...draft.memberIds,id]);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div><label className="fl">name</label><input value={draft.name} onChange={e => set("name",e.target.value)} style={{ width:"100%", marginTop:4, boxSizing:"border-box" }} /></div>
      <div><label className="fl">client</label><input value={draft.client} onChange={e => set("client",e.target.value)} style={{ width:"100%", marginTop:4, boxSizing:"border-box" }} /></div>
      <div><label className="fl">description</label><textarea value={draft.description||""} onChange={e => set("description",e.target.value)} rows={2} style={{ width:"100%", marginTop:4, boxSizing:"border-box", resize:"none" }} /></div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <div><label className="fl">start date</label><input type="date" value={draft.startDate} onChange={e => set("startDate",e.target.value)} style={{ width:"100%", marginTop:4, boxSizing:"border-box" }} /></div>
        
        {!draft.isOngoing ? (
          <div><label className="fl">deadline</label><input type="date" value={draft.deadline||""} onChange={e => set("deadline",e.target.value)} style={{ width:"100%", marginTop:4, boxSizing:"border-box" }} /></div>
        ) : (
          <div><label className="fl">deadline</label><div style={{ marginTop:4, padding:"8px 12px", background:"var(--surface-2)", borderRadius:6, color:"var(--text-2)", fontSize:13, border:"1px solid var(--border)" }}>∞ Ongoing</div></div>
        )}
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:4 }}>
        <input type="checkbox" checked={draft.isOngoing||false} onChange={e => set("isOngoing",e.target.checked)} id="cb_ongoing" />
        <label htmlFor="cb_ongoing" style={{ fontSize:13, color:"var(--text-2)" }}>Continuous Product (No Deadline)</label>
      </div>
      <div><label className="fl" style={{ marginTop:12 }}>client portal password (optional)</label><input type="text" value={draft.portalPassword||""} onChange={e => set("portalPassword",e.target.value)} placeholder="give this to client to login" style={{ width:"100%", marginTop:4, boxSizing:"border-box" }} /></div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
        <div><label className="fl">est. days</label><input type="number" min={1} value={draft.estimatedDays} onChange={e => set("estimatedDays",parseInt(e.target.value)||1)} style={{ width:"100%", marginTop:4, boxSizing:"border-box" }} /></div>
        <div><label className="fl">priority</label><select value={draft.priority} onChange={e => set("priority",e.target.value)} style={{ width:"100%", marginTop:4, boxSizing:"border-box" }}><option value="low">low</option><option value="medium">medium</option><option value="high">high</option></select></div>
        <div><label className="fl">status</label><select value={draft.status} onChange={e => set("status",e.target.value)} style={{ width:"100%", marginTop:4, boxSizing:"border-box" }}><option value="planning">planning</option><option value="in_progress">in progress</option><option value="review">review</option><option value="delivered">delivered</option></select></div>
      </div>
      <div><label className="fl">owner</label><select value={draft.ownerId} onChange={e => set("ownerId",e.target.value)} style={{ width:"100%", marginTop:4, boxSizing:"border-box" }}>{users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
      <div><label className="fl">color</label>
        <div style={{ marginTop:8, display:"flex", gap:8 }}>
          {PALETTE.map(p => (
            <button key={p.name} onClick={() => set("color",p.name)} style={{ width:32, height:32, borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", background:p.bg, border:`2px solid ${draft.color===p.name?p.ring:"transparent"}`, cursor:"pointer" }}>
              <div style={{ width:12, height:12, borderRadius:2, background:p.ring }} />
            </button>
          ))}
        </div>
      </div>
      <div><label className="fl">members</label>
        <div style={{ marginTop:8, display:"flex", flexWrap:"wrap", gap:6 }}>
          {employees.map(e => {
            const on = draft.memberIds.includes(e.id);
            return (
              <button key={e.id} onClick={() => toggleMember(e.id)} style={{ display:"flex", alignItems:"center", gap:6, padding:"4px 8px", borderRadius:6, fontSize:12, cursor:"pointer", background: on?"rgba(245,166,35,.15)":"var(--surface-2)", border:`1px solid ${on?"var(--amber)":"var(--border)"}`, color: on?"var(--amber)":"var(--text)" }}>
                <div style={{ width:16, height:16, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:500, background:"var(--surface-3)", color:"var(--text)" }}>{e.name[0]}</div>
                {e.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function NewProjectModal({ open, onClose, employees, users, onCreate }) {
  const [draft, setDraft] = useState(null);
  useEffect(() => {
    if (open) setDraft({
      id:uid(), name:"", client:"", description:"",
      ownerId: users[0]?.id || "", memberIds:[],
      startDate:today(), deadline:toISO(addDays(new Date(),14)),
      estimatedDays:10, priority:"medium", status:"planning", color:"amber",
      isOngoing: false
    });
  }, [open]);
  
  if (!open || !draft) return null;
  const create = () => { if (!draft.name || !draft.client) return; onCreate(draft); onClose(); };
  return (
    <div style={{ position:"fixed", inset:0, zIndex:50, display:"flex", alignItems:"center", justifyContent:"center", padding:24, background:"rgba(0,0,0,.6)" }} onClick={onClose}>
      <div className="fade-in" style={{ width:"100%", maxWidth:480, borderRadius:8, background:"var(--bg)", border:"1px solid var(--border)" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding:"16px 24px", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <span className="font-display" style={{ fontWeight:600, fontSize:15 }}>new project</span>
          <button className="btn btn-ghost" onClick={onClose}><X style={{ width:16, height:16 }} /></button>
        </div>
        <div style={{ padding:24, maxHeight:"70vh", overflowY:"auto" }}>
          <ProjectEditor draft={draft} setDraft={setDraft} employees={employees} users={users} />
        </div>
        <div style={{ padding:"16px 24px", borderTop:"1px solid var(--border)", display:"flex", justifyContent:"flex-end", gap:8 }}>
          <button className="btn btn-secondary" onClick={onClose}>cancel</button>
          <button className="btn btn-primary" onClick={create} disabled={!draft.name||!draft.client}><Plus style={{ width:14, height:14 }} /> create</button>
        </div>
      </div>
    </div>
  );
}

export function TaskModal({ open, initial, projects, modules, employees, users, allTasks = [], taskComments = [], account, onClose, onCreate, onUpdate, onCreateComment, onUpdateComment }) {
  const isEdit = !!(initial && initial.id && initial.title);
  const [draft, setDraft] = useState(null);
  const [tab, setTab] = useState("technical");
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [breakdown, setBreakdown] = useState([]);

  useEffect(() => {
    if (!open) return;
    setShowBreakdown(false); setBreakdown([]);
    if (isEdit) {
      setDraft({...initial});
    } else {
      setDraft({
        id:uid(), projectId: initial?.projectId || projects[0]?.id || "",
        moduleId: initial?.moduleId || "", title:"", description:"",
        assigneeId: employees[0]?.id || "", priority:"medium", status:"todo",
        deadline: toISO(addDays(new Date(), 7)), estimatedHours: 4,
      });
    }
  }, [open, initial?.id]);

  if (!open || !draft) return null;
  const set = (k,v) => setDraft({...draft,[k]:v});
  const projectModules = modules.filter(m => m.projectId === draft.projectId);
  const targetProject = projects.find(p => p.id === draft.projectId);

  const suggest = () => { if (!draft.title) return; setBreakdown(suggestTaskBreakdown(draft.title)); setShowBreakdown(true); };
  const acceptBreakdown = () => {
    const parent = {...draft, id: uid()};
    onCreate(parent);
    breakdown.forEach((sub, i) => {
      onCreate({
        ...parent, id: uid(), title: sub,
        deadline: toISO(addDays(fromISO(draft.deadline), -Math.floor((breakdown.length-i)*0.5))),
      });
    });
    onClose();
  };
  
  const submit = () => {
    if (!draft.title || !draft.projectId) return;
    if (targetProject && draft.deadline > targetProject.deadline) {
      draft.deadline = targetProject.deadline;
    }
    if (isEdit) onUpdate(draft); else onCreate(draft);
    onClose();
  };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:50, display:"flex", alignItems:"center", justifyContent:"center", padding:24, background:"rgba(0,0,0,.6)" }} onClick={onClose}>
      <div className="fade-in" style={{ width:"100%", maxWidth:440, borderRadius:8, background:"var(--bg)", border:"1px solid var(--border)" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding:"16px 24px", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <span className="font-display" style={{ fontWeight:600, fontSize:15 }}>{isEdit?"edit task":"new task"}</span>
          <button className="btn btn-ghost" onClick={onClose}><X style={{ width:16, height:16 }} /></button>
        </div>
        <div style={{ padding:24, maxHeight:"70vh", overflowY:"auto", display:"flex", flexDirection:"column", gap:12 }}>
          <div style={{ display:"flex", gap:16, borderBottom:"1px solid var(--border)", marginBottom:12 }}>
            <button type="button" onClick={() => setTab("technical")} style={{ paddingBottom:8, background:"none", border:"none", borderBottom:`2px solid ${tab==="technical"?"var(--amber)":"transparent"}`, color:tab==="technical"?"var(--amber)":"var(--text-2)", fontWeight:tab==="technical"?500:400, cursor:"pointer" }}>technical</button>
            <button type="button" onClick={() => setTab("client")} style={{ paddingBottom:8, background:"none", border:"none", borderBottom:`2px solid ${tab==="client"?"var(--blue)":"transparent"}`, color:tab==="client"?"var(--blue)":"var(--text-2)", fontWeight:tab==="client"?500:400, cursor:"pointer" }}>client portal</button>
            {isEdit && (
              <button type="button" onClick={() => setTab("issues")} style={{ paddingBottom:8, background:"none", border:"none", borderBottom:`2px solid ${tab==="issues"?"var(--red)":"transparent"}`, color:tab==="issues"?"var(--red)":"var(--text-2)", fontWeight:tab==="issues"?500:400, cursor:"pointer" }}>issues & subtasks</button>
            )}
          </div>

          {tab === "technical" ? (
            <>
              <div><label className="fl">title</label><input value={draft.title} onChange={e => set("title",e.target.value)} placeholder="what needs to happen?" style={{ width:"100%", marginTop:4, boxSizing:"border-box" }} autoFocus /></div>
              <div><label className="fl">description</label><textarea value={draft.description||""} onChange={e => set("description",e.target.value)} rows={2} style={{ width:"100%", marginTop:4, boxSizing:"border-box", resize:"none" }} /></div>
            </>
          ) : tab === "client" ? (
            <>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                <input type="checkbox" checked={draft.isClientVisible||false} onChange={e => set("isClientVisible",e.target.checked)} id="cb_visible" />
                <label htmlFor="cb_visible" style={{ fontSize:13 }}>visible to client in portal</label>
              </div>
              <div style={{ opacity: draft.isClientVisible ? 1 : 0.5, pointerEvents: draft.isClientVisible ? "auto" : "none" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                  <label className="fl">client-facing title</label>
                  <button type="button" onClick={() => { set("clientTitle", draft.title); set("clientDescription", "We are working on this update."); }} style={{ background:"none", border:"none", color:"var(--blue)", fontSize:11, cursor:"pointer", display:"flex", alignItems:"center", gap:4 }}><Wand2 style={{width:12,height:12}}/> auto-generate</button>
                </div>
                <input value={draft.clientTitle||""} onChange={e => set("clientTitle",e.target.value)} placeholder="e.g. Updating User Profiles" style={{ width:"100%", marginBottom:12, boxSizing:"border-box" }} />
                
                <label className="fl">client description</label>
                <textarea value={draft.clientDescription||""} onChange={e => set("clientDescription",e.target.value)} rows={2} style={{ width:"100%", marginTop:4, boxSizing:"border-box", resize:"none" }} />
              </div>
            </>
          ) : (
            <TaskIssuesTab draft={draft} allTasks={allTasks} taskComments={taskComments} account={account} onCreate={onCreate} onCreateComment={onCreateComment} onUpdateComment={onUpdateComment} />
          )}          
          
          {tab !== "issues" && (
            <>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div><label className="fl">project</label><select value={draft.projectId} onChange={e => set("projectId",e.target.value)} style={{ width:"100%", marginTop:4, boxSizing:"border-box" }}>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div><label className="fl">module</label><select value={draft.moduleId||""} onChange={e => set("moduleId",e.target.value||null)} style={{ width:"100%", marginTop:4, boxSizing:"border-box" }}><option value="">— none —</option>{projectModules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div><label className="fl">assignee</label><select value={draft.assigneeId} onChange={e => set("assigneeId",e.target.value)} style={{ width:"100%", marginTop:4, boxSizing:"border-box" }}><optgroup label="admins">{users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</optgroup><optgroup label="team">{employees.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</optgroup></select></div>
            <div><label className="fl">deadline</label><input type="date" value={draft.deadline} onChange={e => set("deadline",e.target.value)} max={targetProject?.deadline} style={{ width:"100%", marginTop:4, boxSizing:"border-box" }} /></div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
            <div><label className="fl">priority</label><select value={draft.priority} onChange={e => set("priority",e.target.value)} style={{ width:"100%", marginTop:4, boxSizing:"border-box" }}><option value="low">low</option><option value="medium">medium</option><option value="high">high</option></select></div>
            <div><label className="fl">status</label><select value={draft.status} onChange={e => set("status",e.target.value)} style={{ width:"100%", marginTop:4, boxSizing:"border-box" }}><option value="todo">todo</option><option value="in_progress">in progress</option><option value="review">review</option><option value="done">done</option></select></div>
            <div><label className="fl">est. hours</label><input type="number" min={1} value={draft.estimatedHours} onChange={e => set("estimatedHours",parseInt(e.target.value)||1)} style={{ width:"100%", marginTop:4, boxSizing:"border-box" }} /></div>
          </div>
          {!isEdit && (
            <div style={{ paddingTop:8 }}>
              {!showBreakdown ? (
                <button onClick={suggest} disabled={!draft.title} className="btn btn-secondary" style={{ width:"100%", justifyContent:"center" }}>
                  <Wand2 style={{ width:14, height:14 }} /> suggest breakdown
                </button>
              ) : (
                <div style={{ padding:12, borderRadius:6, background:"rgba(74,158,255,.06)", border:"1px solid rgba(74,158,255,.3)" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                    <Wand2 style={{ width:14, height:14, color:"var(--blue)" }} />
                    <span className="fl" style={{ color:"var(--blue)" }}>suggested subtasks</span>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:4, marginBottom:12 }}>
                    {breakdown.map((b,i) => (
                      <div key={i} style={{ display:"flex", alignItems:"center", gap:8, fontSize:12 }}>
                        <div style={{ width:4, height:4, borderRadius:2, background:"var(--blue)" }} />{b}
                      </div>
                    ))}
                  </div>
                  <div style={{ display:"flex", gap:8 }}>
                    <button className="btn btn-primary" onClick={acceptBreakdown}><Check style={{ width:14, height:14 }} /> create all</button>
                    <button className="btn btn-secondary" onClick={() => setShowBreakdown(false)}>dismiss</button>
                  </div>
                </div>
              )}
            </div>
          )}
            </>
          )}
        </div>
        <div style={{ padding:"16px 24px", borderTop:"1px solid var(--border)", display:"flex", justifyContent:"flex-end", gap:8 }}>
          <button className="btn btn-secondary" onClick={onClose}>cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={!draft.title||!draft.projectId}>
            {isEdit ? <><Check style={{ width:14, height:14 }} /> save</> : <><Plus style={{ width:14, height:14 }} /> create</>}
          </button>
        </div>
      </div>
    </div>
  );
}

export function NewEmployeeModal({ open, onClose, onCreate }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("Developer");
  const [skills, setSkills] = useState("");
  
  useEffect(() => { if (open) { setName(""); setRole("Developer"); setSkills(""); } }, [open]);
  
  if (!open) return null;
  const create = () => { if (!name) return; onCreate({ id:uid(), name:name.trim(), role, skills:skills.split(",").map(s=>s.trim()).filter(Boolean) }); onClose(); };
  
  return (
    <div style={{ position:"fixed", inset:0, zIndex:50, display:"flex", alignItems:"center", justifyContent:"center", padding:24, background:"rgba(0,0,0,.6)" }} onClick={onClose}>
      <div className="fade-in" style={{ width:"100%", maxWidth:400, borderRadius:8, background:"var(--bg)", border:"1px solid var(--border)" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding:"16px 24px", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <span className="font-display" style={{ fontWeight:600, fontSize:15 }}>add employee</span>
          <button className="btn btn-ghost" onClick={onClose}><X style={{ width:16, height:16 }} /></button>
        </div>
        <div style={{ padding:24, display:"flex", flexDirection:"column", gap:12 }}>
          <div><label className="fl">name</label><input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. rahul" style={{ width:"100%", marginTop:4, boxSizing:"border-box" }} autoFocus /></div>
          <div><label className="fl">role</label><select value={role} onChange={e => setRole(e.target.value)} style={{ width:"100%", marginTop:4, boxSizing:"border-box" }}><option>Developer</option><option>Designer</option><option>PM</option><option>Ops</option><option>Marketing</option></select></div>
          <div><label className="fl">skills (comma-separated)</label><input value={skills} onChange={e => setSkills(e.target.value)} placeholder="e.g. frontend, react" style={{ width:"100%", marginTop:4, boxSizing:"border-box" }} /></div>
        </div>
        <div style={{ padding:"16px 24px", borderTop:"1px solid var(--border)", display:"flex", justifyContent:"flex-end", gap:8 }}>
          <button className="btn btn-secondary" onClick={onClose}>cancel</button>
          <button className="btn btn-primary" onClick={create} disabled={!name.trim()}><Plus style={{ width:14, height:14 }} /> add</button>
        </div>
      </div>
    </div>
  );
}

export function TaskIssuesTab({ draft, allTasks, taskComments, account, onCreate, onCreateComment, onUpdateComment }) {
  const [commentText, setCommentText] = useState("");
  const [isIssue, setIsIssue] = useState(false);
  const [subTaskTitle, setSubTaskTitle] = useState("");
  const [subTaskType, setSubTaskType] = useState("task");

  const myComments = taskComments.filter(c => c.taskId === draft.id).sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));
  const subTasks = allTasks.filter(t => t.parentId === draft.id);

  const handlePostComment = () => {
    if (!commentText.trim()) return;
    onCreateComment({
      id: uid(),
      taskId: draft.id,
      authorId: account.id,
      text: commentText.trim(),
      isIssue,
      status: isIssue ? 'open' : 'closed',
      createdAt: new Date().toISOString()
    });
    setCommentText("");
    setIsIssue(false);
  };

  const handleResolveIssue = (c) => {
    onUpdateComment({ ...c, status: 'resolved' });
  };

  const handleCreateSubTask = () => {
    if (!subTaskTitle.trim()) return;
    onCreate({
      id: uid(),
      parentId: draft.id,
      projectId: draft.projectId,
      title: subTaskTitle.trim(),
      taskType: subTaskType,
      status: 'todo',
      priority: draft.priority,
      assigneeId: account.id,
      deadline: draft.deadline,
      estimatedHours: 1
    });
    setSubTaskTitle("");
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Sub-tasks Section */}
      <div>
        <h4 style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <CornerDownRight size={14} /> Sub-tasks & Dependencies
        </h4>
        
        {subTasks.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            {subTasks.map(st => (
              <div key={st.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6 }}>
                {st.taskType === 'bug' ? <Bug size={14} color="var(--red)" /> : <Code size={14} color="var(--blue)" />}
                <span style={{ fontSize: 13, flex: 1, textDecoration: st.status === 'done' ? 'line-through' : 'none', color: st.status === 'done' ? 'var(--text-3)' : 'var(--text)' }}>
                  {st.title}
                </span>
                <span className="font-mono" style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'var(--surface-3)', color: 'var(--text-2)' }}>
                  {st.status.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <select value={subTaskType} onChange={e => setSubTaskType(e.target.value)} style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)' }}>
            <option value="task">Sub-task</option>
            <option value="bug">Bug Fix</option>
            <option value="improvement">Improvement</option>
          </select>
          <input 
            value={subTaskTitle} onChange={e => setSubTaskTitle(e.target.value)} 
            placeholder="Add a new sub-task..." 
            style={{ flex: 1, padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)' }}
            onKeyDown={e => e.key === 'Enter' && handleCreateSubTask()}
          />
          <button type="button" className="btn btn-secondary" onClick={handleCreateSubTask} disabled={!subTaskTitle.trim()} style={{ padding: '6px 12px' }}>
            <Plus size={14} />
          </button>
        </div>
      </div>

      <div style={{ height: 1, background: 'var(--border)' }} />

      {/* Issues & Discussion Section */}
      <div>
        <h4 style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <MessageSquareWarning size={14} /> Internal Discussion & Issues
        </h4>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 200, overflowY: 'auto', marginBottom: 12 }}>
          {myComments.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', padding: 24, background: 'var(--surface)', borderRadius: 8 }}>
              No comments or issues reported for this task yet.
            </div>
          ) : (
            myComments.map(c => (
              <div key={c.id} style={{ display: 'flex', gap: 12, padding: 12, background: c.isIssue ? (c.status === 'resolved' ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)') : 'var(--surface)', border: `1px solid ${c.isIssue ? (c.status === 'resolved' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.3)') : 'var(--border)'}`, borderRadius: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{c.authorId}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{new Date(c.createdAt).toLocaleDateString()}</span>
                    {c.isIssue && (
                      <span className="font-mono" style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: c.status === 'resolved' ? 'var(--green)' : 'var(--red)', color: 'white' }}>
                        {c.status === 'resolved' ? 'RESOLVED' : 'ISSUE'}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text-2)', whiteSpace: 'pre-wrap' }}>
                    {c.text}
                  </p>
                </div>
                {c.isIssue && c.status === 'open' && (
                  <button type="button" onClick={() => handleResolveIssue(c)} className="btn btn-ghost" style={{ alignSelf: 'flex-start', color: 'var(--green)', fontSize: 11, padding: '4px 8px' }}>
                    <CheckCircle2 size={12} style={{ marginRight: 4 }} /> Resolve
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <textarea 
            value={commentText} onChange={e => setCommentText(e.target.value)} 
            placeholder="Add a comment or report a technical problem..." 
            rows={2} 
            style={{ width: '100%', resize: 'none', padding: 12, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', boxSizing: 'border-box' }} 
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--amber)', cursor: 'pointer' }}>
              <input type="checkbox" checked={isIssue} onChange={e => setIsIssue(e.target.checked)} />
              <AlertTriangle size={12} /> Flag as blocking issue
            </label>
            <button type="button" className="btn btn-primary" onClick={handlePostComment} disabled={!commentText.trim()}>
              Post
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
