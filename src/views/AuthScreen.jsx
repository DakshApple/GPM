import React, { useState } from 'react';
import { Shield, ArrowRight, LogIn } from 'lucide-react';
import { api } from '../services/db';

export function AuthScreen({ onAuth }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setError(""); setBusy(true);
    try {
      const accounts = await api.getTable('gpm_accounts');
      const found = accounts.find(a => a.username === username.trim());
      if (!found) { setError("account not found."); setBusy(false); return; }
      if (found.password !== password) { setError("incorrect password."); setBusy(false); return; }
      
      // If email is provided during login and it's different/new, save it to DB
      if (email.trim() && email.trim() !== found.email) {
        found.email = email.trim();
        await api.upsertRow('gpm_accounts', found);
      }

      // Store session
      const sessionData = { ...found, expiresAt: Date.now() + 86400000 };
      localStorage.setItem("gpm:account", JSON.stringify(sessionData));
      onAuth(sessionData);
    } catch(err) {
      setError("connection error. try again.");
      console.error(err);
    }
    setBusy(false);
  };

  return (
    <div style={{ minHeight:"100vh", display:"flex", background:"var(--bg)" }}>
      <div className="lg-left" style={{ display:"none", width:"50%", flexDirection:"column", justifyContent:"space-between", padding:48, borderRight:"1px solid var(--border)" }}>
        <div style={{ height: 80, display:"flex", alignItems:"center", overflow:"hidden", marginLeft: -16 }}>
          <img src="/genartml-logo.png" alt="Genartml" style={{ width: 240, height: 240, objectFit: "contain" }} />
        </div>
        <div>
          <h1 className="font-display" style={{ fontSize:48, lineHeight:1.08, fontWeight:600, letterSpacing:"-0.02em", marginBottom:24 }}>
            one calendar<br /><span style={{ color:"var(--text-2)" }}>for everything</span><br />we're building.
          </h1>
          <p style={{ fontSize:15, maxWidth:420, lineHeight:1.6, color:"var(--text-2)" }}>
            projects, modules, tasks, client updates — one roof. the scheduler watches for collisions, deadline breaches, and overloads before they happen.
          </p>
        </div>
        <div className="font-mono" style={{ display:"flex", alignItems:"center", gap:8, fontSize:11 }}>
          <div className="pulse-dot" style={{ width:6, height:6, borderRadius:3, background:"var(--green)" }} />
          <span style={{ color:"var(--text-3)" }}>genartml project manager · v4.0 · rbac enabled</span>
        </div>
      </div>

      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:32 }}>
        <div style={{ width:"100%", maxWidth:380 }}>
          <div style={{ marginBottom:32 }}>
            <div className="lg-hide" style={{ height: 60, display:"flex", alignItems:"center", overflow:"hidden", marginBottom:16, marginLeft: -12 }}>
              <img src="/genartml-logo.png" alt="Genartml" style={{ width: 180, height: 180, objectFit: "contain" }} />
            </div>
            <h2 className="font-display" style={{ fontSize:22, fontWeight:600, marginBottom:4 }}>welcome back</h2>
            <p style={{ fontSize:13, color:"var(--text-2)" }}>sign in to genartml project manager.</p>
          </div>
          <form onSubmit={submit} style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <input value={username} onChange={e => setUsername(e.target.value)} required placeholder="username" autoComplete="username" style={{ width:"100%", boxSizing:"border-box" }} />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="password" autoComplete="current-password" style={{ width:"100%", boxSizing:"border-box" }} />
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email (optional - to receive notifications)" autoComplete="email" style={{ width:"100%", boxSizing:"border-box" }} />
            {error && <div style={{ fontSize:12, padding:"8px 12px", borderRadius:6, background:"rgba(248,113,113,.1)", color:"var(--red)" }}>{error}</div>}
            <button type="submit" disabled={busy} className="btn btn-primary" style={{ width:"100%", justifyContent:"center", padding:"12px 14px", fontSize:14 }}>
              {busy ? "authenticating..." : "sign in"}
            </button>
          </form>
          <div style={{ marginTop:16, textAlign:"center" }}>
            <button type="button" onClick={() => window.location.hash = "#client"} style={{ color:"var(--text-2)", background:"none", border:"none", cursor:"pointer", fontSize:13, display:"flex", alignItems:"center", gap:6, margin:"0 auto" }}>
               client portal login <ArrowRight style={{width:12,height:12}} />
            </button>
          </div>
          <div style={{ marginTop:32, paddingTop:20, borderTop:"1px solid var(--border)", display:"flex", alignItems:"center", gap:8 }}>
            <Shield style={{ width:14, height:14, color:"var(--text-3)" }} />
            <span style={{ fontSize:11, color:"var(--text-3)" }}>role-based access control enabled. contact your admin for credentials.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
