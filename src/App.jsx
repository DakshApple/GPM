import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FolderKanban, ListTodo, User, Command } from 'lucide-react';
import { Toast, QuickAddFAB } from './components/ui';
import { Sidebar, CommandPalette } from './components/layout';
import { NewProjectModal, TaskModal, NewEmployeeModal } from './components/modals';
import { ChangePasswordModal } from './components/modals/ChangePasswordModal';
import { AuthScreen } from './views/AuthScreen';
import { Dashboard } from './views/Dashboard';
import { CalendarView } from './views/CalendarView';
import { TimelineView } from './views/TimelineView';
import { ProjectsView } from './views/ProjectsView';
import { ProjectDetail } from './views/ProjectDetail';
import { TasksView } from './views/TasksView';
import { TeamView, SuggestionsView, APIVaultView } from './views/index';
import { TicketsView } from './views/TicketsView';
import { UserManagement } from './views/UserManagement';
import { IntegrationsView } from './views/IntegrationsView';
import { GoogleDriveView } from './views/GoogleDriveView';
import { GmailView } from './views/GmailView';
import { GoogleChatView } from './views/GoogleChatView';
import { store } from './services/storage';
import { suggestTaskBreakdown } from './services/heuristics';
import { mail } from './services/mail';
import { runSchedulerV2 } from './services/scheduler';
import { KEYS, NEXT_STATUS } from './utils/constants';
import { uid, toISO, addDays, today } from './utils/date';

import { ClientLogin, ClientPortal } from './views/ClientPortal';
import { api } from './services/db';

