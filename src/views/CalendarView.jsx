import React, { useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Topbar } from '../components/layout';
import { toISO, fromISO, today } from '../utils/date';
import { colorFor, PALETTE } from '../utils/constants';

export function CalendarView({ projects, tasks, onOpenProject, openTaskById }) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const monthLabel = cursor.toLocaleDateString("en-US", { month:"long", year:"numeric" });
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth()+1, 0).getDate();
  const totalCells = Math.ceil((startWeekday + daysInMonth) / 7) * 7;
  const cells = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startWeekday + 1;
    cells.push(dayNum >= 1 && dayNum <= daysInMonth ? toISO(new Date(cursor.getFullYear(), cursor.getMonth(), dayNum)) : null);
  }
  const projectsForDay = useCallback((iso) => iso ? projects.filter(p => iso >= p.startDate && iso <= p.deadline && p.status !== "delivered") : [], [projects]);
  const tasksDueOnDay = useCallback((iso) => iso ? tasks.filter(t => t.deadline === iso && t.status !== "done") : [], [tasks]);

  return (
    <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column" }}>
      <Topbar title="calendar" subtitle="project spans + task deadline dots"
        actions={<>
          <button className="btn btn-secondary" onClick={() => { const d = new Date(cursor); d.setMonth(d.getMonth()-1); setCursor(d); }}><ChevronLeft style={{ width:14, height:14 }} /></button>
          <div className="font-display" style={{ fontWeight:600, fontSize:14, padding:"0 12px", minWidth:140, textAlign:"center" }}>{monthLabel}</div>
          <button className="btn btn-secondary" onClick={() => { const d = new Date(cursor); d.setMonth(d.getMonth()+1); setCursor(d); }}><ChevronRight style={{ width:14, height:14 }} /></button>
          <button className="btn btn-ghost" onClick={() => { const d = new Date(); d.setDate(1); setCursor(d); }} style={{ marginLeft:8 }}>today</button>
        </>}
      />
      <div style={{ flex:1, padding:24 }}>
        <div style={{ display:"flex", gap:16, marginBottom:16, flexWrap:"wrap" }}>
          {projects.filter(p => p.status !== "delivered").map(p => {
            const c = colorFor(p.color);
            return (
              <button key={p.id} onClick={() => onOpenProject(p.id)} style={{ display:"flex", alignItems:"center", gap:6, fontSize:11, background:"none", border:"none", cursor:"pointer", color:"var(--text-2)" }}>
                <div style={{ width:10, height:10, borderRadius:2, background:c.ring }} />{p.name}
              </button>
            );
          })}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4, marginBottom:4 }}>
          {["sun","mon","tue","wed","thu","fri","sat"].map(d => <div key={d} className="fl" style={{ padding:"4px 8px" }}>{d}</div>)}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4 }}>
          {cells.map((iso, i) => {
            if (!iso) return <div key={i} style={{ borderRadius:6, minHeight:110 }} />;
            const ap = projectsForDay(iso);
            const td = tasksDueOnDay(iso);
            const isToday = iso === today();
            const dayNum = fromISO(iso).getDate();
            const isWE = i%7===0||i%7===6;
            return (
              <div key={i} style={{ borderRadius:6, padding:6, display:"flex", flexDirection:"column", overflow:"hidden", minHeight:110,
                background: isToday ? "rgba(245,166,35,.06)" : "var(--surface)",
                border: isToday ? "1px solid rgba(245,166,35,.4)" : "1px solid var(--border)" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
                  <span className="font-mono" style={{ fontSize:11, fontWeight:500, color: isToday ? "var(--amber)" : isWE ? "var(--text-3)" : "var(--text-2)" }}>{dayNum}</span>
                  {ap.length > 3 && <span className="font-mono" style={{ fontSize:9, color:"var(--text-3)" }}>+{ap.length-3}</span>}
                </div>
                <div style={{ flex:1, display:"flex", flexDirection:"column", gap:3, overflow:"hidden" }}>
                  {ap.slice(0,3).map(p => {
                    const c = colorFor(p.color);
                    const isStart = iso === p.startDate, isEnd = iso === p.deadline;
                    return (
                      <button key={p.id} onClick={() => onOpenProject(p.id)} title={`${p.name} · ${p.client}`}
                        style={{ width:"100%", textAlign:"left", fontSize:10, padding:"2px 6px", borderRadius:3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                          background:c.bg, borderLeft:`2px solid ${c.ring}`, color:"var(--text)", border:`1px solid ${c.border}`, borderLeftWidth:2, cursor:"pointer" }}>
                        {isEnd ? "⚑ " : isStart ? "▸ " : ""}{p.name}
                      </button>
                    );
                  })}
                </div>
                {td.length > 0 && (
                  <div style={{ display:"flex", gap:3, marginTop:4, flexWrap:"wrap" }}>
                    {td.slice(0,6).map(t => {
                      const p = projects.find(x => x.id === t.projectId);
                      const c = p ? colorFor(p.color) : PALETTE[0];
                      return <button key={t.id} onClick={() => openTaskById(t.id)} title={t.title} style={{ width:6, height:6, borderRadius:3, background:c.ring, border:"none", cursor:"pointer", padding:0 }} />;
                    })}
                    {td.length > 6 && <span className="font-mono" style={{ fontSize:9, color:"var(--text-3)" }}>+{td.length-6}</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
