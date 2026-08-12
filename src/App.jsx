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

import { store } from './services/storage';
import { supabaseAuth } from './services/auth';
import { runSchedulerV2 } from './services/scheduler';
import { KEYS, NEXT_STATUS } from './utils/constants';
import { uid, toISO, addDays, today } from './utils/date';

export default function App() {
  const [init, setInit] = useState(false);
  const [user, setUser] = useState(null);
  
  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [modules, setModules] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  
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
        const session = await supabaseAuth.loadSession();
        if (session) {
          const uList = (await store.get(KEYS.users)) || [];
          const found = uList.find(x => x.supabaseUid === session.user.id);
          if (found) setUser(found);
        }
      } catch (err) {
        console.error("Auth error:", err);
      }
      setUsers(await store.get(KEYS.users, []));
      setEmployees(await store.get(KEYS.employees, []));
      setProjects(await store.get(KEYS.projects, []));
      setTasks(await store.get(KEYS.tasks, []));
      setModules(await store.get(KEYS.modules, []));
      setUpdates(await store.get(KEYS.updates, []));
      setSuggestions(await store.get(KEYS.suggestions, []));
      setInit(true);
    })();
  }, []);

  const runScheduler = useCallback((d) => {
    if (!d.projects) return;
    const suggs = runSchedulerV2(d);
    setSuggestions(suggs);
    store.set(KEYS.suggestions, suggs);
    if (suggs.length > 0 && suggs.filter(s => s.status==="pending").length > 0) {
      showToast(`${suggs.filter(s => s.status==="pending").length} AI suggestions pending`, "ai");
    }
  }, []);

  const updateState = useCallback((key, val, dataObj = {}) => {
    store.set(key, val);
    if (key===KEYS.projects) setProjects(val);
    else if (key===KEYS.tasks) setTasks(val);
    else if (key===KEYS.modules) setModules(val);
    else if (key===KEYS.employees) setEmployees(val);
    else if (key===KEYS.updates) setUpdates(val);
    
    // Trigger scheduler
    runScheduler({ projects: dataObj.p||(key===KEYS.projects?val:projects), employees: dataObj.e||(key===KEYS.employees?val:employees), tasks: dataObj.t||(key===KEYS.tasks?val:tasks), modules: dataObj.m||(key===KEYS.modules?val:modules), users });
  }, [projects, employees, tasks, modules, users, runScheduler]);

  // Actions
  const createProject = (p) => { const n = [...projects, p]; updateState(KEYS.projects, n, {p:n}); showToast(`project "${p.name}" created`); };
  const updateProject = (p) => { const n = projects.map(x => x.id===p.id?p:x); updateState(KEYS.projects, n, {p:n}); showToast("project saved"); };
  const deleteProject = (id) => { const n = projects.filter(x => x.id!==id); updateState(KEYS.projects, n, {p:n}); if(openProjectId===id)setOpenProjectId(null); showToast("project deleted"); };
  const markProjectDelivered = (id) => { const n = projects.map(x => x.id===id?{...x,status:"delivered",deadline:today()}:x); updateState(KEYS.projects, n, {p:n}); showToast("project delivered \uD83C\uDF89"); };
  
  const createTask = (t) => { const n = [...tasks, t]; updateState(KEYS.tasks, n, {t:n}); showToast(`task "${t.title}" added`); };
  const updateTask = (t) => { const n = tasks.map(x => x.id===t.id?t:x); updateState(KEYS.tasks, n, {t:n}); };
  const deleteTask = (id) => { const n = tasks.filter(x => x.id!==id); updateState(KEYS.tasks, n, {t:n}); };
  const advanceTask = (id) => {
    const t = tasks.find(x => x.id === id); if(!t || t.status==="done") return;
    const next = NEXT_STATUS[t.status];
    const n = tasks.map(x => x.id===id ? {...x, status:next} : x);
    updateState(KEYS.tasks, n, {t:n});
  };
  
  const createModule = (m) => { const n = [...modules, m]; updateState(KEYS.modules, n, {m:n}); };
  const updateModuleObj = (m) => { const n = modules.map(x => x.id===m.id?m:x); updateState(KEYS.modules, n, {m:n}); };
  const deleteModule = (id) => { const n = modules.filter(x => x.id!==id); updateState(KEYS.modules, n, {m:n}); };
  
  const addEmployee = (e) => { const n = [...employees, e]; updateState(KEYS.employees, n, {e:n}); showToast(`added ${e.name}`); };
  const addUpdate = (u) => { const n = [...updates, u]; updateState(KEYS.updates, n); };

  const applySuggestion = (id) => {
    const s = suggestions.find(x => x.id === id); if(!s) return;
    if (s.action === "reschedule_task") {
      const n = tasks.map(t => t.id === s.taskId ? {...t, deadline:s.proposedTaskDeadline} : t);
      updateState(KEYS.tasks, n, {t:n});
    } else if (s.action === "reschedule_module") {
      const n = modules.map(m => m.id === s.moduleId ? {...m, deadline:s.proposedModuleDeadline} : m);
      updateState(KEYS.modules, n, {m:n});
    } else if (s.action === "reschedule_project") {
      const n = projects.map(p => p.id === s.projectId ? {...p, startDate:s.proposedStart, deadline:s.proposedDeadline} : p);
      updateState(KEYS.projects, n, {p:n});
    } else if (s.action === "reassign_task") {
      const n = tasks.map(t => t.id === s.taskId ? {...t, assigneeId:s.suggestedAssigneeId} : t);
      updateState(KEYS.tasks, n, {t:n});
    }
    const ns = suggestions.map(x => x.id === id ? {...x, status:"applied"} : x);
    setSuggestions(ns); store.set(KEYS.suggestions, ns);
    showToast("suggestion applied", "ai");
  };
  
  const dismissSuggestion = (id) => {
    const ns = suggestions.map(x => x.id === id ? {...x, status:"dismissed"} : x);
    setSuggestions(ns); store.set(KEYS.suggestions, ns);
  };

  useEffect(() => {
    const down = (e) => { if(e.key==="k" && (e.metaKey||e.ctrlKey)) { e.preventDefault(); setShowPalette(true); } };
    document.addEventListener("keydown", down); return () => document.removeEventListener("keydown", down);
  }, []);

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

  if (!init) return null;
  if (!user) return <AuthScreen onAuth={setUser} />;

  const counts = {
    projects: projects.filter(p=>p.status!=="delivered").length,
    tasks: tasks.filter(t=>t.status!=="done").length,
    suggestions: suggestions.filter(s=>s.status==="pending").length,
  };

  const logout = async () => { await supabaseAuth.clearSession(); setUser(null); };

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
