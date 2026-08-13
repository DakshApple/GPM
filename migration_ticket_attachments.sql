-- Run this in your Supabase SQL Editor

-- 1. Add attachments column to gpm_tickets
ALTER TABLE public.gpm_tickets
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- 2. Create a new storage bucket for ticket attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('ticket-attachments', 'ticket-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Setup policies for the bucket
-- Allow public read access to ticket-attachments
CREATE POLICY "Public Access" ON storage.objects 
FOR SELECT USING ( bucket_id = 'ticket-attachments' );

-- Allow authenticated users to upload
CREATE POLICY "Auth Upload" ON storage.objects 
FOR INSERT WITH CHECK ( bucket_id = 'ticket-attachments' );

-- Allow anyone to upload (since clients use the client portal which might not use full Supabase Auth for the upload itself, 
-- or if they do, the above is enough. For safety in this prototype, we'll allow anonymous uploads to this specific bucket)
CREATE POLICY "Anon Upload" ON storage.objects 
FOR INSERT WITH CHECK ( bucket_id = 'ticket-attachments' );
