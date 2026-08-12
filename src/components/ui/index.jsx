import React, { useEffect } from 'react';
import { Check, Sparkles, X, Plus } from 'lucide-react';

export function StatCard({ label, value, icon: Icon, accent, onClick }) {
  const color = accent === "red" ? "var(--red)" : accent === "blue" ? "var(--blue)" : "var(--text-2)";
  return (
    <div onClick={onClick} style={{ padding:16, borderRadius:8, background:"var(--surface)", border:"1px solid var(--border)", cursor: onClick ? "pointer" : "default" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
        <Icon style={{ width:16, height:16, color }} />
        {accent && <div className="pulse-dot" style={{ width:6, height:6, borderRadius:3, background:color }} />}
      </div>
      <div className="font-display" style={{ fontSize:24, fontWeight:600 }}>{value}</div>
      <div style={{ fontSize:11, marginTop:2, color:"var(--text-2)" }}>{label}</div>
    </div>
  );
}

export function Field({ label, value, mono, multiline, accent }) {
  return (
    <div>
      <label className="fl">{label}</label>
      <div style={{ marginTop:4, fontSize:13, fontFamily: mono?"'JetBrains Mono',monospace":"inherit", lineHeight: multiline?1.6:"normal", color: accent==="red"?"var(--red)":"var(--text)" }}>{value}</div>
    </div>
  );
}

export function Toast({ message, kind, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  const color = kind==="ai"?"var(--blue)":"var(--amber)";
  return (
    <div className="fade-in" style={{ position:"fixed", bottom:96, right:24, zIndex:50, maxWidth:360, borderRadius:8, padding:16, display:"flex", alignItems:"flex-start", gap:12,
      background:"var(--surface)", border:`1px solid ${color}`, boxShadow:"0 12px 40px rgba(0,0,0,.5)" }}>
      <div style={{ width:24, height:24, borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, background:`${color}22` }}>
        {kind==="ai" ? <Sparkles style={{ width:14, height:14, color }} /> : <Check style={{ width:14, height:14, color }} />}
      </div>
      <div style={{ fontSize:13, flex:1, lineHeight:1.5 }}>{message}</div>
      <button onClick={onClose} style={{ padding:2, background:"none", border:"none", cursor:"pointer", color:"var(--text-3)" }}><X style={{ width:14, height:14 }} /></button>
    </div>
  );
}

export function QuickAddFAB({ onClick }) {
  return (
    <button onClick={onClick} title="quick add (⌘K)"
      style={{ position:"fixed", bottom:24, right:24, width:48, height:48, borderRadius:24, display:"flex", alignItems:"center", justifyContent:"center", zIndex:30,
        background:"var(--amber)", color:"#1A0F00", border:"none", cursor:"pointer", boxShadow:"0 8px 24px rgba(245,166,35,.4)", transition:"transform .15s" }}
      onMouseEnter={e => e.currentTarget.style.transform="scale(1.1)"} onMouseLeave={e => e.currentTarget.style.transform="scale(1)"}>
      <Plus style={{ width:20, height:20 }} />
    </button>
  );
}
