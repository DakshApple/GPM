import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://attbpsintsvbzgkjacby.supabase.co";
const SUPABASE_KEY = "sb_publishable_H64WUt66keAHJsS8DJr-aQ_yUs7bLZu";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function createAdmin() {
  const username = "admin";
  const password = "adminpassword123";
  const email = `${username}@gpm.local`;

  console.log(`Signing up ${email}...`);
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password
  });

  if (authError) {
    console.error("Auth Error:", authError.message);
    if (!authError.message.includes("already registered")) {
      return;
    }
  }

  // Log in to get session so we can insert into gpm_accounts
  console.log("Logging in...");
  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (loginError) {
    console.error("Login Error:", loginError.message);
    return;
  }

  const userId = loginData.user.id;
  console.log("Logged in as:", userId);

  const accRow = {
    id: "acc-admin-001",
    username,
    display_name: "Super Admin",
    role: "admin",
    supabase_uid: userId,
    assigned_project_ids: [],
    feature_access: [],
    password: password
  };

  console.log("Upserting gpm_accounts...");
  const { error: dbError } = await supabase.from('gpm_accounts').upsert(accRow);
  if (dbError) {
    console.error("DB Error:", dbError.message);
    return;
  }
  console.log("Admin account created successfully!");
  console.log(`Username: ${username}`);
  console.log(`Password: ${password}`);
}

createAdmin();
