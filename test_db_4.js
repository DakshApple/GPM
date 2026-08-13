import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = "https://attbpsintsvbzgkjacby.supabase.co";
const SUPABASE_KEY = "sb_publishable_H64WUt66keAHJsS8DJr-aQ_yUs7bLZu";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
(async () => {
    // try inserting a project with all fields
    const row = {
        id: "p-test-full",
        name: "Full Test",
        client: "Client",
        start_date: "2024-01-01",
        deadline: "2024-12-31",
        status: "active",
        color: "blue",
        member_ids: [],
        portal_password: "test",
        description: "Desc",
        estimated_days: 10,
        priority: "medium",
        owner_id: "u-123"
    };
    const { data, error } = await supabase.from('gpm_projects').upsert(row).select();
    if (error) console.error("Error inserting full project:", error);
    else console.log("Success inserting full project:", data);
})();
