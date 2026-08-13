-- Run this in your Supabase SQL Editor to create the new Vault table

CREATE TABLE public.gpm_deliverables (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES public.gpm_projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Set up Row Level Security (RLS) to allow public access for the prototype
ALTER TABLE public.gpm_deliverables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon read/write deliverables" ON public.gpm_deliverables FOR ALL USING (true);
