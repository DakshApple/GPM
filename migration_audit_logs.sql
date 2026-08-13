-- Create Audit Logs table
CREATE TABLE IF NOT EXISTS public.gpm_logs (
    id TEXT PRIMARY KEY,
    actor_id TEXT,
    actor_name TEXT,
    actor_role TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add deleted_by column to tickets table for soft deletion
ALTER TABLE public.gpm_tickets 
ADD COLUMN IF NOT EXISTS deleted_by TEXT;

-- Enable RLS for logs
ALTER TABLE public.gpm_logs ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users/clients to read/write for the prototype
CREATE POLICY "Allow anon read/write logs" ON public.gpm_logs FOR ALL USING (true);
