import { uid, toISO, addDays, fromISO, fmtDate, today, isPast, daysBetween } from '../utils/date';
import { PRIORITY_RANK } from '../utils/constants';

export function runSchedulerV2({ projects, employees, tasks, modules, trigger, users }) {
  const suggestions = [];
  const active = projects.filter(p => p.status !== "delivered");
  const allPeople = [...(users||[]), ...(employees||[])];
  const nm = (id) => { const f = allPeople.find(x => x.id === id); return f ? f.name : id; };

  // ── CHECK 1: deadline cascade — task > module > project ──
  tasks.filter(t => t.status !== "done").forEach(t => {
    const proj = active.find(p => p.id === t.projectId);
    if (!proj) return;
    
    // task deadline beyond project deadline (skip if ongoing)
    if (!proj.isOngoing && t.deadline > proj.deadline) {
      suggestions.push({
        id: uid(), type: "deadline_breach", severity: "high",
        projectId: proj.id, projectName: proj.name, taskId: t.id, taskTitle: t.title,
        reason: `task "${t.title}" is due ${fmtDate(t.deadline)} but project deadline is ${fmtDate(proj.deadline)}. move task to ${fmtDate(proj.deadline)} or extend project.`,
        action: "reschedule_task", proposedTaskDeadline: proj.deadline,
        status: "pending", createdAt: new Date().toISOString(),
      });
    }
    
    // task deadline beyond its module deadline
    if (t.moduleId) {
      const mod = modules.find(m => m.id === t.moduleId);
      if (mod && t.deadline > mod.deadline) {
        suggestions.push({
          id: uid(), type: "module_breach", severity: "medium",
          projectId: proj.id, projectName: proj.name, taskId: t.id, taskTitle: t.title,
          moduleId: mod.id, moduleName: mod.name,
          reason: `task "${t.title}" is due ${fmtDate(t.deadline)} but its module "${mod.name}" closes ${fmtDate(mod.deadline)}. this module will slip.`,
          action: "reschedule_task", proposedTaskDeadline: mod.deadline,
          status: "pending", createdAt: new Date().toISOString(),
        });
      }
    }
  });

  // module deadline beyond project deadline (skip if ongoing)
  modules.forEach(mod => {
    const proj = active.find(p => p.id === mod.projectId);
    if (proj && !proj.isOngoing && mod.deadline > proj.deadline) {
      suggestions.push({
        id: uid(), type: "module_overrun", severity: "high",
        projectId: proj.id, projectName: proj.name, moduleId: mod.id, moduleName: mod.name,
        reason: `module "${mod.name}" is due ${fmtDate(mod.deadline)} but project "${proj.name}" closes ${fmtDate(proj.deadline)}. push module or extend project.`,
        action: "reschedule_module", proposedModuleDeadline: proj.deadline,
        status: "pending", createdAt: new Date().toISOString(),
      });
    }
  });

  // ── CHECK 2: same-day collision — person has tasks due same day across projects ──
  const tasksByPersonDay = {};
  tasks.filter(t => t.status !== "done").forEach(t => {
    const key = `${t.assigneeId}::${t.deadline}`;
    if (!tasksByPersonDay[key]) tasksByPersonDay[key] = [];
    tasksByPersonDay[key].push(t);
  });
  Object.entries(tasksByPersonDay).forEach(([key, tks]) => {
    if (tks.length < 2) return;
    const projectIds = [...new Set(tks.map(t => t.projectId))];
    if (projectIds.length < 2) return; // same project is fine
    const [personId, date] = key.split("::");
    const totalHours = tks.reduce((s, t) => s + (t.estimatedHours || 4), 0);
    if (totalHours <= 8) return; // fits in a day
    // find the lowest priority task to suggest moving
    const sorted = tks.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
    const toMove = sorted[0];
    const proj = active.find(p => p.id === toMove.projectId);
    suggestions.push({
      id: uid(), type: "same_day_collision", severity: "medium",
      projectId: toMove.projectId, projectName: proj?.name || "unknown",
      taskId: toMove.id, taskTitle: toMove.title,
      reason: `${nm(personId)} has ${tks.length} tasks (${totalHours}h) due ${fmtDate(date)} across ${projectIds.length} projects. "${toMove.title}" (${toMove.priority} priority) should shift by 1-2 days.`,
      action: "reschedule_task", proposedTaskDeadline: toISO(addDays(fromISO(date), 2)),
      status: "pending", createdAt: new Date().toISOString(),
    });
  });

  // ── CHECK 3: 7-day overload per person ──
  const soon = toISO(addDays(new Date(), 7));
  const byAssignee7d = {};
  tasks.filter(t => t.status !== "done" && t.deadline >= today() && t.deadline <= soon).forEach(t => {
    if (!byAssignee7d[t.assigneeId]) byAssignee7d[t.assigneeId] = { count: 0, hours: 0, tasks: [] };
    byAssignee7d[t.assigneeId].count++;
    byAssignee7d[t.assigneeId].hours += (t.estimatedHours || 4);
    byAssignee7d[t.assigneeId].tasks.push(t);
  });
  Object.entries(byAssignee7d).forEach(([aid, data]) => {
    if (data.hours <= 40) return; // 8h * 5 working days
    // find least-loaded person to suggest reassignment
    const leastLoaded = employees.find(e => e.id !== aid && (!byAssignee7d[e.id] || byAssignee7d[e.id].hours < 24));
    const lowestPriTask = data.tasks.sort((a,b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority])[0];
    const proj = active.find(p => p.id === lowestPriTask?.projectId);
    suggestions.push({
      id: uid(), type: "weekly_overload", severity: "high",
      projectId: proj?.id, projectName: proj?.name || "",
      reason: `${nm(aid)} has ${data.count} tasks (${data.hours}h) in the next 7 days — exceeds 40h capacity.${leastLoaded ? ` consider reassigning "${lowestPriTask.title}" to ${leastLoaded.name}.` : " no one available — some tasks will slip."}`,
      action: leastLoaded ? "reassign_task" : "flag",
      taskId: lowestPriTask?.id, taskTitle: lowestPriTask?.title,
      suggestedAssigneeId: leastLoaded?.id, suggestedAssigneeName: leastLoaded?.name,
      status: "pending", createdAt: new Date().toISOString(),
    });
  });

  // ── CHECK 4: project member overlap with priority resolution ──
  for (let i = 0; i < active.length; i++) {
    for (let j = i+1; j < active.length; j++) {
      const a = active[i], b = active[j];
      if (a.isOngoing || b.isOngoing) continue; // Skip overlapping checks if one is ongoing (infinite timeline)
      
      // check time overlap
      if (fromISO(a.deadline) < fromISO(b.startDate) || fromISO(b.deadline) < fromISO(a.startDate)) continue;
      const shared = a.memberIds.filter(m => b.memberIds.includes(m));
      if (shared.length === 0) continue;
      const [higher, lower] = PRIORITY_RANK[a.priority] >= PRIORITY_RANK[b.priority] ? [a, b] : [b, a];
      if (higher.priority === lower.priority) continue; // same priority — no clear winner, skip
      const pushBy = Math.max(3, Math.ceil(higher.estimatedDays / 3));
      // only suggest if we haven't already suggested this pair
      const pairKey = [higher.id, lower.id].sort().join("-");
      if (suggestions.some(s => s._pairKey === pairKey)) continue;
      suggestions.push({
        id: uid(), type: "priority_conflict", severity: "medium", _pairKey: pairKey,
        projectId: lower.id, projectName: lower.name,
        reason: `"${lower.name}" (${lower.priority}) shares ${shared.map(s=>nm(s)).join(", ")} with "${higher.name}" (${higher.priority}) during ${fmtDate(higher.startDate)}–${fmtDate(higher.deadline)}. push "${lower.name}" by ${pushBy} days so the ${higher.priority}-priority project isn't blocked.`,
        action: "reschedule_project",
        currentDeadline: lower.deadline,
        proposedDeadline: toISO(addDays(fromISO(lower.deadline), pushBy)),
        proposedStart: toISO(addDays(fromISO(lower.startDate), Math.ceil(pushBy/2))),
        status: "pending", createdAt: new Date().toISOString(),
      });
    }
  }

  // ── CHECK 5: project capacity overload (3+ projects per person) ──
  const projLoadMap = {};
  active.forEach(p => p.memberIds.forEach(m => { projLoadMap[m] = (projLoadMap[m]||0) + 1; }));
  Object.entries(projLoadMap).forEach(([mid, count]) => {
    if (count < 3) return;
    // find which projects, sorted by priority asc
    const personProjs = active.filter(p => p.memberIds.includes(mid)).sort((a,b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
    const suggest = personProjs[0]; // lowest priority
    suggestions.push({
      id: uid(), type: "capacity_overload", severity: "medium",
      projectId: suggest.id, projectName: suggest.name,
      reason: `${nm(mid)} is on ${count} active projects. "${suggest.name}" (${suggest.priority}) is the lowest priority — consider removing ${nm(mid)} or pausing this project.`,
      action: "flag",
      status: "pending", createdAt: new Date().toISOString(),
    });
  });

  // ── CHECK 6: infeasibility — remaining work vs remaining time ──
  active.forEach(proj => {
    if (proj.isOngoing) return; // Ongoing products have no deadline constraints
    const remaining = daysBetween(today(), proj.deadline);
    if (remaining < 0) return; // already overdue, separate concern
    const projTasks = tasks.filter(t => t.projectId === proj.id && t.status !== "done");
    const totalHoursLeft = projTasks.reduce((s, t) => s + (t.estimatedHours || 4), 0);
    const memberCount = Math.max(1, proj.memberIds.length);
    const availableHours = remaining * 8 * memberCount; // 8h/day per person
    if (totalHoursLeft > availableHours * 1.2) { // 20% buffer
      suggestions.push({
        id: uid(), type: "infeasible", severity: "high",
        projectId: proj.id, projectName: proj.name,
        reason: `"${proj.name}" has ${totalHoursLeft}h of open tasks but only ~${availableHours}h available (${remaining} days x ${memberCount} people x 8h). needs scope cut, more people, or deadline extension.`,
        action: "flag",
        status: "pending", createdAt: new Date().toISOString(),
      });
    }
  });

  // ── CHECK 7: overdue projects ──
  active.forEach(proj => {
    if (proj.isOngoing) return;
    if (isPast(proj.deadline)) {
      const overdueDays = daysBetween(proj.deadline, today());
      suggestions.push({
        id: uid(), type: "overdue", severity: "high",
        projectId: proj.id, projectName: proj.name,
        reason: `"${proj.name}" is ${overdueDays} day${overdueDays > 1 ? "s" : ""} past deadline (${fmtDate(proj.deadline)}). mark delivered, extend deadline, or descope.`,
        action: "flag",
        status: "pending", createdAt: new Date().toISOString(),
      });
    }
  });

  // ── CHECK 8: module slip risk — module has no tasks or all tasks stuck ──
  modules.forEach(mod => {
    const proj = active.find(p => p.id === mod.projectId);
    if (!proj) return;
    const modTasks = tasks.filter(t => t.moduleId === mod.id);
    if (modTasks.length === 0) return; // no tasks = can't assess
    const doneCount = modTasks.filter(t => t.status === "done").length;
    const remaining = daysBetween(today(), mod.deadline);
    if (remaining <= 3 && doneCount === 0 && modTasks.length >= 2) {
      suggestions.push({
        id: uid(), type: "module_at_risk", severity: "medium",
        projectId: proj.id, projectName: proj.name, moduleId: mod.id, moduleName: mod.name,
        reason: `module "${mod.name}" in "${proj.name}" has ${modTasks.length} tasks, 0 done, and only ${remaining} day${remaining !== 1 ? "s" : ""} left. high risk of slipping.`,
        action: "flag",
        status: "pending", createdAt: new Date().toISOString(),
      });
    }
  });

  return suggestions;
}
