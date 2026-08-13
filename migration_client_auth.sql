-- 1. Add client authentication columns to gpm_projects
ALTER TABLE public.gpm_projects ADD COLUMN IF NOT EXISTS client_password TEXT;
ALTER TABLE public.gpm_projects ADD COLUMN IF NOT EXISTS client_emails JSONB DEFAULT '[]'::jsonb;

-- 2. Update RLS on gpm_projects to check client_emails
DROP POLICY IF EXISTS "Projects Select" ON public.gpm_projects;
CREATE POLICY "Projects Select" ON public.gpm_projects FOR SELECT USING (
  auth.uid() IS NOT NULL AND (
    -- Client access if their email is in the client_emails JSON array
    EXISTS (SELECT 1 FROM jsonb_array_elements_text(COALESCE(client_emails, '[]'::jsonb)) e WHERE e = auth.email()) OR
    -- Fallback for older projects
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

-- 3. Create a SECURITY DEFINER function for clients to join a project securely
CREATE OR REPLACE FUNCTION public.join_project_as_client(p_id TEXT, p_password TEXT, p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated privileges to bypass RLS for this specific check
AS $$
DECLARE
    v_password TEXT;
    v_emails JSONB;
BEGIN
    -- Get the project's client password and emails
    SELECT client_password, COALESCE(client_emails, '[]'::jsonb) INTO v_password, v_emails
    FROM public.gpm_projects
    WHERE id = p_id;

    -- If project doesn't exist or password doesn't match, return false
    IF v_password IS NULL OR v_password != p_password THEN
        RETURN FALSE;
    END IF;

    -- If email is already in the array, do nothing but return true (they are already joined)
    IF v_emails ? p_email THEN
        RETURN TRUE;
    END IF;

    -- Otherwise, append the email to the array
    UPDATE public.gpm_projects
    SET client_emails = v_emails || jsonb_build_array(p_email)
    WHERE id = p_id;

    RETURN TRUE;
END;
$$;
