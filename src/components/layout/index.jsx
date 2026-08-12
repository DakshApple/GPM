import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Command, LayoutDashboard, Calendar, Layers, FolderKanban, ListTodo, Users, Sparkles, LogOut, MessageSquare, UserCog, Key } from 'lucide-react';

export function Sidebar({ view, setView, account, counts, onLogout, onOpenPalette, onChangePassword }) {
  const allItems = [
    { id:"dashboard", label:"dashboard",      icon: LayoutDashboard, feature:"dashboard" },
    { id:"calendar",  label:"calendar",       icon: Calendar, feature:"calendar" },
    { id:"timeline",  label:"timeline",       icon: Layers, feature:"timeline" },
    { id:"projects",  label:"projects",       icon: FolderKanban, count: counts.projects, feature:"projects" },
    { id:"tasks",     label:"tasks",          icon: ListTodo,     count: counts.tasks, feature:"tasks" },
    { id:"tickets",   label:"client tickets", icon: MessageSquare,count: counts.tickets, accent: true, feature:"tickets" },
    { id:"team",      label:"team",           icon: Users, feature:"team_view" },
    { id:"ai",        label:"ai suggestions", icon: Sparkles,     count: counts.suggestions, accent: true, feature:"ai" },
  ];

  const isAdmin = account.role === "admin";
  const hasFeature = (f) => isAdmin || (account.featureAccess && (account.featureAccess.includes("all") || account.featureAccess.includes(f)));
  
  const items = allItems.filter(item => hasFeature(item.feature));
  
  // Admin-only items
  if (isAdmin) {
    items.push({ id:"manage_users", label:"manage users", icon: UserCog, feature:"manage_users" });
  }

  return (
    <aside style={{ width:220, flexShrink:0, display:"flex", flexDirection:"column", borderRight:"1px solid var(--border)", background:"var(--surface)" }}>
      <div style={{ padding:16, display:"flex", alignItems:"center", gap:8, borderBottom:"1px solid var(--border)" }}>
        <img src="/genartml-logo.png" alt="Genartml" style={{ height: 48, objectFit: "contain", marginLeft: -4 }} />
      </div>
      <button onClick={onOpenPalette} style={{ margin:"8px 8px 0", padding:"8px 10px", borderRadius:6, fontSize:11, display:"flex", alignItems:"center", gap:8, background:"var(--surface-2)", border:"1px solid var(--border)", color:"var(--text-2)", cursor:"pointer" }}>
        <Search style={{ width:14, height:14 }} />
        <span style={{ flex:1, textAlign:"left" }}>quick add / jump...</span>
        <span className="kbd">⌘K</span>
      </button>
      <nav style={{ flex:1, padding:8, marginTop:8 }}>
        {items.map(item => {
          const Icon = item.icon;
          const active = view === item.id;
          return (
            <button key={item.id} onClick={() => setView(item.id)}
              style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"8px 10px", borderRadius:6, fontSize:12, background:active?"var(--surface-2)":"transparent", color:active?"var(--text)":"var(--text-2)", fontWeight:active?500:400, border:"none", cursor:"pointer", marginBottom:2, textAlign:"left" }}>
              <Icon style={{ width:15, height:15, flexShrink:0, color:active?"var(--amber)":"currentColor" }} />
              <span style={{ flex:1 }}>{item.label}</span>
              {item.count > 0 && <span className="font-mono" style={{ fontSize:10, padding:"2px 6px", borderRadius:4, background:item.accent?"rgba(74,158,255,.15)":"var(--surface-3)", color:item.accent?"var(--blue)":"var(--text-2)" }}>{item.count}</span>}
            </button>
          );
        })}
      </nav>
      {/* ai radar */}
      <div style={{ margin:"0 8px 8px", padding:12, borderRadius:8, background:"var(--surface-2)", border:"1px solid var(--border)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
          <div style={{ position:"relative", width:8, height:8 }}><div className="pulse-dot" style={{ position:"absolute", inset:0, borderRadius:4, background:"var(--blue)" }} /></div>
          <span className="fl">ai radar</span>
        </div>
        <div style={{ fontSize:11, lineHeight:1.5, color:"var(--text-2)" }}>
          watching <span style={{ color:"var(--text)" }}>{counts.projects}</span> projects, <span style={{ color:"var(--text)" }}>{counts.tasks}</span> tasks.
          {counts.suggestions > 0
            ? <> <span style={{ color:"var(--blue)" }}>{counts.suggestions}</span> suggestion{counts.suggestions > 1 ? "s" : ""} pending.</>
            : " no conflicts."}
        </div>
      </div>
      <div style={{ padding:8, borderTop:"1px solid var(--border)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px" }}>
          <div style={{ width:28, height:28, borderRadius:14, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:500, background:"var(--surface-3)" }}>{account.displayName?.[0] || "?"}</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:12, fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{account.displayName}</div>
            <div className="font-mono" style={{ fontSize:10, color:"var(--text-3)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{account.role}</div>
          </div>
          {!isAdmin && <button onClick={onChangePassword} style={{ padding:4, borderRadius:4, background:"none", border:"none", cursor:"pointer", color:"var(--text-3)" }} title="change password"><Key style={{ width:13, height:13 }} /></button>}
          <button onClick={onLogout} style={{ padding:4, borderRadius:4, background:"none", border:"none", cursor:"pointer", color:"var(--text-3)" }} title="sign out">
            <LogOut style={{ width:14, height:14 }} />
          </button>
        </div>
      </div>
    </aside>
  );
}

export function Topbar({ title, subtitle, actions }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 24px", borderBottom:"1px solid var(--border)" }}>
      <div>
        <h1 className="font-display" style={{ fontSize:22, fontWeight:600, lineHeight:1.2, margin:0 }}>{title}</h1>
        {subtitle && <div style={{ fontSize:12, marginTop:2, color:"var(--text-2)" }}>{subtitle}</div>}
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>{actions}</div>
    </div>
  );
}

export function CommandPalette({ open, onClose, actions, jumpTargets }) {
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const inputRef = useRef(null);
  
  useEffect(() => { if (open) { setQ(""); setIdx(0); setTimeout(() => inputRef.current?.focus(), 20); } }, [open]);
  
  const items = useMemo(() => {
    const all = [...actions.map(a => ({...a, group:"create"})), ...jumpTargets.map(j => ({...j, group:"jump"}))];
    if (!q) return all;
    const lower = q.toLowerCase();
    return all.filter(a => a.label.toLowerCase().includes(lower) || (a.hint||"").toLowerCase().includes(lower));
  }, [q, actions, jumpTargets]);
  
  useEffect(() => { setIdx(0); }, [q]);
  
  const onKey = (e) => {
    if (e.key==="ArrowDown") { e.preventDefault(); setIdx(i => Math.min(items.length-1, i+1)); }
    else if (e.key==="ArrowUp") { e.preventDefault(); setIdx(i => Math.max(0, i-1)); }
    else if (e.key==="Enter") { e.preventDefault(); if(items[idx]) { items[idx].run(); onClose(); } }
    else if (e.key==="Escape") { onClose(); }
  };
  
  if (!open) return null;
  
  return (
    <div style={{ position:"fixed", inset:0, zIndex:100, display:"flex", alignItems:"flex-start", justifyContent:"center", paddingTop:96, padding:"96px 16px 0", background:"rgba(0,0,0,.6)" }} onClick={onClose}>
      <div className="scale-in" style={{ width:"100%", maxWidth:480, borderRadius:12, overflow:"hidden", background:"var(--surface)", border:"1px solid var(--border-strong)", boxShadow:"0 24px 60px rgba(0,0,0,.6)" }} onClick={e => e.stopPropagation()}>
        <div style={{ display:"flex", alignItems:"center", gap:8, padding:"12px 16px", borderBottom:"1px solid var(--border)" }}>
          <Command style={{ width:16, height:16, color:"var(--text-3)" }} />
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} onKeyDown={onKey} placeholder="type a command or search..." style={{ flex:1, background:"transparent", border:0, padding:0, fontSize:15, outline:"none" }} />
          <span className="kbd">esc</span>
        </div>
        <div style={{ maxHeight:400, overflowY:"auto", padding:6 }}>
          {items.length===0 && <div style={{ padding:24, textAlign:"center", fontSize:13, color:"var(--text-2)" }}>nothing matches "{q}"</div>}
          {["create","jump"].map(group => {
            const list = items.filter(i => i.group === group);
            if (list.length===0) return null;
            return (
              <div key={group}>
                <div className="fl" style={{ padding:"6px 12px" }}>{group==="create"?"create":"jump to"}</div>
                {list.map(item => {
                  const globalIdx = items.indexOf(item);
                  const Icon = item.icon;
                  return (
                    <button key={item.label} onClick={() => { item.run(); onClose(); }} onMouseEnter={() => setIdx(globalIdx)}
                      style={{ width:"100%", textAlign:"left", padding:"8px 12px", borderRadius:6, display:"flex", alignItems:"center", gap:12,
                        background: idx===globalIdx?"var(--surface-2)":"transparent", border:"none", cursor:"pointer", color:"var(--text)" }}>
                      <div style={{ width:24, height:24, borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", background:"var(--surface-3)", flexShrink:0 }}>
                        <Icon style={{ width:14, height:14, color: item.accent || "var(--text-2)" }} />
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13 }}>{item.label}</div>
                        {item.hint && <div className="font-mono" style={{ fontSize:11, color:"var(--text-3)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.hint}</div>}
                      </div>
                      {item.shortcut && <span className="kbd">{item.shortcut}</span>}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
        <div style={{ padding:"8px 16px", borderTop:"1px solid var(--border)", display:"flex", gap:12, fontSize:10, color:"var(--text-3)" }} className="font-mono">
          <span><span className="kbd">↑↓</span> nav</span>
          <span><span className="kbd">↵</span> select</span>
        </div>
      </div>
    </div>
  );
}
