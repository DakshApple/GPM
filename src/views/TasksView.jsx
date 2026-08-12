import React, { useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Topbar } from '../components/layout';
import { taskStatusMeta, priorityMeta, colorFor, PALETTE } from '../utils/constants';
import { isPast, fmtDate } from '../utils/date';

export function TasksView({ tasks, projects, employees, users, currentUser, openTaskById, onNewTask, onAdvanceTask, onUpdateTaskStatus }) {
  const [fAssignee, setFAssignee] = useState("all");
  const [fProject, setFProject] = useState("all");
  const [fStatus, setFStatus] = useState("open");
  const [q, setQ] = useState("");
  const [layout, setLayout] = useState("kanban"); // default to Kanban now!
  const all = [...users, ...employees];

  const filtered = tasks.filter(t => {
    if (fAssignee==="me" && t.assigneeId !== currentUser.id) return false;
    if (fAssignee!=="me" && fAssignee!=="all" && t.assigneeId !== fAssignee) return false;
    if (fProject!=="all" && t.projectId !== fProject) return false;
    if (fStatus==="open" && t.status==="done") return false;
    if (fStatus==="done" && t.status!=="done") return false;
    if (q && !t.title.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }).sort((a,b) => a.deadline.localeCompare(b.deadline));

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;
    if (source.droppableId !== destination.droppableId) {
      if (onUpdateTaskStatus) {
        onUpdateTaskStatus(draggableId, destination.droppableId);
      }
    }
  };

  return (
    <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column" }}>
      <Topbar title="tasks" subtitle={`${tasks.filter(t=>t.status!=="done").length} open · ${tasks.filter(t=>t.status==="done").length} done`}
        actions={<>
          <div style={{ position:"relative" }}>
            <Search style={{ width:14, height:14, position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:"var(--text-3)" }} />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="search tasks..." style={{ paddingLeft:32, height:34 }} />
          </div>
          <div style={{ display:"flex", borderRadius:6, background:"var(--surface-2)", border:"1px solid var(--border)" }}>
            <button onClick={() => setLayout("list")} style={{ padding:"6px 10px", fontSize:11, borderRadius:6, background:layout==="list"?"var(--surface-3)":"transparent", color:layout==="list"?"var(--text)":"var(--text-2)", border:"none", cursor:"pointer" }}>list</button>
            <button onClick={() => setLayout("kanban")} style={{ padding:"6px 10px", fontSize:11, borderRadius:6, background:layout==="kanban"?"var(--surface-3)":"transparent", color:layout==="kanban"?"var(--text)":"var(--text-2)", border:"none", cursor:"pointer" }}>kanban</button>
          </div>
          <button className="btn btn-primary" onClick={() => onNewTask({})}><Plus style={{ width:14, height:14 }} /> task</button>
        </>}
      />
      <div style={{ padding:24 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16, flexWrap:"wrap" }}>
          <span className="fl">assignee:</span>
          <select value={fAssignee} onChange={e => setFAssignee(e.target.value)} style={{ fontSize:12, padding:"6px 8px" }}>
            <option value="all">all</option><option value="me">me</option>
            {all.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <span className="fl" style={{ marginLeft:8 }}>project:</span>
          <select value={fProject} onChange={e => setFProject(e.target.value)} style={{ fontSize:12, padding:"6px 8px" }}>
            <option value="all">all</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <span className="fl" style={{ marginLeft:8 }}>status:</span>
          <select value={fStatus} onChange={e => setFStatus(e.target.value)} style={{ fontSize:12, padding:"6px 8px" }}>
            <option value="open">open</option><option value="done">done</option><option value="all">all</option>
          </select>
        </div>

        {layout==="list" ? (
          <div style={{ borderRadius:8, overflow:"hidden", background:"var(--surface)", border:"1px solid var(--border)" }}>
            <div style={{ display:"grid", gridTemplateColumns:"24px 1fr 140px 110px 90px 70px", padding:"8px 16px", borderBottom:"1px solid var(--border)" }}>
              <div></div><div className="fl">task</div><div className="fl">project</div><div className="fl">assignee</div><div className="fl">deadline</div><div className="fl">priority</div>
            </div>
            {filtered.map(t => {
              const p = projects.find(x => x.id === t.projectId);
              const c = p ? colorFor(p.color) : PALETTE[0];
              const assignee = all.find(a => a.id === t.assigneeId);
              const sMeta = taskStatusMeta[t.status]; const SIcon = sMeta.icon;
              const pMeta = priorityMeta[t.priority];
              return (
                <div key={t.id} style={{ display:"grid", gridTemplateColumns:"24px 1fr 140px 110px 90px 70px", padding:"10px 16px", alignItems:"center", borderBottom:"1px solid var(--border)" }}>
                  <button onClick={() => { if(t.status!=="done") onAdvanceTask(t.id); }} style={{ background:"none", border:"none", cursor:t.status!=="done"?"pointer":"default", padding:0 }}><SIcon style={{ width:14, height:14, color:sMeta.color }} /></button>
                  <button onClick={() => openTaskById(t.id)} style={{ textAlign:"left", fontSize:13, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", background:"none", border:"none", cursor:"pointer", color:"var(--text)" }}>{t.title}</button>
                  <div style={{ display:"flex", alignItems:"center", gap:6, minWidth:0 }}>
                    <div style={{ width:6, height:6, borderRadius:2, background:c.ring, flexShrink:0 }} />
                    <span style={{ fontSize:11, color:"var(--text-2)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p?.name||"—"}</span>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    {assignee && <><div style={{ width:16, height:16, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:500, background:"var(--surface-3)" }}>{assignee.name[0]}</div>
                    <span style={{ fontSize:11, color:"var(--text-2)" }}>{assignee.name.split(" ")[0]}</span></>}
                  </div>
                  <div className="font-mono" style={{ fontSize:11, color: (!p?.isOngoing && isPast(t.deadline)&&t.status!=="done")?"var(--red)":"var(--text-2)" }}>
                    {p?.isOngoing ? "∞" : fmtDate(t.deadline)}
                  </div>
                  <span className="font-mono" style={{ fontSize:10, padding:"2px 6px", borderRadius:4, background:pMeta.bg, color:pMeta.color, display:"inline-block", width:"fit-content" }}>{pMeta.label}</span>
                </div>
              );
            })}
            {filtered.length===0 && <div style={{ padding:"64px 0", textAlign:"center", fontSize:13, color:"var(--text-2)" }}>no tasks match.</div>}
          </div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
              {["todo","in_progress","review","done"].map(col => {
                const meta = taskStatusMeta[col]; const Icon = meta.icon;
                const list = filtered.filter(t => t.status === col);
                return (
                  <Droppable key={col} droppableId={col}>
                    {(provided, snapshot) => (
                      <div 
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        style={{ 
                          borderRadius:8, padding:8, background: snapshot.isDraggingOver ? "var(--surface-3)" : "var(--surface)", 
                          border:"1px solid var(--border)", minHeight:400, transition: "background 0.2s" 
                        }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 8px", marginBottom:8 }}>
                          <Icon style={{ width:12, height:12, color:meta.color }} />
                          <span className="fl" style={{ color:meta.color }}>{meta.label}</span>
                          <span className="font-mono" style={{ fontSize:10, color:"var(--text-3)", marginLeft:"auto" }}>{list.length}</span>
                        </div>
                        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                          {list.map((t, index) => {
                            const p = projects.find(x => x.id === t.projectId);
                            const c = p ? colorFor(p.color) : PALETTE[0];
                            const assignee = all.find(a => a.id === t.assigneeId);
                            const pMeta = priorityMeta[t.priority];
                            return (
                              <Draggable key={t.id} draggableId={t.id} index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    style={{
                                      width:"100%", textAlign:"left", padding:12, borderRadius:6, 
                                      background: snapshot.isDragging ? "var(--surface-3)" : "var(--surface-2)", 
                                      border:`1px solid ${snapshot.isDragging ? "var(--amber)" : "var(--border)"}`, 
                                      cursor:"grab", color:"var(--text)", ...provided.draggableProps.style,
                                      boxShadow: snapshot.isDragging ? "0 8px 24px rgba(0,0,0,0.15)" : "none"
                                    }}
                                  >
                                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                                      <span className="font-mono" style={{ fontSize:9, padding:"2px 4px", borderRadius:4, background:pMeta.bg, color:pMeta.color }}>{pMeta.label}</span>
                                      <button onClick={(e) => { e.stopPropagation(); openTaskById(t.id); }} style={{ background:"none", border:"none", fontSize:11, color:"var(--blue)", cursor:"pointer" }}>edit</button>
                                    </div>
                                    <div style={{ fontSize:13, fontWeight:500, marginBottom:8, lineHeight:1.4 }}>{t.title}</div>
                                    <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:10, color:"var(--text-3)" }} className="font-mono">
                                      <div style={{ width:8, height:8, borderRadius:4, background:c.ring, flexShrink:0 }} />
                                      <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1 }}>{p?.name}</span>
                                      {assignee && <span style={{ background:"var(--surface-3)", padding:"2px 6px", borderRadius:10 }}>{assignee.name.split(" ")[0]}</span>}
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            );
                          })}
                          {provided.placeholder}
                        </div>
                      </div>
                    )}
                  </Droppable>
                );
              })}
            </div>
          </DragDropContext>
        )}
      </div>
    </div>
  );
}
