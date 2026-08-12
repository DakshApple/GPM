import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://attbpsintsvbzgkjacby.supabase.co";
const SUPABASE_KEY = "sb_publishable_H64WUt66keAHJsS8DJr-aQ_yUs7bLZu";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const tablesToEmpty = [
  'gpm_projects',
  'gpm_tasks',
  'gpm_modules',
  'gpm_updates',
  'gpm_suggestions',
  'gpm_tickets',
  'gpm_employees',
  'gpm_users' // legacy table
];

(async () => {
  console.log("🧹 Starting Database Cleanup...");

  // 1. Empty all general data tables
  for (const table of tablesToEmpty) {
    console.log(`Clearing ${table}...`);
    // Delete all rows where id is not null (which is all rows)
    const { error } = await supabase.from(table).delete().neq('id', 'null_placeholder_that_never_matches');
    if (error) {
      console.error(`❌ Failed to clear ${table}:`, error.message);
    } else {
      console.log(`✅ Cleared ${table}`);
    }
  }

  // 2. Clear members from gpm_accounts (keep admins)
  console.log("Clearing team members from gpm_accounts (keeping admins)...");
  const { error: accError } = await supabase.from('gpm_accounts').delete().eq('role', 'member');
  if (accError) {
    console.error("❌ Failed to clear members:", accError.message);
  } else {
    console.log("✅ Cleared team members");
  }

  console.log("🎉 Database cleanup complete! Ready for production.");
})();
