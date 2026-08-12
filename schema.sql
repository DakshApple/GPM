-- Run this in your Supabase SQL Editor

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create Tables
CREATE TABLE public.gpm_users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    role TEXT,
    title TEXT,
    supabase_uid UUID
);

CREATE TABLE public.gpm_employees (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT,
    skills JSONB,
    type TEXT
);

CREATE TABLE public.gpm_projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    client TEXT,
    start_date TEXT,
    deadline TEXT,
    status TEXT,
    color TEXT,
    type TEXT,
    member_ids JSONB,
    portal_password TEXT
);

CREATE TABLE public.gpm_modules (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES public.gpm_projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status TEXT,
    deadline TEXT
);

CREATE TABLE public.gpm_tasks (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES public.gpm_projects(id) ON DELETE CASCADE,
    module_id TEXT,
    assignee_id TEXT,
    title TEXT NOT NULL,
    status TEXT,
    priority TEXT,
    deadline TEXT,
    estimated_hours NUMERIC,
    
    -- Client Facing Fields
    client_title TEXT,
    client_description TEXT,
    is_client_visible BOOLEAN DEFAULT false
);

CREATE TABLE public.gpm_updates (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES public.gpm_projects(id) ON DELETE CASCADE,
    text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.gpm_tickets (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES public.gpm_projects(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'open',
    priority TEXT DEFAULT 'medium',
    deadline TEXT,
    is_edited BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.gpm_suggestions (
    id TEXT PRIMARY KEY,
    type TEXT,
    project_id TEXT,
    task_id TEXT,
    module_id TEXT,
    severity TEXT,
    reason TEXT,
    action TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Set up Row Level Security (RLS) to allow public access for the prototype
-- WARNING: In a production app with sensitive client data, you would restrict these 
-- using Supabase Auth and RLS policies. For this rapid prototype, we allow anon access 
-- so our custom password-based Client Portal can fetch the data.

ALTER TABLE public.gpm_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gpm_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gpm_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gpm_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gpm_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gpm_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gpm_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gpm_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read/write users" ON public.gpm_users FOR ALL USING (true);
CREATE POLICY "Allow anon read/write employees" ON public.gpm_employees FOR ALL USING (true);
CREATE POLICY "Allow anon read/write projects" ON public.gpm_projects FOR ALL USING (true);
CREATE POLICY "Allow anon read/write modules" ON public.gpm_modules FOR ALL USING (true);
CREATE POLICY "Allow anon read/write tasks" ON public.gpm_tasks FOR ALL USING (true);
CREATE POLICY "Allow anon read/write updates" ON public.gpm_updates FOR ALL USING (true);
CREATE POLICY "Allow anon read/write tickets" ON public.gpm_tickets FOR ALL USING (true);
CREATE POLICY "Allow anon read/write suggestions" ON public.gpm_suggestions FOR ALL USING (true);
