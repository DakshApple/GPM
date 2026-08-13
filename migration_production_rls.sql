-- Production Readiness RLS Architecture Rewrite

-- 1. DROP all old permissive "Allow anon" policies
DROP POLICY IF EXISTS "Allow anon read/write users" ON public.gpm_users;
DROP POLICY IF EXISTS "Allow anon read/write employees" ON public.gpm_employees;
DROP POLICY IF EXISTS "Allow anon read/write projects" ON public.gpm_projects;
DROP POLICY IF EXISTS "Allow anon read/write modules" ON public.gpm_modules;
DROP POLICY IF EXISTS "Allow anon read/write tasks" ON public.gpm_tasks;
DROP POLICY IF EXISTS "Allow anon read/write updates" ON public.gpm_updates;
DROP POLICY IF EXISTS "Allow anon read/write tickets" ON public.gpm_tickets;
DROP POLICY IF EXISTS "Allow anon read/write suggestions" ON public.gpm_suggestions;
DROP POLICY IF EXISTS "Allow anon read/write accounts" ON public.gpm_accounts;

-- 2. ACCOUNTS Table Policies
-- Only authenticated users should even attempt access
CREATE POLICY "Accounts Select" ON public.gpm_accounts FOR SELECT USING (
  auth.uid() IS NOT NULL AND (
    supabase_uid = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.gpm_accounts a WHERE a.supabase_uid = auth.uid() AND a.role = 'admin')
  )
);

CREATE POLICY "Accounts Update" ON public.gpm_accounts FOR UPDATE USING (
  auth.uid() IS NOT NULL AND 
  EXISTS (SELECT 1 FROM public.gpm_accounts a WHERE a.supabase_uid = auth.uid() AND a.role = 'admin')
);

-- 3. PROJECTS Table Policies
CREATE POLICY "Projects Select" ON public.gpm_projects FOR SELECT USING (
  auth.uid() IS NOT NULL AND (
    -- Client access via email magic link
    client_email = auth.email() OR
    -- Internal Team access
    EXISTS (
      SELECT 1 FROM public.gpm_accounts a 
      WHERE a.supabase_uid = auth.uid() 
      AND (
        a.role = 'admin' OR 
        gpm_projects.id IN (SELECT jsonb_array_elements_text(a.assigned_project_ids))
      )
    )
  )
);

CREATE POLICY "Projects Write" ON public.gpm_projects FOR ALL USING (
  auth.uid() IS NOT NULL AND 
  EXISTS (SELECT 1 FROM public.gpm_accounts a WHERE a.supabase_uid = auth.uid() AND (a.role = 'admin' OR a.role = 'member'))
);

-- 4. CHILD TABLES Policies (Tasks, Modules, Tickets, Updates)
-- Relies on RLS cascading from gpm_projects

CREATE POLICY "Tasks Select" ON public.gpm_tasks FOR SELECT USING (
  project_id IN (SELECT id FROM public.gpm_projects)
);
CREATE POLICY "Tasks Write" ON public.gpm_tasks FOR ALL USING (
  project_id IN (SELECT id FROM public.gpm_projects)
);

CREATE POLICY "Modules Select" ON public.gpm_modules FOR SELECT USING (
  project_id IN (SELECT id FROM public.gpm_projects)
);
CREATE POLICY "Modules Write" ON public.gpm_modules FOR ALL USING (
  project_id IN (SELECT id FROM public.gpm_projects)
);

CREATE POLICY "Tickets Select" ON public.gpm_tickets FOR SELECT USING (
  project_id IN (SELECT id FROM public.gpm_projects)
);
CREATE POLICY "Tickets Write" ON public.gpm_tickets FOR ALL USING (
  project_id IN (SELECT id FROM public.gpm_projects)
);

CREATE POLICY "Updates Select" ON public.gpm_updates FOR SELECT USING (
  project_id IN (SELECT id FROM public.gpm_projects)
);
CREATE POLICY "Updates Write" ON public.gpm_updates FOR ALL USING (
  project_id IN (SELECT id FROM public.gpm_projects)
);

-- 5. Drop the plaintext password columns (Security measure)
-- We use a DO block to avoid errors if they are already dropped
DO $$ 
BEGIN
  BEGIN
    ALTER TABLE public.gpm_projects DROP COLUMN portal_password;
  EXCEPTION
    WHEN undefined_column THEN
      NULL;
  END;
END $$;
