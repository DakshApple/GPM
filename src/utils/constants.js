import { Circle, CircleDot, AlertTriangle, CheckCircle2 } from "lucide-react";

export const KEYS = {
  users: "gpm:users",
  employees: "gpm:employees",
  projects: "gpm:projects",
  tasks: "gpm:tasks",
  modules: "gpm:modules",
  updates: "gpm:updates",
  suggestions: "gpm:suggestions",
  log: "gpm:activity-log",
  seeded: "gpm:seeded-v3",
};

export const PALETTE = [
  { name: "amber",  ring: "#F5A623", bg: "rgba(245,166,35,0.12)",  border: "rgba(245,166,35,0.4)" },
  { name: "blue",   ring: "#4A9EFF", bg: "rgba(74,158,255,0.12)",  border: "rgba(74,158,255,0.4)" },
  { name: "violet", ring: "#A78BFA", bg: "rgba(167,139,250,0.12)", border: "rgba(167,139,250,0.4)" },
  { name: "teal",   ring: "#2DD4BF", bg: "rgba(45,212,191,0.12)",  border: "rgba(45,212,191,0.4)" },
  { name: "rose",   ring: "#FB7185", bg: "rgba(251,113,133,0.12)", border: "rgba(251,113,133,0.4)" },
  { name: "lime",   ring: "#A3E635", bg: "rgba(163,230,53,0.12)",  border: "rgba(163,230,53,0.4)" },
];
export const colorFor = (name) => PALETTE.find(p => p.name === name) || PALETTE[0];

export const PRIORITY_RANK = { high: 3, medium: 2, low: 1 };
export const priorityMeta = {
  low:    { label: "low",    color: "var(--text-2)", bg: "var(--surface-3)" },
  medium: { label: "medium", color: "var(--amber)",  bg: "rgba(245,166,35,0.15)" },
  high:   { label: "high",   color: "var(--red)",    bg: "rgba(248,113,113,0.15)" },
};

export const taskStatusMeta = {
  todo:        { label: "todo",        icon: Circle,        color: "var(--text-2)" },
  in_progress: { label: "in progress", icon: CircleDot,     color: "var(--amber)" },
  review:      { label: "review",      icon: AlertTriangle, color: "var(--blue)" },
  done:        { label: "done",        icon: CheckCircle2,  color: "var(--green)" },
};

export const NEXT_STATUS = { todo: "in_progress", in_progress: "review", review: "done", done: "done" };

export const nameOf = (id, employees, users) => {
  const found = [...(users||[]), ...(employees||[])].find(x => x.id === id);
  return found ? found.name : id;
};
