import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = "https://attbpsintsvbzgkjacby.supabase.co";
const SUPABASE_KEY = "sb_publishable_H64WUt66keAHJsS8DJr-aQ_yUs7bLZu";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const toSnake = (str) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
const toCamel = (str) => str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());

const mapKeys = (obj, fn) => {
  if (Array.isArray(obj)) return obj.map(v => mapKeys(v, fn));
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      acc[fn(key)] = obj[key];
      return acc;
    }, {});
  }
  return obj;
};

const api = {
  async getTable(table) {
    const { data, error } = await supabase.from(table).select('*');
    if (error) { console.error("GET ERROR:", error); throw error; }
    return mapKeys(data || [], toCamel);
  },
  async upsertRow(table, row) {
    const snakeRow = mapKeys(row, toSnake);
    const { data, error } = await supabase.from(table).upsert(snakeRow).select();
    if (error) { console.error("UPSERT ERROR on " + table + ":", error); throw error; }
    return data?.[0] ? mapKeys(data[0], toCamel) : row;
  }
};

(async () => {
    console.log("--- QA SCRIPT START ---");
    try {
        const pid = "test-project-" + Date.now();
        console.log("1. Creating Project");
        await api.upsertRow('gpm_projects', {
            id: pid, name: "QA Project", client: "QA Client", status: "planning", 
            startDate: "2024-01-01", deadline: "2024-12-31", color: "blue",
            memberIds: [], portalPassword: "qa"
        });

        console.log("2. Submitting Ticket from Client Portal (with new fields)");
        const tkId = "ticket-" + Date.now();
        await api.upsertRow('gpm_tickets', {
            id: tkId, projectId: pid, message: "QA request",
            priority: "high", deadline: "2024-08-30", status: "open"
        });

        console.log("3. Fetching tickets");
        const tickets = await api.getTable('gpm_tickets');
        const insertedTicket = tickets.find(t => t.id === tkId);
        if (!insertedTicket || insertedTicket.priority !== "high" || insertedTicket.deadline !== "2024-08-30") {
            throw new Error("Ticket fields did not save correctly! " + JSON.stringify(insertedTicket));
        }
        
        console.log("4. Converting Ticket to Task");
        await api.upsertRow('gpm_tasks', {
            id: "task-" + Date.now(), projectId: pid, title: insertedTicket.message,
            priority: insertedTicket.priority, deadline: insertedTicket.deadline,
            clientTitle: insertedTicket.message, isClientVisible: true, status: "todo"
        });

        console.log("5. Resolving Ticket");
        await api.upsertRow('gpm_tickets', {
            ...insertedTicket, status: 'resolved'
        });

        console.log("--- QA PASSED PERFECTLY ---");
    } catch(err) {
        console.error("QA FAILED:", err);
    }
})();