export default function App() {
  const [init, setInit] = useState(false);
  const [account, setAccount] = useState(null); // gpm_accounts row
  const [clientProject, setClientProject] = useState(null);
  
  // Legacy user compat — we create a synthetic user object from account
  const user = account ? { id: account.id, name: account.displayName, email: account.email, role: account.role, title: account.role } : null;
  
  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [taskComments, setTaskComments] = useState([]);
  const [apiVault, setApiVault] = useState([]);
  const [apiVaultAccess, setApiVaultAccess] = useState([]);
  const [modules, setModules] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [allTickets, setAllTickets] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [deliverables, setDeliverables] = useState([]);
  
  const [view, setView] = useState("dashboard");
  const [openProjectId, setOpenProjectId] = useState(null);
  
  const [toast, setToast] = useState(null);
  const showToast = (message, kind="default") => setToast({ message, kind });

  // modals
  const [showPalette, setShowPalette] = useState(false);
  const [showNP, setShowNP] = useState(false);
  const [taskModalInitial, setTaskModalInitial] = useState(null);
  const [showNE, setShowNE] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  const isAdmin = account?.role === "admin";
  const hasFeature = (f) => isAdmin || (account?.featureAccess && (account.featureAccess.includes("all") || account.featureAccess.includes(f)));

  // Scoped data — members only see assigned projects
  const projects = useMemo(() => {
    if (!account) return [];
    if (isAdmin) return allProjects;
    const assignedIds = account.assignedProjectIds || [];
    return allProjects.filter(p => assignedIds.includes(p.id));
  }, [account, allProjects, isAdmin]);

  const tasks = useMemo(() => {
    if (isAdmin) return allTasks;
    const projectIds = new Set(projects.map(p => p.id));
    return allTasks.filter(t => projectIds.has(t.projectId));
  }, [allTasks, projects, isAdmin]);

  const tickets = useMemo(() => {
    if (isAdmin) return allTickets;
    const projectIds = new Set(projects.map(p => p.id));
    return allTickets.filter(t => projectIds.has(t.projectId));
  }, [allTickets, projects, isAdmin]);

  // load
  const fetchData = async () => {
    try {
      // Try to restore session
      const savedAccount = localStorage.getItem("gpm:account");
      if (savedAccount) {
        const parsed = JSON.parse(savedAccount);
        if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
          localStorage.removeItem("gpm:account");
          setAccount(null);
        } else {
          // Validate account still exists
          const accs = await api.getTable('gpm_accounts');
          setAccounts(accs);
          const found = accs.find(a => a.id === parsed.id && a.password === parsed.password);
          if (found) setAccount(found);
          else { localStorage.removeItem("gpm:account"); setAccount(null); }
        }
      } else {
        const accs = await api.getTable('gpm_accounts');
        setAccounts(accs);
      }
    } catch (err) {
      console.error("Auth error:", err);
    }
    const [u, e, p, t, tc, v, va, m, up, s, tk, d] = await Promise.all([
      api.getTable('gpm_users'),
      api.getTable('gpm_employees'),
      api.getTable('gpm_projects'),
      api.getTable('gpm_tasks'),
      api.getTable('gpm_task_comments'),
      api.getTable('gpm_api_vault'),
      api.getTable('gpm_api_vault_access'),
      api.getTable('gpm_modules'),
      api.getTable('gpm_updates'),
      api.getTable('gpm_suggestions'),
      api.getTable('gpm_tickets'),
      api.getTable('gpm_deliverables')
    ]);
    setUsers(u); setEmployees(e); setAllProjects(p); setAllTasks(t); setTaskComments(tc); setApiVault(v); setApiVaultAccess(va);
    setModules(m); setUpdates(up); setSuggestions(s); setAllTickets(tk);
    setDeliverables(d);
    
    // Check client session
    const cs = localStorage.getItem("gpm:client_session");
    if (cs) {
      const parsed = JSON.parse(cs);
      if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
        localStorage.removeItem("gpm:client_session");
        setClientProject(prev => (prev && prev !== "login" ? "login" : prev));
      } else {
        const found = p.find(proj => proj.id === parsed.projectId);
        if (found) {
          setClientProject(prev => (prev === "login" || !prev ? found : prev));
        } else {
          localStorage.removeItem("gpm:client_session");
        }
      }
    }
  };

  useEffect(() => {
    (async () => {
      await fetchData();
      setInit(true);
    })();
    const interval = setInterval(fetchData, 15 * 1000); // Poll every 15 seconds for near real-time sync
    return () => clearInterval(interval);
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
  const createProject = async (p) => { await api.upsertRow('gpm_projects', p); const n = [...allProjects, p]; setAllProjects(n); runScheduler({ projects:n, employees, tasks:allTasks, modules, users }); showToast(`project "${p.name}" created`); };
  const updateProject = async (p) => { await api.upsertRow('gpm_projects', p); const n = allProjects.map(x => x.id===p.id?p:x); setAllProjects(n); runScheduler({ projects:n, employees, tasks:allTasks, modules, users }); showToast("project saved"); };
  const createTaskComment = async (comment) => { await api.upsertRow('gpm_task_comments', comment); setTaskComments([...taskComments, comment]); };
  const updateTaskComment = async (comment) => { await api.upsertRow('gpm_task_comments', comment); setTaskComments(taskComments.map(c => c.id === comment.id ? comment : c)); };

  const addCredential = async (cred) => { await api.upsertRow('gpm_api_vault', cred); setApiVault([...apiVault, cred]); showToast("Credential added to Vault"); };
  const deleteCredential = async (id) => { await api.deleteRow('gpm_api_vault', id); setApiVault(apiVault.filter(c => c.id !== id)); showToast("Credential removed"); };

  const deleteProject = async (id) => { await api.deleteRow('gpm_projects', id); const n = allProjects.filter(x => x.id!==id); setAllProjects(n); if(openProjectId===id)setOpenProjectId(null); runScheduler({ projects:n, employees, tasks:allTasks, modules, users }); showToast("project deleted"); };
  const markProjectDelivered = async (id) => { const p = allProjects.find(x=>x.id===id); if(!p)return; const updated = {...p, status:"delivered", deadline:today()}; await api.upsertRow('gpm_projects', updated); const n = allProjects.map(x => x.id===id?updated:x); setAllProjects(n); runScheduler({ projects:n, employees, tasks:allTasks, modules, users }); showToast("project delivered 🎉"); };
  
  const createTask = async (t) => { await api.upsertRow('gpm_tasks', t); const n = [...allTasks, t]; setAllTasks(n); runScheduler({ projects:allProjects, employees, tasks:n, modules, users }); showToast(`task "${t.title}" added`); };
  const updateTask = async (t) => { await api.upsertRow('gpm_tasks', t); const n = allTasks.map(x => x.id===t.id?t:x); setAllTasks(n); runScheduler({ projects:allProjects, employees, tasks:n, modules, users }); };
  const deleteTask = async (id) => { await api.deleteRow('gpm_tasks', id); const n = allTasks.filter(x => x.id!==id); setAllTasks(n); runScheduler({ projects:allProjects, employees, tasks:n, modules, users }); };
  const advanceTask = async (id) => {
    const t = allTasks.find(x => x.id === id); if(!t || t.status==="done") return;
    const next = NEXT_STATUS[t.status];
    const updated = {...t, status:next};
    if (next === "done") updated.completedAt = new Date().toISOString();
    await api.upsertRow('gpm_tasks', updated);
    const n = allTasks.map(x => x.id===id ? updated : x);
    setAllTasks(n); runScheduler({ projects:allProjects, employees, tasks:n, modules, users });
  };
  const updateTaskStatus = async (id, newStatus) => {
    const t = allTasks.find(x => x.id === id); if(!t || t.status === newStatus) return;
    const updated = {...t, status: newStatus};
    if (newStatus === "done") updated.completedAt = new Date().toISOString();
    await api.upsertRow('gpm_tasks', updated);
    const n = allTasks.map(x => x.id===id ? updated : x);
    setAllTasks(n); runScheduler({ projects:allProjects, employees, tasks:n, modules, users });
  };
  
  const createModule = async (m) => { await api.upsertRow('gpm_modules', m); const n = [...modules, m]; setModules(n); runScheduler({ projects:allProjects, employees, tasks:allTasks, modules:n, users }); };
  const updateModuleObj = async (m) => { await api.upsertRow('gpm_modules', m); const n = modules.map(x => x.id===m.id?m:x); setModules(n); runScheduler({ projects:allProjects, employees, tasks:allTasks, modules:n, users }); };
  const deleteModule = async (id) => { await api.deleteRow('gpm_modules', id); const n = modules.filter(x => x.id!==id); setModules(n); runScheduler({ projects:allProjects, employees, tasks:allTasks, modules:n, users }); };
  
  const addEmployee = async (e) => { await api.upsertRow('gpm_employees', e); const n = [...employees, e]; setEmployees(n); runScheduler({ projects:allProjects, employees:n, tasks:allTasks, modules, users }); showToast(`added ${e.name}`); };
  const addUpdate = async (u) => { await api.upsertRow('gpm_updates', u); setUpdates([...updates, u]); };
  
  const addDeliverable = async (d) => { await api.upsertRow('gpm_deliverables', d); setDeliverables([...deliverables, d]); };
  const deleteDeliverable = async (id) => { await api.deleteRow('gpm_deliverables', id); setDeliverables(deliverables.filter(x => x.id !== id)); };

  // Account management
  const createAccount = async (acc) => { await api.upsertRow('gpm_accounts', acc); setAccounts([...accounts, acc]); showToast(`account "${acc.username}" created`); };
  const updateAccount = async (acc) => { await api.upsertRow('gpm_accounts', acc); setAccounts(accounts.map(a => a.id === acc.id ? acc : a)); showToast("account updated"); };
  const deleteAccount = async (id) => { await api.deleteRow('gpm_accounts', id); setAccounts(accounts.filter(a => a.id !== id)); showToast("account deleted"); };

  const applySuggestion = async (id) => {
    const s = suggestions.find(x => x.id === id); if(!s) return;
    let nP = allProjects, nT = allTasks, nM = modules;
    if (s.action === "reschedule_task") {
      const target = allTasks.find(t=>t.id===s.taskId); if(target) { const u = {...target, deadline:s.proposedTaskDeadline}; await api.upsertRow('gpm_tasks', u); nT = allTasks.map(t => t.id === s.taskId ? u : t); setAllTasks(nT); }
    } else if (s.action === "reschedule_module") {
      const target = modules.find(m=>m.id===s.moduleId); if(target) { const u = {...target, deadline:s.proposedModuleDeadline}; await api.upsertRow('gpm_modules', u); nM = modules.map(m => m.id === s.moduleId ? u : m); setModules(nM); }
    } else if (s.action === "reschedule_project") {
      const target = allProjects.find(p=>p.id===s.projectId); if(target) { const u = {...target, startDate:s.proposedStart, deadline:s.proposedDeadline}; await api.upsertRow('gpm_projects', u); nP = allProjects.map(p => p.id === s.projectId ? u : p); setAllProjects(nP); }
    } else if (s.action === "reassign_task") {
      const target = allTasks.find(t=>t.id===s.taskId); if(target) { const u = {...target, assigneeId:s.suggestedAssigneeId}; await api.upsertRow('gpm_tasks', u); nT = allTasks.map(t => t.id === s.taskId ? u : t); setAllTasks(nT); }
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

  const logout = () => { localStorage.removeItem("gpm:account"); setAccount(null); };

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

  const actions = useMemo(() => {
    const a = [];
    if (isAdmin) a.push({ label:"new project", icon:FolderKanban, run:() => setShowNP(true) });
    if (hasFeature("tasks")) a.push({ label:"new task", icon:ListTodo, run:() => setTaskModalInitial({}) });
    if (isAdmin) a.push({ label:"add team member", icon:User, run:() => setShowNE(true) });
    return a;
  }, [isAdmin, account]);
  
  const jumpTargets = useMemo(() => {
    const featureViewMap = { dashboard:"dashboard", calendar:"calendar", timeline:"timeline", projects:"projects", tasks:"tasks", team_view:"team", ai:"ai", tickets:"tickets" };
    const v = Object.entries(featureViewMap).filter(([f]) => hasFeature(f)).map(([f, id]) => ({ label:`go to ${id}`, icon:Command, run:() => setView(id) }));
    const p = projects.filter(p=>p.status!=="delivered").map(p => ({ label:`open ${p.name}`, icon:FolderKanban, hint:p.client, run:() => setOpenProjectId(p.id) }));
    return [...v, ...p];
  }, [projects, account]);

  const counts = {
    projects: projects.filter(p=>p.status!=="delivered").length,
    tasks: tasks.filter(t=>t.status!=="done").length,
    suggestions: suggestions.filter(s=>s.status==="pending").length,
    tickets: tickets.filter(t=>t.status==="open").length,
  };

  const handleChangePassword = async (newPassword) => {
    const updated = {...account, password: newPassword};
    await api.upsertRow('gpm_accounts', updated);
    setAccount(updated);
    setAccounts(accounts.map(a => a.id === account.id ? updated : a));
    localStorage.setItem("gpm:account", JSON.stringify(updated));
    showToast("password changed successfully");
  };

  // Resolve ticket with project-scoped email routing
  const resolveTicket = async (id) => {
    const tk = tickets.find(x=>x.id===id);
    if(!tk) return;
    await api.upsertRow('gpm_tickets', {...tk, status:'resolved'});
    setAllTickets(allTickets.map(x=>x.id===id?{...tk,status:'resolved'}:x));
    const proj = allProjects.find(p=>p.id===tk.projectId);
    // Email client
    if (proj && proj.clientEmail) {
      mail.sendTicketResolved(proj.clientEmail, tk.id, tk.message, proj.name);
    }
    // Email assigned members
    const assignedMembers = accounts.filter(a => a.role === 'member' && a.email && (a.assignedProjectIds || []).includes(tk.projectId));
    assignedMembers.forEach(m => {
      mail.sendProjectMemberNotification(m.email, `Ticket Resolved: ${tk.id} - ${proj?.name}`, `The ticket "${tk.message}" has been resolved.`);
    });
  };

  if (!init) return <div style={{height:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"var(--bg)", color:"var(--text)"}}>...</div>;
  
  if (clientProject) {
    if (clientProject === "login") return <ClientLogin onLogin={p => setClientProject(p)} />;
    return <ClientPortal project={clientProject} onLogout={() => { localStorage.removeItem("gpm:client_session"); setClientProject(null); window.location.hash=""; }} />;
  }

  if (!account) return <AuthScreen onAuth={(acc) => { setAccount(acc); setAccounts(prev => { const existing = prev.find(a=>a.id===acc.id); return existing ? prev : [...prev, acc]; }); }} />;

  return (
    <div style={{ display:"flex", height:"100vh", overflow:"hidden" }}>
      <Sidebar view={view} setView={setView} account={account} counts={counts} onLogout={logout} onOpenPalette={() => setShowPalette(true)} onChangePassword={() => setShowChangePassword(true)} />
      
      {view === "dashboard" && hasFeature("dashboard") && <Dashboard projects={projects} employees={employees} users={users} updates={updates} suggestions={suggestions} tasks={tasks} modules={modules} user={user} setView={setView} setOpenProjectId={setOpenProjectId} openTaskById={(id) => setTaskModalInitial(tasks.find(x=>x.id===id))} />}
      {view === "calendar" && hasFeature("calendar") && <CalendarView projects={projects} tasks={tasks} employees={employees} users={users} onOpenProject={setOpenProjectId} openTaskById={(id) => setTaskModalInitial(tasks.find(x=>x.id===id))} />}
      {view === "timeline" && hasFeature("timeline") && <TimelineView projects={projects} tasks={tasks} onOpenProject={setOpenProjectId} />}
      {view === "projects" && hasFeature("projects") && <ProjectsView projects={projects} employees={employees} users={users} tasks={tasks} onOpenProject={setOpenProjectId} onNewProject={isAdmin ? () => setShowNP(true) : undefined} />}
      {view === "tasks" && hasFeature("tasks") && <TasksView tasks={tasks} projects={projects} employees={employees} users={users} currentUser={user} openTaskById={(id) => setTaskModalInitial(tasks.find(x=>x.id===id))} onNewTask={setTaskModalInitial} onAdvanceTask={advanceTask} onUpdateTaskStatus={updateTaskStatus} />}
      {view === "team" && hasFeature("team_view") && <TeamView users={users} employees={employees} projects={projects} tasks={tasks} onNewEmployee={isAdmin ? () => setShowNE(true) : undefined} />}
      {view === "ai" && hasFeature("ai") && <SuggestionsView suggestions={suggestions} applySuggestion={applySuggestion} dismissSuggestion={dismissSuggestion} />}
      {view === "tickets" && hasFeature("tickets") && <TicketsView tickets={tickets} projects={projects} onResolve={resolveTicket} onConvertToTask={(tk) => { setTaskModalInitial({ projectId: tk.projectId, title: tk.message, priority: tk.priority, deadline: tk.deadline, clientTitle: tk.message, isClientVisible: true }); }} />}
      {view === "manage_users" && isAdmin && <UserManagement accounts={accounts} projects={allProjects} onCreateAccount={createAccount} onUpdateAccount={updateAccount} onDeleteAccount={deleteAccount} />}
      {view === "integrations" && <IntegrationsView account={account} />}
      {view === "drive" && <GoogleDriveView account={account} />}
      {view === "gmail" && <GmailView account={account} />}
      {view === "gchat" && <GoogleChatView account={account} />}
      {view === "vault" && hasFeature("vault") && <APIVaultView account={account} projects={projects} apiVault={apiVault} apiVaultAccess={apiVaultAccess} onAddCredential={addCredential} onDeleteCredential={deleteCredential} onUpdateProject={updateProject} />}

      {openProjectId && <ProjectDetail project={projects.find(p=>p.id===openProjectId)} projects={projects} employees={employees} users={users} updates={updates} tasks={tasks} modules={modules} deliverables={deliverables} onClose={()=>setOpenProjectId(null)} onSave={updateProject} onDelete={deleteProject} onAddUpdate={addUpdate} onAddDeliverable={addDeliverable} onDeleteDeliverable={deleteDeliverable} onMarkDelivered={markProjectDelivered} onCreateTask={createTask} onEditTask={updateTask} onAdvanceTask={advanceTask} onDeleteTask={deleteTask} onCreateModule={createModule} onUpdateModule={updateModuleObj} onDeleteModule={deleteModule} />}

      {isAdmin && <NewProjectModal open={showNP} onClose={()=>setShowNP(false)} employees={employees} users={users} onCreate={createProject} />}
      <TaskModal open={!!taskModalInitial} initial={taskModalInitial} projects={projects.filter(p=>p.status!=="delivered")} modules={modules} employees={employees} users={users} allTasks={allTasks} taskComments={taskComments} account={account} onClose={()=>setTaskModalInitial(null)} onCreate={createTask} onUpdate={updateTask} onCreateComment={createTaskComment} onUpdateComment={updateTaskComment} />
      {isAdmin && <NewEmployeeModal open={showNE} onClose={()=>setShowNE(false)} onCreate={addEmployee} />}
      <ChangePasswordModal open={showChangePassword} account={account} onClose={() => setShowChangePassword(false)} onChangePassword={handleChangePassword} />

      <CommandPalette open={showPalette} onClose={()=>setShowPalette(false)} actions={actions} jumpTargets={jumpTargets} />
      <QuickAddFAB onClick={() => setShowPalette(true)} />
      {toast && <Toast message={toast.message} kind={toast.kind} onClose={() => setToast(null)} />}
    </div>
  );
}
