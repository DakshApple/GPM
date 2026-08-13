-- Auth Architecture Update

-- 1. Add notification_email to gpm_accounts
ALTER TABLE public.gpm_accounts ADD COLUMN IF NOT EXISTS notification_email text;

-- 2. Add client_username to gpm_projects
ALTER TABLE public.gpm_projects ADD COLUMN IF NOT EXISTS client_username text;
