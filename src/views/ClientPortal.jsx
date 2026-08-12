import React, { useState, useEffect } from 'react';
import { Search, ChevronRight, CheckCircle2, MessageSquare, Plus, ArrowRight, Shield, FolderKanban, Clock, Download, ExternalLink, FileText } from 'lucide-react';
import { api } from '../services/db';
import { uid, toISO, addDays, today, fmtDate, daysBetween } from '../utils/date';
import { taskStatusMeta } from '../utils/constants';
import { mail } from '../services/mail';

export function ClientLogin({ onLogin }) {
  const [email, setEmail] = useState("");
  const [projectId, setProjectId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setError(""); setBusy(true);
    try {
      const projects = await api.getTable('gpm_projects');
      const p = projects.find(x => x.id === projectId.trim() || x.name.toLowerCase() === projectId.trim().toLowerCase());
      if (!p) { setError("project not found."); setBusy(false); return; }
      if (p.portalPassword && p.portalPassword !== password) { setError("incorrect password."); setBusy(false); return; }
      
      // Save client email if provided and different
      if (email && email !== p.clientEmail) {
        await api.upsertRow('gpm_projects', { ...p, clientEmail: email });
        p.clientEmail = email; // Update local state copy
      }
      
      localStorage.setItem("gpm:client_session", JSON.stringify({ projectId: p.id, expiresAt: Date.now() + 86400000 }));
      onLogin(p);
    } catch(err) {
      setError("connection error.");
    }
    setBusy(false);
  };

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#0A0A0B" }}>
      <div className="fade-in" style={{ width:"100%", maxWidth:400, padding:32 }}>
        <div style={{ height: 80, display:"flex", alignItems:"center", overflow:"hidden", justifyContent:"center", marginBottom:32 }}>
          <img src="/genartml-logo.png" alt="Genartml" style={{ width: 240, height: 240, objectFit: "contain" }} />
        </div>
        <form onSubmit={submit} style={{ display:"flex", flexDirection:"column", gap:12, background:"#141415", padding:24, borderRadius:12, border:"1px solid #2A2A2E" }}>
          <h2 className="font-display" style={{ fontSize:18, fontWeight:500, color:"#fff", margin:0, marginBottom:8 }}>Welcome Back</h2>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email Address" style={{ width:"100%", boxSizing:"border-box", background:"#1E1E22", border:"1px solid #333", color:"#fff" }} required />
          <input value={projectId} onChange={e => setProjectId(e.target.value)} placeholder="Project ID or Name" style={{ width:"100%", boxSizing:"border-box", background:"#1E1E22", border:"1px solid #333", color:"#fff" }} required />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password (if set)" style={{ width:"100%", boxSizing:"border-box", background:"#1E1E22", border:"1px solid #333", color:"#fff" }} />
          {error && <div style={{ fontSize:12, color:"#F87171", padding:"8px 12px", background:"rgba(248,113,113,.1)", borderRadius:6 }}>{error}</div>}
          <button type="submit" disabled={busy} className="btn" style={{ width:"100%", justifyContent:"center", background:"#fff", color:"#000", fontWeight:500, marginTop:8 }}>
            {busy ? "Authenticating..." : "View Project"}
          </button>
        </form>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginTop:24, color:"#666" }}>
          <Shield style={{ width:14, height:14 }} />
          <span style={{ fontSize:11 }}>Secure client access</span>
        </div>
      </div>
    </div>
  );
}

