import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FolderKanban, ListTodo, User, Command } from 'lucide-react';
import { Toast, QuickAddFAB } from './components/ui';
import { Sidebar, CommandPalette } from './components/layout';
import { NewProjectModal, TaskModal, NewEmployeeModal } from './components/modals';
import { AuthScreen } from './views/AuthScreen';
import { Dashboard } from './views/Dashboard';
import { CalendarView } from './views/CalendarView';
import { TimelineView } from './views/TimelineView';
import { ProjectsView } from './views/ProjectsView';
import { ProjectDetail } from './views/ProjectDetail';
import { TasksView } from './views/TasksView';
import { TeamView, SuggestionsView } from './views/index'; // The file I just created
import { TicketsView } from './views/TicketsView';
import { store } from './services/storage';
import { supabaseAuth } from './services/auth';
import { runSchedulerV2 } from './services/scheduler';
import { KEYS, NEXT_STATUS } from './utils/constants';
import { uid, toISO, addDays, today } from './utils/date';

import { ClientLogin, ClientPortal } from './views/ClientPortal';
import { api } from './services/db';

export default function App() {
  const [init, setInit] = useState(false);
  const [user, setUser] = useState(null);
  const [clientProject, setClientProject] = useState(null);
  
  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [modules, setModules] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [tickets, setTickets] = useState([]);
  
  const [view, setView] = useState("dashboard");
  const [openProjectId, setOpenProjectId] = useState(null);
  
  const [toast, setToast] = useState(null);
  const showToast = (message, kind="default") => setToast({ message, kind });

  // modals
  const [showPalette, setShowPalette] = useState(false);
  const [showNP, setShowNP] = useState(false);
  const [taskModalInitial, setTaskModalInitial] = useState(null);
  const [showNE, setShowNE] = useState(false);

  // load
  useEffect(() => {
    (async () => {
      try {
        const uList = await api.getTable('gpm_users');
        setUsers(uList);
        const session = await supabaseAuth.loadSession();
        if (session) {
          const found = uList.find(x => x.supabaseUid === session.user.id);
          if (found) setUser(found);
        }
      } catch (err) {
        console.error("Auth error:", err);
      }
      setEmployees(await api.getTable('gpm_employees'));
      setProjects(await api.getTable('gpm_projects'));
      setTasks(await api.getTable('gpm_tasks'));
      setModules(await api.getTable('gpm_modules'));
      setUpdates(await api.getTable('gpm_updates'));
      setSuggestions(await api.getTable('gpm_suggestions'));
      setTickets(await api.getTable('gpm_tickets'));
      setInit(true);
    })();
  }, []);

  const runScheduler = useCallback((d) => {
    if (!d.projects) return;
    const suggs = runSchedulerV2(d);
    setSuggestions(suggs);
    suggs.forEach(s => api.upsertRow('gpm_suggestions', s));
    if (suggs.length > 0 && suggs.filter(s => s.status==="pending").length > 0) {
      showToast(`${suggs.filter(s => s.status==="pending").length} AI suggestions pending`, "ai");
    }
  }, []);

  // Actions
  const createProject = async (p) => { await api.upsertRow('gpm_projects', p); const n = [...projects, p]; setProjects(n); runScheduler({ projects:n, employees, tasks, modules, users }); showToast(`project "${p.name}" created`); };
  const updateProject = async (p) => { await api.upsertRow('gpm_projects', p); const n = projects.map(x => x.id===p.id?p:x); setProjects(n); runScheduler({ projects:n, employees, tasks, modules, users }); showToast("project saved"); };
  const deleteProject = async (id) => { await api.deleteRow('gpm_projects', id); const n = projects.filter(x => x.id!==id); setProjects(n); if(openProjectId===id)setOpenProjectId(null); runScheduler({ projects:n, employees, tasks, modules, users }); showToast("project deleted"); };
  const markProjectDelivered = async (id) => { const p = projects.find(x=>x.id===id); if(!p)return; const updated = {...p, status:"delivered", deadline:today()}; await api.upsertRow('gpm_projects', updated); const n = projects.map(x => x.id===id?updated:x); setProjects(n); runScheduler({ projects:n, employees, tasks, modules, users }); showToast("project delivered 🎉"); };
  
  const createTask = async (t) => { await api.upsertRow('gpm_tasks', t); const n = [...tasks, t]; setTasks(n); runScheduler({ projects, employees, tasks:n, modules, users }); showToast(`task "${t.title}" added`); };
  const updateTask = async (t) => { await api.upsertRow('gpm_tasks', t); const n = tasks.map(x => x.id===t.id?t:x); setTasks(n); runScheduler({ projects, employees, tasks:n, modules, users }); };
  const deleteTask = async (id) => { await api.deleteRow('gpm_tasks', id); const n = tasks.filter(x => x.id!==id); setTasks(n); runScheduler({ projects, employees, tasks:n, modules, users }); };
  const advanceTask = async (id) => {
    const t = tasks.find(x => x.id === id); if(!t || t.status==="done") return;
    const next = NEXT_STATUS[t.status];
    const updated = {...t, status:next};
    await api.upsertRow('gpm_tasks', updated);
    const n = tasks.map(x => x.id===id ? updated : x);
    setTasks(n); runScheduler({ projects, employees, tasks:n, modules, users });
  };
  
  const createModule = async (m) => { await api.upsertRow('gpm_modules', m); const n = [...modules, m]; setModules(n); runScheduler({ projects, employees, tasks, modules:n, users }); };
  const updateModuleObj = async (m) => { await api.upsertRow('gpm_modules', m); const n = modules.map(x => x.id===m.id?m:x); setModules(n); runScheduler({ projects, employees, tasks, modules:n, users }); };
  const deleteModule = async (id) => { await api.deleteRow('gpm_modules', id); const n = modules.filter(x => x.id!==id); setModules(n); runScheduler({ projects, employees, tasks, modules:n, users }); };
  
  const addEmployee = async (e) => { await api.upsertRow('gpm_employees', e); const n = [...employees, e]; setEmployees(n); runScheduler({ projects, employees:n, tasks, modules, users }); showToast(`added ${e.name}`); };
  const addUpdate = async (u) => { await api.upsertRow('gpm_updates', u); setUpdates([...updates, u]); };

  const applySuggestion = async (id) => {
    const s = suggestions.find(x => x.id === id); if(!s) return;
    let nP = projects, nT = tasks, nM = modules;
    if (s.action === "reschedule_task") {
      const target = tasks.find(t=>t.id===s.taskId); if(target) { const u = {...target, deadline:s.proposedTaskDeadline}; await api.upsertRow('gpm_tasks', u); nT = tasks.map(t => t.id === s.taskId ? u : t); setTasks(nT); }
    } else if (s.action === "reschedule_module") {
      const target = modules.find(m=>m.id===s.moduleId); if(target) { const u = {...target, deadline:s.proposedModuleDeadline}; await api.upsertRow('gpm_modules', u); nM = modules.map(m => m.id === s.moduleId ? u : m); setModules(nM); }
    } else if (s.action === "reschedule_project") {
      const target = projects.find(p=>p.id===s.projectId); if(target) { const u = {...target, startDate:s.proposedStart, deadline:s.proposedDeadline}; await api.upsertRow('gpm_projects', u); nP = projects.map(p => p.id === s.projectId ? u : p); setProjects(nP); }
    } else if (s.action === "reassign_task") {
      const target = tasks.find(t=>t.id===s.taskId); if(target) { const u = {...target, assigneeId:s.suggestedAssigneeId}; await api.upsertRow('gpm_tasks', u); nT = tasks.map(t => t.id === s.taskId ? u : t); setTasks(nT); }
    }
    const updatedS = {...s, status:"applied"};
    await api.upsertRow('gpm_suggestions', updatedS);
    const ns = suggestions.map(x => x.id === id ? updatedS : x);
    setSuggestions(ns);
    runScheduler({ projects:nP, employees, tasks:nT, modules:nM, users });
    showToast("suggestion applied", "ai");
  };
  
  const dismissSuggestion = async (id) => {
    const s = suggestions.find(x => x.id === id); if(!s) return;
    const updatedS = {...s, status:"dismissed"};
    await api.upsertRow('gpm_suggestions', updatedS);
    setSuggestions(suggestions.map(x => x.id === id ? updatedS : x));
  };

  useEffect(() => {
    const down = (e) => { if(e.key==="k" && (e.metaKey||e.ctrlKey)) { e.preventDefault(); setShowPalette(true); } };
    document.addEventListener("keydown", down); return () => document.removeEventListener("keydown", down);
  }, []);

  const logout = async () => { await supabaseAuth.clearSession(); setUser(null); };

  useEffect(() => {
    const handleHash = () => {
      if (window.location.hash === "#client") {
        if (!clientProject) setClientProject("login");
      } else {
        if (clientProject) setClientProject(null);
      }
    };
    window.addEventListener("hashchange", handleHash);
    handleHash();
    return () => window.removeEventListener("hashchange", handleHash);
  }, [clientProject]);

  const actions = useMemo(() => [
    { label:"new project", icon:FolderKanban, run:() => setShowNP(true) },
    { label:"new task", icon:ListTodo, run:() => setTaskModalInitial({}) },
    { label:"add team member", icon:User, run:() => setShowNE(true) },
  ], []);
  
  const jumpTargets = useMemo(() => {
    const v = ["dashboard","calendar","timeline","projects","tasks","team","ai"].map(id => ({ label:`go to ${id}`, icon:Command, run:() => setView(id) }));
    const p = projects.filter(p=>p.status!=="delivered").map(p => ({ label:`open ${p.name}`, icon:FolderKanban, hint:p.client, run:() => setOpenProjectId(p.id) }));
    return [...v, ...p];
  }, [projects]);

  const counts = {
    projects: projects.filter(p=>p.status!=="delivered").length,
    tasks: tasks.filter(t=>t.status!=="done").length,
    suggestions: suggestions.filter(s=>s.status==="pending").length,
    tickets: tickets.filter(t=>t.status==="open").length,
  };

  if (!init) return <div style={{height:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"var(--bg)", color:"var(--text)"}}>...</div>;
  
  if (clientProject) {
    if (clientProject === "login") return <ClientLogin onLogin={p => setClientProject(p)} />;
    return <ClientPortal project={clientProject} onLogout={() => { setClientProject(null); window.location.hash=""; }} />;
  }

  if (!user) return <AuthScreen onAuth={setUser} />;

  return (
    <div style={{ display:"flex", height:"100vh", overflow:"hidden" }}>
      <Sidebar view={view} setView={setView} user={user} counts={counts} onLogout={logout} onOpenPalette={() => setShowPalette(true)} />
      
      {view === "dashboard" && <Dashboard projects={projects} employees={employees} users={users} updates={updates} suggestions={suggestions} tasks={tasks} modules={modules} user={user} setView={setView} setOpenProjectId={setOpenProjectId} openTaskById={(id) => setTaskModalInitial(tasks.find(x=>x.id===id))} />}
      {view === "calendar" && <CalendarView projects={projects} tasks={tasks} onOpenProject={setOpenProjectId} openTaskById={(id) => setTaskModalInitial(tasks.find(x=>x.id===id))} />}
      {view === "timeline" && <TimelineView projects={projects} tasks={tasks} onOpenProject={setOpenProjectId} />}
      {view === "projects" && <ProjectsView projects={projects} employees={employees} users={users} tasks={tasks} onOpenProject={setOpenProjectId} onNewProject={() => setShowNP(true)} />}
      {view === "tasks" && <TasksView tasks={tasks} projects={projects} employees={employees} users={users} currentUser={user} openTaskById={(id) => setTaskModalInitial(tasks.find(x=>x.id===id))} onNewTask={setTaskModalInitial} onAdvanceTask={advanceTask} />}
      {view === "team" && <TeamView users={users} employees={employees} projects={projects} tasks={tasks} onNewEmployee={() => setShowNE(true)} />}
      {view === "ai" && <SuggestionsView suggestions={suggestions} applySuggestion={applySuggestion} dismissSuggestion={dismissSuggestion} />}
      {view === "tickets" && <TicketsView tickets={tickets} projects={projects} onResolve={async (id) => { const tk = tickets.find(x=>x.id===id); if(tk){ await api.upsertRow('gpm_tickets', {...tk, status:'resolved'}); setTickets(tickets.map(x=>x.id===id?{...tk,status:'resolved'}:x)); } }} onConvertToTask={(tk) => { setTaskModalInitial({ projectId: tk.projectId, title: tk.message, priority: tk.priority, deadline: tk.deadline, clientTitle: tk.message, isClientVisible: true }); }} />}

      {openProjectId && <ProjectDetail project={projects.find(p=>p.id===openProjectId)} projects={projects} employees={employees} users={users} updates={updates} tasks={tasks} modules={modules} onClose={()=>setOpenProjectId(null)} onSave={updateProject} onDelete={deleteProject} onAddUpdate={addUpdate} onMarkDelivered={markProjectDelivered} onCreateTask={createTask} onEditTask={updateTask} onAdvanceTask={advanceTask} onDeleteTask={deleteTask} onCreateModule={createModule} onUpdateModule={updateModuleObj} onDeleteModule={deleteModule} />}

      <NewProjectModal open={showNP} onClose={()=>setShowNP(false)} employees={employees} users={users} onCreate={createProject} />
      <TaskModal open={!!taskModalInitial} initial={taskModalInitial} projects={projects.filter(p=>p.status!=="delivered")} modules={modules} employees={employees} users={users} onClose={()=>setTaskModalInitial(null)} onCreate={createTask} onUpdate={updateTask} />
      <NewEmployeeModal open={showNE} onClose={()=>setShowNE(false)} onCreate={addEmployee} />

      <CommandPalette open={showPalette} onClose={()=>setShowPalette(false)} actions={actions} jumpTargets={jumpTargets} />
      <QuickAddFAB onClick={() => setShowPalette(true)} />
      {toast && <Toast message={toast.message} kind={toast.kind} onClose={() => setToast(null)} />}
    </div>
  );
}
