import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://attbpsintsvbzgkjacby.supabase.co";
const SUPABASE_KEY = "sb_publishable_H64WUt66keAHJsS8DJr-aQ_yUs7bLZu";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  const { data, error } = await supabase.from('gpm_accounts').upsert({
    id: "test-acc-123",
    username: "testuser",
    display_name: "Test User",
    email: "test@example.com",
    password: "password123",
    role: "member",
    assigned_project_ids: [],
    feature_access: []
  }).select();
  
  if (error) {
    console.error("Error:", error.message, error.details, error.hint);
  } else {
    console.log("Success! Account created.");
    await supabase.from('gpm_accounts').delete().eq('id', 'test-acc-123');
  }
}
run();
