import React, { useState, useEffect } from 'react';
import { Search, ChevronRight, CheckCircle2, MessageSquare, Plus, ArrowRight, Shield } from 'lucide-react';
import { api } from '../services/db';
import { uid, toISO, addDays, today } from '../utils/date';
import { taskStatusMeta } from '../utils/constants';

export function ClientLogin({ onLogin }) {
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
      onLogin(p);
    } catch(err) {
      setError("connection error.");
    }
    setBusy(false);
  };

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#0A0A0B" }}>
      <div className="fade-in" style={{ width:"100%", maxWidth:400, padding:32 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, justifyContent:"center", marginBottom:32 }}>
          <div className="font-display" style={{ width:32, height:32, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", background:"#F5A623", color:"#1A0F00", fontWeight:700, fontSize:14 }}>G</div>
          <span className="font-display" style={{ fontWeight:600, fontSize:16, color:"#fff" }}>GPM Client Portal</span>
        </div>
        <form onSubmit={submit} style={{ display:"flex", flexDirection:"column", gap:12, background:"#141415", padding:24, borderRadius:12, border:"1px solid #2A2A2E" }}>
          <h2 className="font-display" style={{ fontSize:18, fontWeight:500, color:"#fff", margin:0, marginBottom:8 }}>Welcome Back</h2>
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
  const [ticketDraft, setTicketDraft] = useState({ message:"", priority:"medium", deadline:"" });
  const [showTicket, setShowTicket] = useState(false);

  useEffect(() => {
    (async () => {
      const t = await api.getTable('gpm_tasks');
      setTasks(t.filter(x => x.projectId === project.id && x.isClientVisible));
      const m = await api.getTable('gpm_modules');
      setModules(m.filter(x => x.projectId === project.id));
      const tk = await api.getTable('gpm_tickets');
      setTickets(tk.filter(x => x.projectId === project.id));
    })();
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
      // Edit existing
      const existing = tickets.find(t => t.id === ticketDraft.id);
      const tk = { ...existing, message: ticketDraft.message.trim(), priority: ticketDraft.priority, deadline: ticketDraft.deadline || null, isEdited: true };
      await api.upsertRow('gpm_tickets', tk);
      setTickets(tickets.map(t => t.id === ticketDraft.id ? tk : t));
    } else {
      // Create new
      const tk = { id: uid(), projectId: project.id, message: ticketDraft.message.trim(), priority: ticketDraft.priority, deadline: ticketDraft.deadline || null, status: 'open', isEdited: false, createdAt: new Date().toISOString() };
      await api.upsertRow('gpm_tickets', tk);
      setTickets([...tickets, tk]);
    }
    
    setTicketDraft({ id: null, message:"", priority:"medium", deadline:"" });
    setShowTicket(false);
  };

  const doneTasks = tasks.filter(t => t.status === "done");
  const progress = tasks.length ? Math.round((doneTasks.length / tasks.length) * 100) : 0;

  return (
    <div style={{ minHeight:"100vh", background:"#0A0A0B", color:"#EDEDED", fontFamily:"var(--font-sans)" }}>
      {/* Navbar */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"20px 48px", borderBottom:"1px solid #1F1F22", background:"rgba(10,10,11,0.8)", backdropFilter:"blur(12px)", position:"sticky", top:0, zIndex:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div className="font-display" style={{ width:32, height:32, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", background:"#F5A623", color:"#1A0F00", fontWeight:700, fontSize:14 }}>G</div>
          <div>
            <div className="font-display" style={{ fontWeight:600, fontSize:15 }}>{project.client}</div>
            <div style={{ fontSize:11, color:"#888" }}>Client Portal</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:16, alignItems:"center" }}>
          <button onClick={() => setShowTicket(true)} className="btn" style={{ background:"#F5A623", color:"#1A0F00", border:"none", fontWeight:500 }}>
            <Plus style={{ width:14, height:14 }} /> New Request
          </button>
          <button onClick={onLogout} style={{ background:"none", border:"none", color:"#888", cursor:"pointer", fontSize:13 }}>Sign Out</button>
        </div>
      </div>

      <div style={{ maxWidth:900, margin:"0 auto", padding:"48px 24px" }}>
        {/* Header */}
        <div className="fade-in" style={{ marginBottom:48 }}>
          <h1 className="font-display" style={{ fontSize:40, fontWeight:600, letterSpacing:"-0.02em", margin:0, color:"#fff" }}>{project.name}</h1>
          <p style={{ fontSize:16, color:"#888", marginTop:8 }}>Track progress, view completed milestones, and request changes.</p>
        </div>

        {/* Progress Ring */}
        <div className="fade-in" style={{ display:"flex", gap:24, marginBottom:48 }}>
          <div style={{ flex:1, padding:32, borderRadius:16, background:"#141415", border:"1px solid #2A2A2E", display:"flex", alignItems:"center", gap:32 }}>
            <div style={{ position:"relative", width:120, height:120, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <svg width="120" height="120" style={{ transform:"rotate(-90deg)" }}>
                <circle cx="60" cy="60" r="54" fill="none" stroke="#2A2A2E" strokeWidth="8" />
                <circle cx="60" cy="60" r="54" fill="none" stroke="#F5A623" strokeWidth="8" strokeDasharray="339" strokeDashoffset={339 - (339 * progress) / 100} style={{ transition:"stroke-dashoffset 1s ease" }} strokeLinecap="round" />
              </svg>
              <div style={{ position:"absolute", textAlign:"center" }}>
                <div className="font-display" style={{ fontSize:32, fontWeight:600, color:"#fff" }}>{progress}%</div>
              </div>
            </div>
            <div>
              <div style={{ fontSize:18, fontWeight:500, color:"#fff", marginBottom:4 }}>Project Completion</div>
              <div style={{ fontSize:14, color:"#888" }}>{doneTasks.length} of {tasks.length} client milestones achieved.</div>
            </div>
          </div>
          <div style={{ width:300, padding:24, borderRadius:16, background:"#141415", border:"1px solid #2A2A2E", display:"flex", flexDirection:"column", justifyContent:"space-between" }}>
            <div>
              <div style={{ fontSize:12, color:"#888", marginBottom:4 }}>Status</div>
              <div style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"4px 10px", borderRadius:20, background:"rgba(245,166,35,.1)", color:"#F5A623", fontSize:12, fontWeight:500, textTransform:"capitalize" }}>
                <div style={{ width:6, height:6, borderRadius:3, background:"currentColor" }} /> {project.status.replace("_"," ")}
              </div>
            </div>
            <div>
              <div style={{ fontSize:12, color:"#888", marginBottom:4 }}>Target Delivery</div>
              <div style={{ fontSize:16, color:"#fff", fontWeight:500 }}>{new Date(project.deadline).toLocaleDateString("en-US", { month:"long", day:"numeric", year:"numeric" })}</div>
            </div>
          </div>
        </div>

        {/* Timeline & Updates */}
        <div className="fade-in" style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:32 }}>
          <div>
            <h3 className="font-display" style={{ fontSize:20, fontWeight:500, color:"#fff", marginBottom:24 }}>Milestones & Updates</h3>
            {tasks.length === 0 ? (
              <div style={{ padding:48, textAlign:"center", border:"1px dashed #2A2A2E", borderRadius:12, color:"#666" }}>No milestones visible yet.</div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:32 }}>
                
                {tasks.filter(t => t.status === "in_progress" || t.status === "review").length > 0 && (
                  <div>
                    <h4 style={{ fontSize:14, color:"#4A9EFF", fontWeight:500, marginBottom:12, textTransform:"uppercase", letterSpacing:"0.05em" }}>Currently in Progress</h4>
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
                  </div>
                )}

                {tasks.filter(t => t.status === "todo").length > 0 && (
                  <div>
                    <h4 style={{ fontSize:14, color:"#F5A623", fontWeight:500, marginBottom:12, textTransform:"uppercase", letterSpacing:"0.05em" }}>Future Work</h4>
                    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                      {tasks.filter(t => t.status === "todo").map(t => (
                        <div key={t.id} style={{ padding:20, borderRadius:12, background:"#141415", border:"1px dashed #2A2A2E", display:"flex", gap:16, opacity: 0.7 }}>
                          <div style={{ paddingTop:2 }}><div style={{ width:18, height:18, borderRadius:9, border:"2px solid #555" }} /></div>
                          <div>
                            <div style={{ fontSize:16, fontWeight:500, color:"#ccc", marginBottom:6 }}>{t.clientTitle || t.title}</div>
                            <div style={{ fontSize:14, color:"#666", lineHeight:1.5 }}>{t.clientDescription || "Planned."}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {doneTasks.length > 0 && (
                  <div>
                    <h4 style={{ fontSize:14, color:"#A3E635", fontWeight:500, marginBottom:12, textTransform:"uppercase", letterSpacing:"0.05em" }}>Completed</h4>
                    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                      {doneTasks.map(t => (
                        <div key={t.id} style={{ padding:20, borderRadius:12, background:"rgba(163,230,53,.05)", border:"1px solid rgba(163,230,53,.2)", display:"flex", gap:16, opacity: 0.8 }}>
                          <div style={{ paddingTop:2 }}><CheckCircle2 style={{ width:20, height:20, color:"#A3E635" }} /></div>
                          <div>
                            <div style={{ fontSize:16, fontWeight:500, color:"#fff", marginBottom:6, textDecoration:"line-through" }}>{t.clientTitle || t.title}</div>
                            <div style={{ fontSize:14, color:"#888", lineHeight:1.5 }}>{t.clientDescription || "Completed."}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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

