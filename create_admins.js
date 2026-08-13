import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://attbpsintsvbzgkjacby.supabase.co";
const SUPABASE_KEY = "sb_publishable_H64WUt66keAHJsS8DJr-aQ_yUs7bLZu";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const ADMINS = [
  { username: 'sandeepadmin', displayName: 'Sandeep', password: 'adminpassword123' }
];

async function createAdmins() {
  for (const admin of ADMINS) {
    const email = `${admin.username}@gpm.local`;
    console.log(`\nProcessing ${admin.username}...`);
    
    // 1. Sign up in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password: admin.password
    });
    
    if (authError) {
      console.error(`Auth Error for ${admin.username}:`, authError.message);
      if (!authError.message.includes("already registered")) {
        continue;
      }
    } else {
        console.log("Signed up successfully!");
    }

    // 2. Log in to get session
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password: admin.password
    });

    if (loginError) {
      console.error(`Login Error for ${admin.username}:`, loginError.message);
      continue;
    }

    const userId = loginData.user.id;
    console.log(`Logged in ${admin.username} successfully. UID: ${userId}`);

    // 3. Upsert into gpm_accounts
    const accRow = {
      id: `acc-${admin.username}-001`,
      username: admin.username,
      display_name: admin.displayName,
      role: 'admin',
      supabase_uid: userId,
      assigned_project_ids: [],
      feature_access: [],
      password: admin.password
    };

    const { error: dbError } = await supabase.from('gpm_accounts').upsert(accRow);
    if (dbError) {
      console.error(`DB Error for ${admin.username}:`, dbError.message);
    } else {
      console.log(`Success! Created/Updated ${admin.displayName} as Admin.`);
    }
  }
}

createAdmins();
