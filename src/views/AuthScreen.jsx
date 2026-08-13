import React, { useState } from 'react';
import { Shield, ArrowRight, LogIn } from 'lucide-react';
import { api, supabase } from '../services/db';

export function AuthScreen({ onAuth }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setError(""); setBusy(true);
    try {
      if (isSignUp) {
        if (!email.trim() || !password.trim() || !username.trim()) {
          throw new Error("Email, username, and password are required.");
        }
        
        // 1. Sign up with Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim()
        });
        if (authError) throw authError;
        
        if (!authData.user) {
          throw new Error("Signup failed. Please check your email for a confirmation link if required.");
        }

        // 2. Create the linked gpm_accounts row
        const newAccount = {
          id: `acc-${Date.now()}`,
          username: username.trim(),
          password: password, // kept for legacy compat if needed, but should be empty
          display_name: username.trim(),
          email: email.trim(),
          role: 'member', // Default to member, admin must manually upgrade
          supabase_uid: authData.user.id,
          assigned_project_ids: [],
          feature_access: ["dashboard","projects","tasks","tickets","vault"]
        };
        
        await api.upsertRow('gpm_accounts', newAccount);
        
        // 3. Store session and proceed
        const sessionData = { ...newAccount, expiresAt: Date.now() + 86400000 };
        localStorage.setItem("gpm:account", JSON.stringify(sessionData));
        onAuth(sessionData);

      } else {
        // Sign In
        if (!email.trim() || !password.trim()) {
          throw new Error("Email and password are required.");
        }

        // 1. Sign in with Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim()
        });
        if (authError) throw authError;

        // 2. Fetch linked gpm_accounts row
        const { data: accData, error: accError } = await supabase
          .from('gpm_accounts')
          .select('*')
          .eq('supabase_uid', authData.user.id)
          .single();
          
        if (accError || !accData) {
          throw new Error("Your account is not linked to a GPM profile. Please contact your administrator.");
        }

        // Convert snake_case to camelCase for the frontend
        const toCamel = (str) => str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        const mappedAcc = Object.keys(accData).reduce((acc, key) => {
          acc[toCamel(key)] = accData[key];
          return acc;
        }, {});

        // 3. Store session and proceed
        const sessionData = { ...mappedAcc, expiresAt: Date.now() + 86400000 };
        localStorage.setItem("gpm:account", JSON.stringify(sessionData));
        onAuth(sessionData);
      }
    } catch(err) {
      setError(err.message || "Connection error. Try again.");
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
          <span style={{ color:"var(--text-3)" }}>genartml project manager · v5.0 · secure auth enabled</span>
        </div>
      </div>

      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:32 }}>
        <div style={{ width:"100%", maxWidth:380 }}>
          <div style={{ marginBottom:32 }}>
            <div className="lg-hide" style={{ height: 60, display:"flex", alignItems:"center", overflow:"hidden", marginBottom:16, marginLeft: -12 }}>
              <img src="/genartml-logo.png" alt="Genartml" style={{ width: 180, height: 180, objectFit: "contain" }} />
            </div>
            <h2 className="font-display" style={{ fontSize:22, fontWeight:600, marginBottom:4 }}>
              {isSignUp ? "create account" : "welcome back"}
            </h2>
            <p style={{ fontSize:13, color:"var(--text-2)" }}>
              {isSignUp ? "sign up for genartml project manager." : "sign in to genartml project manager."}
            </p>
          </div>
          <form onSubmit={submit} style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {isSignUp && (
              <input value={username} onChange={e => setUsername(e.target.value)} required placeholder="username or display name" autoComplete="username" style={{ width:"100%", boxSizing:"border-box" }} />
            )}
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="email address" autoComplete="email" style={{ width:"100%", boxSizing:"border-box" }} />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="password" autoComplete="current-password" style={{ width:"100%", boxSizing:"border-box" }} />
            {error && <div style={{ fontSize:12, padding:"8px 12px", borderRadius:6, background:"rgba(248,113,113,.1)", color:"var(--red)" }}>{error}</div>}
            
            <button type="submit" disabled={busy} className="btn btn-primary" style={{ width:"100%", justifyContent:"center", padding:"12px 14px", fontSize:14, marginTop: 8 }}>
              {busy ? "authenticating..." : (isSignUp ? "sign up" : "sign in")}
            </button>
          </form>
          
          <div style={{ marginTop:16, textAlign:"center" }}>
            <button type="button" onClick={() => setIsSignUp(!isSignUp)} style={{ color:"var(--blue)", background:"none", border:"none", cursor:"pointer", fontSize:13, margin:"0 auto" }}>
               {isSignUp ? "already have an account? sign in" : "need an account? sign up"}
            </button>
          </div>

          <div style={{ marginTop:16, textAlign:"center" }}>
            <button type="button" onClick={() => window.location.hash = "#client"} style={{ color:"var(--text-2)", background:"none", border:"none", cursor:"pointer", fontSize:13, display:"flex", alignItems:"center", gap:6, margin:"0 auto" }}>
               client portal login <ArrowRight style={{width:12,height:12}} />
            </button>
          </div>
          
          <div style={{ marginTop:32, paddingTop:20, borderTop:"1px solid var(--border)", display:"flex", alignItems:"center", gap:8 }}>
            <Shield style={{ width:14, height:14, color:"var(--text-3)" }} />
            <span style={{ fontSize:11, color:"var(--text-3)" }}>backend row-level security enabled.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
