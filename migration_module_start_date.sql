-- Run this in your Supabase SQL Editor to add start_date to modules

ALTER TABLE public.gpm_modules ADD COLUMN start_date TEXT;
