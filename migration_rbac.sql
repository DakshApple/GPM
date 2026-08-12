-- RBAC Migration: Run this in Supabase SQL Editor
-- Creates the accounts table and pre-seeds 3 admin accounts

CREATE TABLE IF NOT EXISTS public.gpm_accounts (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    display_name TEXT NOT NULL,
    email TEXT,
    role TEXT DEFAULT 'member',
    assigned_project_ids JSONB DEFAULT '[]',
    feature_access JSONB DEFAULT '["dashboard","projects","tasks","tickets"]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pre-seed admin accounts
INSERT INTO public.gpm_accounts (id, username, password, display_name, role, feature_access) VALUES
('acc-admin1', 'admin1', 'Gpm@Secure2024', 'Admin One', 'admin', '["all"]'),
('acc-admin2', 'admin2', 'Gpm@Admin4829', 'Admin Two', 'admin', '["all"]'),
('acc-admin3', 'admin3', 'Gpm@Master7156', 'Admin Three', 'admin', '["all"]')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.gpm_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon read/write accounts" ON public.gpm_accounts FOR ALL USING (true);
