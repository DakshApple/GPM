import React, { useState } from 'react';
import { Shield } from 'lucide-react';
import { supabaseAuth } from '../services/auth';
import { uid } from '../utils/date';
import { KEYS } from '../utils/constants';
import { store } from '../services/storage';

async function resolveProfile(supabaseUser, signupName) {
  const users = (await store.get(KEYS.users)) || [];
  const email = supabaseUser.email?.toLowerCase();
  const existing = users.find(u => u.email?.toLowerCase() === email);
  if (existing) {
    if (!existing.supabaseUid) {
      existing.supabaseUid = supabaseUser.id;
      await store.set(KEYS.users, users);
    }
    return existing;
  }
  const profile = {
    id: `u-${uid()}`, name: signupName || supabaseUser.email.split("@")[0],
    email: supabaseUser.email, role: "admin", title: "Team", supabaseUid: supabaseUser.id,
  };
  await store.set(KEYS.users, [...users, profile]);
  return profile;
}

export function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setError(""); setInfo(""); setBusy(true);
    try {
      if (mode === "login") {
        const session = await supabaseAuth.signIn(email.trim(), password);
        await supabaseAuth.saveSession(session);
        const profile = await resolveProfile(session.user, null);
        onAuth(profile);
      } else {
        if (!name.trim()) { setError("name is required."); setBusy(false); return; }
        if (password.length < 6) { setError("password must be 6+ characters."); setBusy(false); return; }
        const data = await supabaseAuth.signUp(email.trim(), password);
        if (data.access_token) {
          await supabaseAuth.saveSession(data);
          const profile = await resolveProfile(data.user, name.trim());
          onAuth(profile);
        } else if (data.id || (data.user && data.user.id)) {
          const u = data.user || data;
          const users = (await store.get(KEYS.users)) || [];
          if (!users.find(x => x.email?.toLowerCase() === email.trim().toLowerCase())) {
            users.push({ id: `u-${uid()}`, name: name.trim(), email: email.trim(), role: "admin", title: "Team", supabaseUid: u.id });
            await store.set(KEYS.users, users);
          }
          setInfo("account created. check your email for a confirmation link, then come back and sign in.");
          setMode("login"); setBusy(false); return;
        } else {
          setError("unexpected response. try again."); setBusy(false); return;
        }
      }
    } catch(err) {
      setError(err.message || "something went wrong.");
    }
    setBusy(false);
  };

  return (
    <div style={{ minHeight:"100vh", display:"flex", background:"var(--bg)" }}>
      <div className="lg-left" style={{ display:"none", width:"50%", flexDirection:"column", justifyContent:"space-between", padding:48, borderRight:"1px solid var(--border)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div className="font-display" style={{ width:32, height:32, borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", background:"var(--amber)", color:"#1A0F00", fontWeight:700, fontSize:14 }}>G</div>
          <span className="font-display" style={{ fontWeight:600, fontSize:14 }}>GPM</span>
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
          <span style={{ color:"var(--text-3)" }}>genartml project manager · v3.0 · supabase auth</span>
        </div>
      </div>

      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:32 }}>
        <div style={{ width:"100%", maxWidth:380 }}>
          <div style={{ marginBottom:32 }}>
            <div className="lg-hide" style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
              <div className="font-display" style={{ width:28, height:28, borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", background:"var(--amber)", color:"#1A0F00", fontWeight:700, fontSize:12 }}>G</div>
              <span className="font-display" style={{ fontWeight:600, fontSize:13 }}>GPM</span>
            </div>
            <h2 className="font-display" style={{ fontSize:22, fontWeight:600, marginBottom:4 }}>{mode === "login" ? "welcome back" : "create account"}</h2>
            <p style={{ fontSize:13, color:"var(--text-2)" }}>{mode === "login" ? "sign in to genartml project manager." : "internal use — admins only."}</p>
          </div>
          <form onSubmit={submit} style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {mode === "signup" && <input value={name} onChange={e => setName(e.target.value)} required placeholder="full name" style={{ width:"100%", boxSizing:"border-box" }} />}
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="email" style={{ width:"100%", boxSizing:"border-box" }} />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder={mode==="signup"?"password (6+ characters)":"password"} minLength={mode==="signup"?6:1} style={{ width:"100%", boxSizing:"border-box" }} />
            {error && <div style={{ fontSize:12, padding:"8px 12px", borderRadius:6, background:"rgba(248,113,113,.1)", color:"var(--red)" }}>{error}</div>}
            {info && <div style={{ fontSize:12, padding:"8px 12px", borderRadius:6, background:"rgba(74,158,255,.1)", color:"var(--blue)", lineHeight:1.5 }}>{info}</div>}
            <button type="submit" disabled={busy} className="btn btn-primary" style={{ width:"100%", justifyContent:"center", padding:"12px 14px", fontSize:14 }}>
              {busy ? "authenticating..." : mode === "login" ? "sign in" : "create account"}
            </button>
          </form>
          <div style={{ marginTop:16, textAlign:"center", fontSize:13, color:"var(--text-2)" }}>
            {mode === "login" ? "no account?" : "have one?"}{" "}
            <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setInfo(""); }} style={{ color:"var(--amber)", background:"none", border:"none", cursor:"pointer", textDecoration:"underline", fontSize:13 }}>
              {mode === "login" ? "create one" : "sign in"}
            </button>
          </div>
          <div style={{ marginTop:32, paddingTop:20, borderTop:"1px solid var(--border)", display:"flex", alignItems:"center", gap:8 }}>
            <Shield style={{ width:14, height:14, color:"var(--text-3)" }} />
            <span style={{ fontSize:11, color:"var(--text-3)" }}>auth powered by supabase. passwords are never stored in the app.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
