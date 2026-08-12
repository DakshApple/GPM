-- Run this in your Supabase SQL Editor to add the missing columns

ALTER TABLE public.gpm_projects ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.gpm_projects ADD COLUMN IF NOT EXISTS estimated_days NUMERIC;
ALTER TABLE public.gpm_projects ADD COLUMN IF NOT EXISTS priority TEXT;
ALTER TABLE public.gpm_projects ADD COLUMN IF NOT EXISTS owner_id TEXT;

ALTER TABLE public.gpm_tasks ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE public.gpm_modules ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.gpm_modules ADD COLUMN IF NOT EXISTS "order" NUMERIC;

ALTER TABLE public.gpm_updates ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE public.gpm_updates ADD COLUMN IF NOT EXISTS requested_deadline TEXT;
