-- Run this in your Supabase SQL Editor

-- 1. Modify gpm_tasks to support sub-tasks and bug types
ALTER TABLE public.gpm_tasks
ADD COLUMN IF NOT EXISTS parent_id TEXT REFERENCES public.gpm_tasks(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS task_type TEXT DEFAULT 'task';

-- 1b. Link gpm_accounts to Supabase Auth
ALTER TABLE public.gpm_accounts
ADD COLUMN IF NOT EXISTS supabase_uid UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Create Internal Task Comments Table
CREATE TABLE IF NOT EXISTS public.gpm_task_comments (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES public.gpm_tasks(id) ON DELETE CASCADE,
    author_id TEXT NOT NULL,
    text TEXT NOT NULL,
    is_issue BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'open',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create API Vault Table
CREATE TABLE IF NOT EXISTS public.gpm_api_vault (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES public.gpm_projects(id) ON DELETE CASCADE,
    environment TEXT NOT NULL CHECK (environment IN ('development', 'production')),
    service_name TEXT NOT NULL,
    api_key TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create Production API Vault Access Table
CREATE TABLE IF NOT EXISTS public.gpm_api_vault_access (
    id TEXT PRIMARY KEY,
    vault_id TEXT NOT NULL REFERENCES public.gpm_api_vault(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    granted_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE public.gpm_task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gpm_api_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gpm_api_vault_access ENABLE ROW LEVEL SECURITY;

-- 5. Strict RLS Policies for API Vault

-- Vault Read Policy
CREATE POLICY "Select API Vault" ON public.gpm_api_vault FOR SELECT USING (
  -- Admin sees all
  EXISTS (SELECT 1 FROM public.gpm_accounts a WHERE a.supabase_uid = auth.uid() AND a.role = 'admin')
  OR
  -- Member sees Development APIs if they are assigned to the project
  (
    environment = 'development' 
    AND EXISTS (
      SELECT 1 FROM public.gpm_accounts a 
      WHERE a.supabase_uid = auth.uid() 
      AND project_id IN (SELECT jsonb_array_elements_text(a.assigned_project_ids))
    )
  )
  OR
  -- Member sees Production APIs if they are explicitly granted access
  EXISTS (
    SELECT 1 FROM public.gpm_api_vault_access acc 
    WHERE acc.vault_id = gpm_api_vault.id 
    AND acc.user_id = (SELECT id FROM public.gpm_accounts WHERE supabase_uid = auth.uid())
  )
);

-- Vault Write/Update Policy (Admins only)
CREATE POLICY "Write API Vault" ON public.gpm_api_vault FOR ALL USING (
  EXISTS (SELECT 1 FROM public.gpm_accounts a WHERE a.supabase_uid = auth.uid() AND a.role = 'admin')
);

-- 6. Strict RLS for Task Comments
CREATE POLICY "Select Task Comments" ON public.gpm_task_comments FOR SELECT USING (
  -- Admins see all
  EXISTS (SELECT 1 FROM public.gpm_accounts a WHERE a.supabase_uid = auth.uid() AND a.role = 'admin')
  OR
  -- Members see comments if they are assigned to the project the task belongs to
  EXISTS (
    SELECT 1 FROM public.gpm_tasks t
    JOIN public.gpm_accounts a ON a.supabase_uid = auth.uid()
    WHERE t.id = gpm_task_comments.task_id
    AND t.project_id IN (SELECT jsonb_array_elements_text(a.assigned_project_ids))
  )
);

CREATE POLICY "Insert Task Comments" ON public.gpm_task_comments FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);

CREATE POLICY "Update Task Comments" ON public.gpm_task_comments FOR UPDATE USING (
  -- Can only edit if they are the author OR an admin
  (author_id = (SELECT id FROM public.gpm_accounts WHERE supabase_uid = auth.uid()))
  OR
  EXISTS (SELECT 1 FROM public.gpm_accounts a WHERE a.supabase_uid = auth.uid() AND a.role = 'admin')
);
