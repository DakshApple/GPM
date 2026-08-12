import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = "https://attbpsintsvbzgkjacby.supabase.co";
const SUPABASE_KEY = "sb_publishable_H64WUt66keAHJsS8DJr-aQ_yUs7bLZu";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const toSnake = (str) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
const toCamel = (str) => str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
const mapKeys = (obj, fn) => {
  if (Array.isArray(obj)) return obj.map(v => mapKeys(v, fn));
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => { acc[fn(key)] = obj[key]; return acc; }, {});
  }
  return obj;
};

const api = {
  async getTable(table) {
    const { data, error } = await supabase.from(table).select('*');
    if (error) throw new Error(`GET ${table}: ${error.message}`);
    return mapKeys(data || [], toCamel);
  },
  async upsertRow(table, row) {
    const snakeRow = mapKeys(row, toSnake);
    const { data, error } = await supabase.from(table).upsert(snakeRow).select();
    if (error) throw new Error(`UPSERT ${table}: ${error.message}`);
    return data?.[0] ? mapKeys(data[0], toCamel) : row;
  },
  async deleteRow(table, id) {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw new Error(`DELETE ${table}: ${error.message}`);
    return true;
  }
};

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) { console.log(`  ✅ ${testName}`); passed++; }
  else { console.error(`  ❌ ${testName}`); failed++; }
}

