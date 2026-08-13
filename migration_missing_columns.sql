-- Add missing columns to support all features

-- Projects
ALTER TABLE public.gpm_projects ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.gpm_projects ADD COLUMN IF NOT EXISTS owner_id TEXT;
ALTER TABLE public.gpm_projects ADD COLUMN IF NOT EXISTS estimated_days NUMERIC;
ALTER TABLE public.gpm_projects ADD COLUMN IF NOT EXISTS priority TEXT;
ALTER TABLE public.gpm_projects ADD COLUMN IF NOT EXISTS is_ongoing BOOLEAN DEFAULT false;

-- Tasks
ALTER TABLE public.gpm_tasks ADD COLUMN IF NOT EXISTS description TEXT;

-- Modules
ALTER TABLE public.gpm_modules ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.gpm_tasks ADD COLUMN IF NOT EXISTS completed_at TEXT;
