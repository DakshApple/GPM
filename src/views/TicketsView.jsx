import React from 'react';
import { MessageSquare, CheckCircle2, ArrowRight, Paperclip } from 'lucide-react';
import { Topbar } from '../components/layout';

export function TicketsView({ tickets, projects, onResolve, onConvertToTask, deleteTicket, restoreTicket }) {
  const open = tickets.filter(t => t.status === "open").sort((a,b) => b.createdAt.localeCompare(a.createdAt));
  const resolved = tickets.filter(t => t.status === "resolved").sort((a,b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 50);
  const deleted = tickets.filter(t => t.status === "deleted").sort((a,b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 50);

  return (
    <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column" }}>
      <Topbar title="client tickets" subtitle="manage change requests & feedback" />
      <div style={{ padding:24, maxWidth:800 }}>
        
        <div style={{ marginBottom:32 }}>
          <div className="fl" style={{ paddingBottom:8, borderBottom:"1px solid var(--border)", marginBottom:12 }}>open requests ({open.length})</div>
          {open.length === 0 ? (
            <div style={{ padding:"32px 0", textAlign:"center", fontSize:13, color:"var(--text-2)" }}>no active client requests.</div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {open.map(tk => {
                const project = projects.find(p => p.id === tk.projectId);
                return (
                  <div key={tk.id} className="fade-in" style={{ padding:16, borderRadius:8, background:"rgba(74,158,255,.05)", border:"1px solid rgba(74,158,255,.3)" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                      <div>
                        <div style={{ fontSize:11, color:"var(--blue)", marginBottom:4, fontWeight:500 }}>{project?.client} - {project?.name}</div>
                        <div style={{ fontSize:15, color:"var(--text)", lineHeight:1.5 }}>"{tk.message}"</div>
                      </div>
                      <span className="font-mono" style={{ fontSize:10, color:"var(--text-3)" }}>{new Date(tk.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div style={{ display:"flex", gap:8, marginTop:12, alignItems:"center" }}>
                      <span style={{ fontSize:10, padding:"2px 8px", borderRadius:4, textTransform:"capitalize", background: tk.priority==="high"?"rgba(248,113,113,.15)":tk.priority==="low"?"rgba(163,230,53,.15)":"rgba(245,166,35,.15)", color: tk.priority==="high"?"var(--red)":tk.priority==="low"?"var(--green)":"var(--amber)" }}>
                        {tk.priority} Priority
                      </span>
                      {tk.deadline && <span className="font-mono" style={{ fontSize:10, padding:"2px 8px", borderRadius:4, background:"var(--surface-3)", color:"var(--text-2)" }}>Deadline: {new Date(tk.deadline).toLocaleDateString()}</span>}
                      {tk.isEdited && <span style={{ fontSize:10, padding:"2px 8px", borderRadius:4, background:"rgba(255,255,255,0.1)", color:"var(--text)", display:"flex", alignItems:"center", gap:4 }}>⚠️ Edited by Client</span>}
                    </div>
                    {tk.attachments && tk.attachments.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                        {tk.attachments.map((a, i) => (
                          <a key={i} href={a.url} target="_blank" rel="noreferrer" style={{ fontSize: 11, padding: '6px 10px', borderRadius: 6, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--blue)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, transition: 'background 0.2s' }}>
                            <Paperclip size={12} /> {a.name}
                          </a>
                        ))}
                      </div>
                    )}
                    <div style={{ display:"flex", gap:8, marginTop:16 }}>
                      <button onClick={() => onConvertToTask(tk)} className="btn btn-primary" style={{ gap:6 }}><ArrowRight style={{width:14,height:14}}/> convert to task</button>
                      <button onClick={() => onResolve(tk.id)} className="btn btn-secondary" style={{ gap:6 }}><CheckCircle2 style={{width:14,height:14}}/> mark resolved</button>
                      <button onClick={() => { if(window.confirm('Delete this ticket?')) deleteTicket(tk.id); }} className="btn" style={{ background:"transparent", border:"1px solid var(--border)", color:"var(--red)", gap:6 }}>delete</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {resolved.length > 0 && (
          <div>
            <div className="fl" style={{ paddingBottom:8, borderBottom:"1px solid var(--border)", marginBottom:12 }}>resolved history</div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {resolved.map(tk => {
                const project = projects.find(p => p.id === tk.projectId);
                return (
                  <div key={tk.id} style={{ padding:12, borderRadius:8, background:"var(--surface)", border:"1px solid var(--border)" }}>
                    <div style={{ fontSize:11, color:"var(--text-3)", marginBottom:4 }}>{project?.client} - {project?.name}</div>
                    <div style={{ fontSize:13, color:"var(--text-2)", lineHeight:1.5 }}>"{tk.message}"</div>
                    {tk.attachments && tk.attachments.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                        {tk.attachments.map((a, i) => (
                          <a key={i} href={a.url} target="_blank" rel="noreferrer" style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'var(--bg)', border: '1px dashed var(--border)', color: 'var(--text-2)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Paperclip size={10} /> {a.name}
                          </a>
                        ))}
                      </div>
                    )}
                    <div className="font-mono" style={{ fontSize:10, color:"var(--text-3)", marginTop:8 }}>resolved on {new Date(tk.createdAt).toLocaleDateString()}</div>
                  </div>
                );
              })}
            </div>
        )}

        {deleted.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <div className="fl" style={{ paddingBottom:8, borderBottom:"1px solid var(--border)", marginBottom:12 }}>deleted requests</div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {deleted.map(tk => {
                const project = projects.find(p => p.id === tk.projectId);
                return (
                  <div key={tk.id} style={{ padding:12, borderRadius:8, background:"rgba(248,113,113,0.05)", border:"1px solid rgba(248,113,113,0.2)" }}>
                    <div style={{ fontSize:11, color:"var(--text-3)", marginBottom:4 }}>{project?.client} - {project?.name}</div>
                    <div style={{ fontSize:13, color:"var(--text-2)", lineHeight:1.5, textDecoration: "line-through" }}>"{tk.message}"</div>
                    <div style={{ display:"flex", justifyContent: "space-between", alignItems: "center", marginTop:8 }}>
                      <div className="font-mono" style={{ fontSize:10, color:"var(--red)" }}>Deleted by {tk.deleted_by || 'Unknown'}</div>
                      <button onClick={() => restoreTicket(tk.id)} style={{ background:"transparent", border:"1px solid var(--border)", color:"var(--text-2)", borderRadius:4, padding:"2px 8px", fontSize:10, cursor:"pointer" }}>Restore</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
