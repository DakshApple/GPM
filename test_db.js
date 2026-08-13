import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = "https://attbpsintsvbzgkjacby.supabase.co";
const SUPABASE_KEY = "sb_publishable_H64WUt66keAHJsS8DJr-aQ_yUs7bLZu";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
(async () => {
    console.log("Fetching users...");
    const { data, error } = await supabase.from('gpm_users').select('*');
    if (error) console.error("Error:", error);
    else console.log("Data:", data);
})();
