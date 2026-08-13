import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = "https://attbpsintsvbzgkjacby.supabase.co";
const SUPABASE_KEY = "sb_publishable_H64WUt66keAHJsS8DJr-aQ_yUs7bLZu";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
(async () => {
    console.log("Upserting project...");
    const row = {
        id: "p-test1",
        name: "Test Project",
        client: "Test Client",
        start_date: "2024-01-01",
        deadline: "2024-12-31",
        status: "active",
        color: "blue",
        type: "web",
        member_ids: [],
        portal_password: "test"
    };
    const { data, error } = await supabase.from('gpm_projects').upsert(row).select();
    if (error) console.error("Error:", error);
    else console.log("Data:", data);
})();
