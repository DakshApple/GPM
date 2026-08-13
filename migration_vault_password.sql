-- Run this in your Supabase SQL Editor

-- 1. Add vault_password to gpm_projects
ALTER TABLE public.gpm_projects
ADD COLUMN IF NOT EXISTS vault_password TEXT;