(async () => {
  console.log("═══════════════════════════════════════════");
  console.log("       GPM FULL QA TEST SUITE");
  console.log("═══════════════════════════════════════════\n");

  // ─── TEST 1: ACCOUNTS TABLE EXISTS ───
  console.log("📋 TEST 1: Accounts Table");
  try {
    const accounts = await api.getTable('gpm_accounts');
    assert(Array.isArray(accounts), "gpm_accounts table exists and is readable");
    assert(accounts.length >= 3, `Found ${accounts.length} accounts (expected ≥ 3 admins)`);
    
    const admin1 = accounts.find(a => a.username === 'admin1');
    assert(!!admin1, "admin1 account exists");
    assert(admin1?.role === 'admin', "admin1 has admin role");
    assert(admin1?.password === 'Gpm@Secure2024', "admin1 password is correct");
    
    const admin2 = accounts.find(a => a.username === 'admin2');
    assert(!!admin2, "admin2 account exists");
    
    const admin3 = accounts.find(a => a.username === 'admin3');
    assert(!!admin3, "admin3 account exists");
  } catch(e) { console.error(`  ❌ FATAL: ${e.message}`); failed++; }

  // ─── TEST 2: CREATE TEAM MEMBER ───
  console.log("\n📋 TEST 2: Create Team Member");
  try {
    const member = {
      id: 'acc-qa-preet', username: 'preet_qa', password: 'Preet@123',
      displayName: 'Preet QA', email: 'preet@test.com', role: 'member',
      assignedProjectIds: [], featureAccess: ['dashboard', 'projects', 'tasks', 'tickets']
    };
    const result = await api.upsertRow('gpm_accounts', member);
    assert(result.username === 'preet_qa', "Member 'preet_qa' created successfully");
    assert(result.role === 'member', "Member has 'member' role");
    assert(Array.isArray(result.featureAccess), "featureAccess is an array");
    assert(result.featureAccess.includes('dashboard'), "Member has 'dashboard' feature");
    assert(result.featureAccess.includes('tasks'), "Member has 'tasks' feature");
    assert(!result.featureAccess.includes('ai'), "Member does NOT have 'ai' feature");
    assert(!result.featureAccess.includes('manage_users'), "Member does NOT have 'manage_users' feature");
  } catch(e) { console.error(`  ❌ FATAL: ${e.message}`); failed++; }

  // ─── TEST 3: PROJECT ASSIGNMENT ───
  console.log("\n📋 TEST 3: Project Assignment");
  try {
    // Create a test project
    const proj = {
      id: 'proj-qa-test', name: 'QA Project', client: 'QA Client',
      status: 'active', startDate: '2024-01-01', deadline: '2024-12-31',
      color: 'blue', memberIds: [], portalPassword: 'qa123'
    };
    await api.upsertRow('gpm_projects', proj);
    assert(true, "Test project created");

    // Assign project to member
    const updatedMember = {
      id: 'acc-qa-preet', username: 'preet_qa', password: 'Preet@123',
      displayName: 'Preet QA', email: 'preet@test.com', role: 'member',
      assignedProjectIds: ['proj-qa-test'], featureAccess: ['dashboard', 'projects', 'tasks', 'tickets']
    };
    const result = await api.upsertRow('gpm_accounts', updatedMember);
    assert(result.assignedProjectIds.includes('proj-qa-test'), "Project assigned to member");
  } catch(e) { console.error(`  ❌ FATAL: ${e.message}`); failed++; }

  // ─── TEST 4: TICKET CREATION WITH PRIORITY/DEADLINE ───
  console.log("\n📋 TEST 4: Ticket with Priority & Deadline");
  try {
    const ticket = {
      id: 'REQ-QA-001', projectId: 'proj-qa-test', message: 'QA Test Ticket',
      priority: 'high', deadline: '2024-06-30', status: 'open', isEdited: false
    };
    const result = await api.upsertRow('gpm_tickets', ticket);
    assert(result.priority === 'high', "Ticket priority saved correctly");
    assert(result.deadline === '2024-06-30', "Ticket deadline saved correctly");
    assert(result.isEdited === false, "Ticket isEdited flag is false");
  } catch(e) { console.error(`  ❌ FATAL: ${e.message}`); failed++; }

  // ─── TEST 5: TICKET EDIT (isEdited flag) ───
  console.log("\n📋 TEST 5: Ticket Edit Flag");
  try {
    const editedTicket = {
      id: 'REQ-QA-001', projectId: 'proj-qa-test', message: 'QA Test Ticket EDITED',
      priority: 'medium', deadline: '2024-07-15', status: 'open', isEdited: true
    };
    const result = await api.upsertRow('gpm_tickets', editedTicket);
    assert(result.isEdited === true, "isEdited flag set to true after edit");
    assert(result.message === 'QA Test Ticket EDITED', "Ticket message updated");
    assert(result.priority === 'medium', "Ticket priority updated");
  } catch(e) { console.error(`  ❌ FATAL: ${e.message}`); failed++; }

  // ─── TEST 6: TICKET RESOLUTION ───
  console.log("\n📋 TEST 6: Ticket Resolution");
  try {
    const resolved = {
      id: 'REQ-QA-001', projectId: 'proj-qa-test', message: 'QA Test Ticket EDITED',
      priority: 'medium', deadline: '2024-07-15', status: 'resolved', isEdited: true
    };
    const result = await api.upsertRow('gpm_tickets', resolved);
    assert(result.status === 'resolved', "Ticket status changed to resolved");
  } catch(e) { console.error(`  ❌ FATAL: ${e.message}`); failed++; }

  // ─── TEST 7: TASK CREATION WITH CLIENT FIELDS ───
  console.log("\n📋 TEST 7: Task with Client Fields");
  try {
    const task = {
      id: 'task-qa-001', projectId: 'proj-qa-test', title: 'QA Task',
      status: 'todo', priority: 'high', deadline: '2024-06-30',
      clientTitle: 'User-Facing QA Task', clientDescription: 'We are testing.',
      isClientVisible: true
    };
    const result = await api.upsertRow('gpm_tasks', task);
    assert(result.clientTitle === 'User-Facing QA Task', "clientTitle saved");
    assert(result.isClientVisible === true, "isClientVisible flag saved");
  } catch(e) { console.error(`  ❌ FATAL: ${e.message}`); failed++; }

  // ─── TEST 8: PASSWORD CHANGE ───
  console.log("\n📋 TEST 8: Password Change");
  try {
    const updated = {
      id: 'acc-qa-preet', username: 'preet_qa', password: 'NewPreet@456',
      displayName: 'Preet QA', email: 'preet@test.com', role: 'member',
      assignedProjectIds: ['proj-qa-test'], featureAccess: ['dashboard', 'projects', 'tasks', 'tickets']
    };
    const result = await api.upsertRow('gpm_accounts', updated);
    assert(result.password === 'NewPreet@456', "Password changed successfully");
    assert(result.username === 'preet_qa', "Username unchanged after password change");
  } catch(e) { console.error(`  ❌ FATAL: ${e.message}`); failed++; }

  // ─── TEST 9: FEATURE ACCESS VALIDATION LOGIC ───
  console.log("\n📋 TEST 9: Feature Dependency Logic (App-Side)");
  const FEATURE_DEPS = {
    dashboard: [], calendar: ['dashboard'], timeline: ['dashboard'],
    projects: [], tasks: ['projects'], modules: ['projects'],
    tickets: ['projects'], updates: ['projects'], team_view: [],
    ai: ['projects', 'tasks']
  };
  
  // Simulate: enabling 'tasks' without 'projects'
  const memberFeatures = ['dashboard', 'tasks'];
  const missingDeps = FEATURE_DEPS['tasks'].filter(d => !memberFeatures.includes(d));
  assert(missingDeps.length > 0, "'tasks' without 'projects' → dependency warning fires");
  assert(missingDeps.includes('projects'), "Missing dep is correctly identified as 'projects'");

  // Simulate: enabling 'ai' without 'tasks'  
  const memberFeatures2 = ['dashboard', 'projects', 'ai'];
  const missingDeps2 = FEATURE_DEPS['ai'].filter(d => !memberFeatures2.includes(d));
  assert(missingDeps2.length > 0, "'ai' without 'tasks' → dependency warning fires");
  assert(missingDeps2.includes('tasks'), "Missing dep for ai correctly identified as 'tasks'");

  // Simulate: all deps satisfied
  const memberFeatures3 = ['dashboard', 'projects', 'tasks', 'ai'];
  const missingDeps3 = FEATURE_DEPS['ai'].filter(d => !memberFeatures3.includes(d));
  assert(missingDeps3.length === 0, "'ai' with 'projects' + 'tasks' → no warnings");

  // ─── TEST 10: DATA SCOPING LOGIC ───
  console.log("\n📋 TEST 10: Data Scoping Logic");
  const allProjects = await api.getTable('gpm_projects');
  const memberAssigned = ['proj-qa-test'];
  const scopedProjects = allProjects.filter(p => memberAssigned.includes(p.id));
  assert(scopedProjects.length === 1, `Member sees 1 project (out of ${allProjects.length} total)`);
  assert(scopedProjects[0].id === 'proj-qa-test', "Member sees only their assigned project");

  const allTasks = await api.getTable('gpm_tasks');
  const scopedProjectIds = new Set(scopedProjects.map(p => p.id));
  const scopedTasks = allTasks.filter(t => scopedProjectIds.has(t.projectId));
  assert(scopedTasks.every(t => t.projectId === 'proj-qa-test'), "All scoped tasks belong to assigned project");

  // ─── CLEANUP ───
  console.log("\n🧹 Cleanup");
  await api.deleteRow('gpm_tasks', 'task-qa-001');
  await api.deleteRow('gpm_tickets', 'REQ-QA-001');
  await api.deleteRow('gpm_projects', 'proj-qa-test');
  await api.deleteRow('gpm_accounts', 'acc-qa-preet');
  console.log("  ✅ Test data cleaned up");

  // ─── RESULTS ───
  console.log("\n═══════════════════════════════════════════");
  console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
  console.log("═══════════════════════════════════════════");
  if (failed === 0) console.log("  🎉 ALL TESTS PASSED!");
  else console.log("  ⚠️  SOME TESTS FAILED — see above");
})();