export function ClientPortal({ project, onLogout }) {
  const [tasks, setTasks] = useState([]);
  const [modules, setModules] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [deliverables, setDeliverables] = useState([]);
  const [ticketDraft, setTicketDraft] = useState({ message:"", priority:"medium", deadline:"" });
  const [showTicket, setShowTicket] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const fetchData = async () => {
    const t = await api.getTable('gpm_tasks');
    setTasks(t.filter(x => x.projectId === project.id && x.isClientVisible));
    const m = await api.getTable('gpm_modules');
    setModules(m.filter(x => x.projectId === project.id).sort((a,b) => a.order - b.order));
    const tk = await api.getTable('gpm_tickets');
    setTickets(tk.filter(x => x.projectId === project.id));
    const deliv = await api.getTable('gpm_deliverables');
    setDeliverables(deliv.filter(x => x.projectId === project.id).reverse());
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3 * 60 * 1000);
    return () => clearInterval(interval);
  }, [project.id]);

  const openTicketModal = (tk = null) => {
    if (tk) {
      setTicketDraft({ id: tk.id, message: tk.message, priority: tk.priority, deadline: tk.deadline || "" });
    } else {
      setTicketDraft({ id: null, message:"", priority:"medium", deadline:"" });
    }
    setShowTicket(true);
  };

  const submitTicket = async () => {
    if (!ticketDraft.message.trim()) return;
    
    if (ticketDraft.id) {
      const existing = tickets.find(t => t.id === ticketDraft.id);
      const tk = { ...existing, message: ticketDraft.message.trim(), priority: ticketDraft.priority, deadline: ticketDraft.deadline || null, isEdited: true };
      await api.upsertRow('gpm_tickets', tk);
      setTickets(tickets.map(t => t.id === ticketDraft.id ? tk : t));
    } else {
      const tkId = `REQ-${Math.floor(1000 + Math.random() * 9000)}`;
      const tk = { id: tkId, projectId: project.id, message: ticketDraft.message.trim(), priority: ticketDraft.priority, deadline: ticketDraft.deadline || null, status: 'open', isEdited: false, createdAt: new Date().toISOString() };
      await api.upsertRow('gpm_tickets', tk);
      setTickets([...tickets, tk]);
      if (project.clientEmail) {
        mail.sendTicketAcknowledgement(project.clientEmail, tkId, tk.message, project.name);
      }
      mail.sendTeamNotification(tkId, tk.message, project.name, tk.priority, tk.deadline);
    }
    
    setTicketDraft({ id: null, message:"", priority:"medium", deadline:"" });
    setShowTicket(false);
  };

  const doneTasks = tasks.filter(t => t.status === "done");
  const progress = tasks.length ? Math.round((doneTasks.length / tasks.length) * 100) : 0;
  
  // Weekly Summaries
  const lastWeekDate = new Date(); lastWeekDate.setDate(lastWeekDate.getDate() - 7);
  const thisWeekTasks = doneTasks.filter(t => t.completedAt && new Date(t.completedAt) > lastWeekDate);

  return (
    <div style={{ minHeight:"100vh", background:"#0A0A0B", color:"#EDEDED", fontFamily:"var(--font-sans)" }}>
      {/* Navbar */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"20px 48px", borderBottom:"1px solid #1F1F22", background:"rgba(10,10,11,0.8)", backdropFilter:"blur(12px)", position:"sticky", top:0, zIndex:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ height: 60, display:"flex", alignItems:"center", overflow:"hidden", marginLeft: -16 }}>
            <img src="/genartml-logo.png" alt="Genartml" style={{ width: 180, height: 180, objectFit: "contain" }} />
          </div>
          <div>
            <div className="font-display" style={{ fontWeight:600, fontSize:15 }}>{project.client}</div>
            <div style={{ fontSize:11, color:"#888" }}>Client Portal</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:32, alignItems:"center" }}>
          <div style={{ display:"flex", gap:24 }}>
            <button onClick={()=>setActiveTab("overview")} style={{ background:"none", border:"none", color:activeTab==="overview"?"#fff":"#888", cursor:"pointer", fontSize:14, fontWeight:500 }}>Dashboard</button>
            <button onClick={()=>setActiveTab("roadmap")} style={{ background:"none", border:"none", color:activeTab==="roadmap"?"#fff":"#888", cursor:"pointer", fontSize:14, fontWeight:500 }}>Roadmap</button>
            <button onClick={()=>setActiveTab("vault")} style={{ background:"none", border:"none", color:activeTab==="vault"?"#fff":"#888", cursor:"pointer", fontSize:14, fontWeight:500 }}>Vault {deliverables.length>0&&<span style={{background:"#2A2A2E",color:"#fff",padding:"2px 6px",borderRadius:4,fontSize:10,marginLeft:4}}>{deliverables.length}</span>}</button>
          </div>
          <div style={{ width:1, height:24, background:"#2A2A2E" }} />
          <div style={{ display:"flex", gap:16, alignItems:"center" }}>
            <button onClick={() => setShowTicket(true)} className="btn" style={{ background:"#F5A623", color:"#1A0F00", border:"none", fontWeight:500 }}>
              <Plus style={{ width:14, height:14 }} /> New Request
            </button>
            <button onClick={onLogout} style={{ background:"none", border:"none", color:"#888", cursor:"pointer", fontSize:13 }}>Sign Out</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:900, margin:"0 auto", padding:"48px 24px" }}>
        {/* Header */}
        <div className="fade-in" style={{ marginBottom:48 }}>
          <h1 className="font-display" style={{ fontSize:40, fontWeight:600, letterSpacing:"-0.02em", margin:0, color:"#fff" }}>{project.name}</h1>
          <p style={{ fontSize:16, color:"#888", marginTop:8 }}>{activeTab === "roadmap" ? "Interactive project timeline and milestones." : activeTab === "vault" ? "Your permanent project assets and deliverables." : "Track progress, view completed milestones, and request changes."}</p>
        </div>

        {activeTab === "overview" && (
          <>
            {/* Progress Ring / Dashboard */}
            <div className="fade-in" style={{ display:"flex", gap:24, marginBottom:48 }}>
              <div style={{ flex:1, padding:32, borderRadius:16, background:"#141415", border:"1px solid #2A2A2E", display:"flex", alignItems:"center", gap:32 }}>
                <div style={{ position:"relative", width:120, height:120, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <svg width="120" height="120" style={{ transform:"rotate(-90deg)" }}>
                    <circle cx="60" cy="60" r="54" fill="none" stroke="#2A2A2E" strokeWidth="8" />
                    {!project.isOngoing && (
                      <circle cx="60" cy="60" r="54" fill="none" stroke="#F5A623" strokeWidth="8" strokeDasharray="339" strokeDashoffset={339 - (339 * progress) / 100} style={{ transition:"stroke-dashoffset 1s ease" }} strokeLinecap="round" />
                    )}
                  </svg>
                  <div style={{ position:"absolute", textAlign:"center" }}>
                    <div className="font-display" style={{ fontSize: project.isOngoing?40:32, fontWeight:600, color:project.isOngoing?"#A3E635":"#fff" }}>{project.isOngoing ? "∞" : `${progress}%`}</div>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize:18, fontWeight:500, color:"#fff", marginBottom:4 }}>{project.isOngoing ? "Continuous Value" : "Project Completion"}</div>
                  <div style={{ fontSize:14, color:"#888" }}>
                    {project.isOngoing 
                      ? `${doneTasks.length} total tasks delivered to date.` 
                      : `${doneTasks.length} of ${tasks.length} client milestones achieved.`}
                  </div>
                </div>
              </div>
              <div style={{ width:300, padding:24, borderRadius:16, background:"#141415", border:"1px solid #2A2A2E", display:"flex", flexDirection:"column", justifyContent:"space-between" }}>
                <div>
                  <div style={{ fontSize:12, color:"#888", marginBottom:4 }}>Status</div>
                  <div style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"4px 10px", borderRadius:20, background:project.isOngoing?"rgba(163,230,53,.1)":"rgba(245,166,35,.1)", color:project.isOngoing?"#A3E635":"#F5A623", fontSize:12, fontWeight:500, textTransform:"capitalize" }}>
                    <div style={{ width:6, height:6, borderRadius:3, background:"currentColor" }} /> {project.isOngoing ? "Ongoing Product" : project.status.replace("_"," ")}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize:12, color:"#888", marginBottom:4 }}>Target Delivery</div>
                  <div style={{ fontSize:16, color:project.isOngoing?"#A3E635":"#fff", fontWeight:500 }}>{project.isOngoing ? "∞ Continuous" : new Date(project.deadline).toLocaleDateString("en-US", { month:"long", day:"numeric", year:"numeric" })}</div>
                </div>
              </div>
            </div>

            {/* This Week / Updates */}
            <div className="fade-in" style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:32 }}>
              <div>
                {thisWeekTasks.length > 0 && (
                  <div style={{ marginBottom:48 }}>
                    <h3 className="font-display" style={{ fontSize:20, fontWeight:500, color:"#fff", marginBottom:16 }}>Value Delivered This Week</h3>
                    <div style={{ padding:24, borderRadius:16, background:"linear-gradient(145deg, #141415 0%, #1a1a1e 100%)", border:"1px solid #2A2A2E" }}>
                      <p style={{ fontSize:14, color:"#888", marginBottom:24 }}>Here is what our team has accomplished for you over the last 7 days.</p>
                      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                        {thisWeekTasks.map(t => (
                          <div key={t.id} style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
                            <CheckCircle2 style={{ width:16, height:16, color:"#A3E635", marginTop:2 }} />
                            <div>
                              <div style={{ fontSize:14, fontWeight:500, color:"#fff" }}>{t.clientTitle || t.title}</div>
                              {t.clientDescription && <div style={{ fontSize:13, color:"#888", marginTop:2 }}>{t.clientDescription}</div>}
                              <div style={{ fontSize:11, color:"#666", marginTop:4 }}>Completed {new Date(t.completedAt).toLocaleDateString()}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <h3 className="font-display" style={{ fontSize:20, fontWeight:500, color:"#fff", marginBottom:24 }}>Active Focus</h3>
                {tasks.filter(t => t.status === "in_progress" || t.status === "review").length === 0 ? (
                  <div style={{ padding:48, textAlign:"center", border:"1px dashed #2A2A2E", borderRadius:12, color:"#666" }}>No tasks currently in progress.</div>
                ) : (
                  <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                    {tasks.filter(t => t.status === "in_progress" || t.status === "review").map(t => (
                      <div key={t.id} style={{ padding:20, borderRadius:12, background:"rgba(74,158,255,.05)", border:"1px solid rgba(74,158,255,.3)", display:"flex", gap:16 }}>
                        <div style={{ paddingTop:2 }}><div style={{ width:18, height:18, borderRadius:9, border:"2px solid #4A9EFF", borderTopColor:"transparent", animation:"spin 1s linear infinite" }} /></div>
                        <div>
                          <div style={{ fontSize:16, fontWeight:500, color:"#fff", marginBottom:6 }}>{t.clientTitle || t.title}</div>
                          <div style={{ fontSize:14, color:"#888", lineHeight:1.5 }}>{t.clientDescription || "Update in progress..."}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-display" style={{ fontSize:20, fontWeight:500, color:"#fff", marginBottom:24 }}>Your Requests</h3>
                {tickets.length === 0 ? (
                  <div style={{ padding:32, textAlign:"center", border:"1px dashed #2A2A2E", borderRadius:12, color:"#666", fontSize:13 }}>No active requests.</div>
                ) : (
                  <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                    {tickets.map(tk => (
                      <div key={tk.id} style={{ padding:16, borderRadius:12, background:"#141415", border:"1px solid #2A2A2E" }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                          <div style={{ fontSize:13, color:"#fff", lineHeight:1.5 }}>"{tk.message}"</div>
                          {tk.status === "open" && (
                            <button onClick={() => openTicketModal(tk)} style={{ background:"transparent", border:"1px solid #333", color:"#888", borderRadius:4, padding:"2px 8px", fontSize:11, cursor:"pointer" }}>Edit</button>
                          )}
                        </div>
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                          <span style={{ fontSize:11, color:"#666" }}>{new Date(tk.createdAt).toLocaleDateString()}</span>
                          <span style={{ fontSize:11, padding:"2px 6px", borderRadius:4, background: tk.status==="resolved"?"rgba(163,230,53,.1)":"rgba(74,158,255,.1)", color: tk.status==="resolved"?"#A3E635":"#4A9EFF" }}>{tk.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === "roadmap" && (
          <div className="fade-in">
            {modules.length === 0 ? (
              <div style={{ padding:64, textAlign:"center", border:"1px dashed #2A2A2E", borderRadius:16, color:"#666" }}>Milestone roadmap not configured yet.</div>
            ) : (
              <div style={{ position:"relative", paddingLeft:24 }}>
                <div style={{ position:"absolute", left:6, top:0, bottom:0, width:2, background:"#1F1F22" }} />
                <div style={{ display:"flex", flexDirection:"column", gap:48 }}>
                  {modules.map((m, idx) => {
                    const mTasks = tasks.filter(t => t.moduleId === m.id);
                    const mDone = mTasks.filter(t => t.status === "done").length;
                    const isComplete = mTasks.length > 0 && mDone === mTasks.length;
                    const isNext = !isComplete && idx === modules.findIndex(x => {
                      const xt = tasks.filter(t => t.moduleId === x.id);
                      return xt.length===0 || xt.filter(t=>t.status==="done").length < xt.length;
                    });
                    
                    return (
                      <div key={m.id} style={{ position:"relative", opacity: isComplete ? 0.7 : 1 }}>
                        <div style={{ position:"absolute", left:-29, top:4, width:12, height:12, borderRadius:6, background: isComplete ? "#A3E635" : isNext ? "#4A9EFF" : "#2A2A2E", border:`3px solid #0A0A0B` }} />
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                          <div>
                            <div style={{ fontSize:12, color:isComplete?"#A3E635":isNext?"#4A9EFF":"#888", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:4 }}>Phase {m.order} {isNext && "— Active"}</div>
                            <div style={{ fontSize:24, fontWeight:500, color:isComplete?"#888":"#fff" }}>{m.name}</div>
                          </div>
                          <div style={{ textAlign:"right" }}>
                            <div style={{ fontSize:14, color:"#fff" }}>{project.isOngoing ? "—" : m.startDate ? `${fmtDate(m.startDate)} - ${fmtDate(m.deadline)}` : fmtDate(m.deadline)}</div>
                            <div style={{ fontSize:12, color:"#888", marginTop:4 }}>{mDone} of {mTasks.length} tasks</div>
                          </div>
                        </div>
                        <p style={{ fontSize:15, color:"#888", lineHeight:1.6, marginBottom:24, maxWidth:"80%" }}>{m.description}</p>
                        
                        {mTasks.length > 0 && (
                          <div style={{ display:"flex", flexDirection:"column", gap:12, padding:24, borderRadius:12, background:"#141415", border:"1px solid #1F1F22" }}>
                            {mTasks.map(t => (
                              <div key={t.id} style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
                                {t.status === "done" ? <CheckCircle2 style={{ width:16, height:16, color:"#A3E635", marginTop:2 }} /> : <div style={{ width:14, height:14, borderRadius:7, border:"2px solid #333", marginTop:2 }} />}
                                <div>
                                  <div style={{ fontSize:14, fontWeight:500, color:t.status==="done"?"#666":"#EDEDED", textDecoration:t.status==="done"?"line-through":"none" }}>{t.clientTitle || t.title}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "vault" && (
          <div className="fade-in">
            {deliverables.length === 0 ? (
              <div style={{ padding:64, textAlign:"center", border:"1px dashed #2A2A2E", borderRadius:16, color:"#666" }}>
                <FolderKanban style={{ width:48, height:48, margin:"0 auto", marginBottom:16, opacity:0.5 }} />
                <div>No deliverables have been shared with you yet.</div>
              </div>
            ) : (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap:24 }}>
                {deliverables.map(d => (
                  <a key={d.id} href={d.url} target="_blank" rel="noreferrer" style={{ textDecoration:"none", color:"inherit" }}>
                    <div style={{ padding:24, borderRadius:16, background:"#141415", border:"1px solid #2A2A2E", transition:"transform 0.2s, borderColor 0.2s", cursor:"pointer", ':hover': { borderColor: '#4A9EFF', transform:'translateY(-2px)' } }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
                        <div style={{ width:40, height:40, borderRadius:10, background:"rgba(74,158,255,.1)", color:"#4A9EFF", display:"flex", alignItems:"center", justifyContent:"center" }}>
                          {d.type === 'link' ? <ExternalLink style={{ width:20, height:20 }} /> : d.type === 'github' ? <Shield style={{ width:20, height:20 }} /> : d.type === 'doc' ? <FileText style={{ width:20, height:20 }} /> : <Download style={{ width:20, height:20 }} />}
                        </div>
                        <span style={{ fontSize:11, padding:"4px 8px", borderRadius:4, background:"#1E1E22", color:"#888" }}>{new Date(d.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div style={{ fontSize:16, fontWeight:500, color:"#fff", marginBottom:4 }}>{d.title}</div>
                      <div style={{ fontSize:13, color:"#888", textTransform:"capitalize" }}>{d.type} asset</div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Ticket Modal */}
      {showTicket && (
        <div style={{ position:"fixed", inset:0, zIndex:100, display:"flex", alignItems:"center", justifyContent:"center", padding:24, background:"rgba(0,0,0,.8)", backdropFilter:"blur(4px)" }} onClick={() => setShowTicket(false)}>
          <div className="scale-in" style={{ width:"100%", maxWidth:480, borderRadius:16, background:"#141415", border:"1px solid #2A2A2E", padding:32 }} onClick={e => e.stopPropagation()}>
            <h3 className="font-display" style={{ fontSize:24, fontWeight:500, color:"#fff", margin:0, marginBottom:8 }}>Request Change</h3>
            <p style={{ fontSize:14, color:"#888", marginBottom:24 }}>Describe what you need. This will alert the engineering team directly.</p>
            <textarea value={ticketDraft.message} onChange={e => setTicketDraft({...ticketDraft, message:e.target.value})} rows={4} placeholder="e.g. Could we update the hero image on the home page?" style={{ width:"100%", padding:12, borderRadius:8, background:"#0A0A0B", border:"1px solid #333", color:"#fff", resize:"none", marginBottom:16, boxSizing:"border-box" }} autoFocus />
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:24 }}>
              <div>
                <label style={{ display:"block", fontSize:12, color:"#888", marginBottom:4 }}>Priority</label>
                <select value={ticketDraft.priority} onChange={e => setTicketDraft({...ticketDraft, priority:e.target.value})} style={{ width:"100%", padding:10, borderRadius:8, background:"#0A0A0B", border:"1px solid #333", color:"#fff", boxSizing:"border-box" }}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label style={{ display:"block", fontSize:12, color:"#888", marginBottom:4 }}>Deadline (Optional)</label>
                <input type="date" value={ticketDraft.deadline} onChange={e => setTicketDraft({...ticketDraft, deadline:e.target.value})} style={{ width:"100%", padding:10, borderRadius:8, background:"#0A0A0B", border:"1px solid #333", color:"#fff", boxSizing:"border-box" }} />
              </div>
            </div>
            <div style={{ display:"flex", justifyContent:"flex-end", gap:12 }}>
              <button onClick={() => setShowTicket(false)} style={{ padding:"10px 16px", borderRadius:8, background:"transparent", border:"none", color:"#888", cursor:"pointer" }}>Cancel</button>
              <button onClick={submitTicket} disabled={!ticketDraft.message.trim()} className="btn" style={{ background:"#fff", color:"#000", fontWeight:500 }}>Submit Request</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
