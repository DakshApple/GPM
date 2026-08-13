import React, { useState, useEffect } from 'react';
import { Activity, Search, Trash2, ShieldAlert } from 'lucide-react';
import { Topbar } from '../components/layout';
import { api, supabase } from '../services/db';
import { logAction } from '../services/logger';

export function LogsView({ account }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('gpm_logs')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setLogs(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
    
    const channel = supabase.channel('logs_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gpm_logs' }, fetchLogs)
      .subscribe();
      
    return () => supabase.removeChannel(channel);
  }, []);

  const clearLogs = async () => {
    if (!window.confirm("Are you sure you want to permanently delete ALL logs? This cannot be undone.")) return;
    
    try {
      // In Supabase without a truncate RPC, we delete all by matching id
      // This is a slow loop for large logs but works for the prototype
      for (const log of logs) {
        await api.deleteRow('gpm_logs', log.id);
      }
      setLogs([]);
      logAction(account, 'Cleared Audit Logs', 'System', 'all');
    } catch (e) {
      alert("Failed to clear logs.");
    }
  };
  
  const deleteLog = async (id) => {
    if (!window.confirm("Delete this log entry?")) return;
    await api.deleteRow('gpm_logs', id);
    setLogs(logs.filter(l => l.id !== id));
  };

  const filteredLogs = logs.filter(l => 
    l.actor_name?.toLowerCase().includes(search.toLowerCase()) || 
    l.action?.toLowerCase().includes(search.toLowerCase()) ||
    l.entity_type?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column" }}>
      <Topbar title="audit logs" subtitle="system-wide activity tracking" />
      
      <div style={{ padding:24, maxWidth: 1000 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
          <div style={{ position:"relative", width:300 }}>
            <Search style={{ position:"absolute", left:12, top:10, color:"#666", width:14, height:14 }} />
            <input 
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search logs..."
              style={{ width:"100%", boxSizing:"border-box", background:"var(--surface)", border:"1px solid var(--border)", padding:"8px 12px 8px 36px", color:"var(--text)", borderRadius:6, fontSize:13 }}
            />
          </div>
          <button onClick={clearLogs} className="btn" style={{ background:"rgba(248,113,113,0.1)", color:"var(--red)", border:"1px solid rgba(248,113,113,0.2)", gap:6 }}>
            <Trash2 style={{ width:14, height:14 }} /> Clear All Logs
          </button>
        </div>

        {loading ? (
          <div style={{ padding:32, textAlign:"center", color:"var(--text-3)", fontSize:13 }}>Loading activity logs...</div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ padding:64, textAlign:"center", border:"1px dashed var(--border)", borderRadius:12, color:"var(--text-2)", fontSize:13 }}>
            <Activity style={{ width:32, height:32, margin:"0 auto 12px", opacity:0.5 }} />
            No activity logs found.
          </div>
        ) : (
          <div style={{ border:"1px solid var(--border)", borderRadius:12, overflow:"hidden", background:"var(--surface)" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ background:"var(--surface-2)", borderBottom:"1px solid var(--border)", textAlign:"left", fontSize:11, color:"var(--text-2)", textTransform:"uppercase", letterSpacing:"0.05em" }}>
                  <th style={{ padding:"12px 16px", fontWeight:500 }}>Time</th>
                  <th style={{ padding:"12px 16px", fontWeight:500 }}>Actor</th>
                  <th style={{ padding:"12px 16px", fontWeight:500 }}>Action</th>
                  <th style={{ padding:"12px 16px", fontWeight:500 }}>Entity</th>
                  <th style={{ padding:"12px 16px", fontWeight:500, width: 60 }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map(log => (
                  <tr key={log.id} style={{ borderBottom:"1px solid var(--border)", fontSize:13, color:"var(--text)" }}>
                    <td style={{ padding:"12px 16px", color:"var(--text-3)", whiteSpace:"nowrap" }}>
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td style={{ padding:"12px 16px" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <div style={{ fontWeight:500 }}>{log.actor_name}</div>
                        <span style={{ fontSize:10, padding:"2px 6px", borderRadius:4, background:"var(--bg)", color:"var(--text-2)", textTransform: "uppercase" }}>{log.actor_role}</span>
                      </div>
                    </td>
                    <td style={{ padding:"12px 16px" }}>
                      <span style={{ color:"var(--blue)", fontWeight:500 }}>{log.action}</span>
                    </td>
                    <td style={{ padding:"12px 16px" }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize:11, padding:"2px 6px", borderRadius:4, background:"var(--surface-3)", color:"var(--text-2)" }}>{log.entity_type}</span>
                        <span className="font-mono" style={{ fontSize:11, color:"var(--text-3)" }}>{log.entity_id}</span>
                      </div>
                      {log.details && Object.keys(log.details).length > 0 && (
                        <div style={{ marginTop:4, fontSize:11, color:"var(--text-3)" }}>
                          {JSON.stringify(log.details)}
                        </div>
                      )}
                    </td>
                    <td style={{ padding:"12px 16px", textAlign: "right" }}>
                      <button onClick={() => deleteLog(log.id)} style={{ background:"none", border:"none", color:"var(--red)", cursor:"pointer", opacity:0.7 }}>
                        <Trash2 style={{ width:14, height:14 }} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
