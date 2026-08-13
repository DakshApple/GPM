import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://attbpsintsvbzgkjacby.supabase.co";
const SUPABASE_KEY = "sb_publishable_H64WUt66keAHJsS8DJr-aQ_yUs7bLZu";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  const { data, error } = await supabase.from('gpm_employees').upsert({
    id: "test-emp-123",
    name: "Test Employee",
    role: "Developer",
    skills: ["React"]
  }).select();
  
  if (error) {
    console.error("Error:", error.message, error.details, error.hint);
  } else {
    console.log("Success! Employee created.");
    await supabase.from('gpm_employees').delete().eq('id', 'test-emp-123');
  }
}
run();
