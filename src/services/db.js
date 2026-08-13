import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://attbpsintsvbzgkjacby.supabase.co";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_H64WUt66keAHJsS8DJr-aQ_yUs7bLZu";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Secondary client for admin provisioning (doesn't overwrite current session)
export const secondarySupabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  }
});

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

export const api = {
  async getTable(table) {
    const { data, error } = await supabase.from(table).select('*');
    if (error) console.error(error);
    return mapKeys(data || [], toCamel);
  },
  async upsertRow(table, row) {
    const snakeRow = mapKeys(row, toSnake);
    const { data, error } = await supabase.from(table).upsert(snakeRow).select();
    if (error) console.error(error);
    return data?.[0] ? mapKeys(data[0], toCamel) : row;
  },
  async deleteRow(table, id) {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) console.error(error);
    return !error;
  }
};
