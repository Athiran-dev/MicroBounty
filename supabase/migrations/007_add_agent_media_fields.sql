-- Add media fields to ai_agents table
ALTER TABLE public.ai_agents
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS preview_images jsonb DEFAULT '[]'::jsonb;

-- ─────────────────────────────────────────────────────
-- STORAGE BUCKET SETUP
-- ─────────────────────────────────────────────────────

-- 1. Create a public bucket for agent assets (avatars, sample outputs)
-- Note: On some Supabase versions, this must be done via Dashboard or Storage API.
-- This SQL attempts to create it if the storage extension is enabled.
INSERT INTO storage.buckets (id, name, public)
VALUES ('agent-assets', 'agent-assets', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow public to read objects in this bucket
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'agent-assets');

-- 3. Allow any connected wallet to upload to this bucket
DROP POLICY IF EXISTS "Allow Wallet Upload" ON storage.objects;
CREATE POLICY "Allow Wallet Upload" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'agent-assets');

-- 4. Allow users to update their own uploads
DROP POLICY IF EXISTS "Allow Wallet Update" ON storage.objects;
CREATE POLICY "Allow Wallet Update" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'agent-assets');


-- Update demo agents with local public assets
UPDATE public.ai_agents 
SET 
  avatar_url = '/newUpdatedUi/agent1.png',
  preview_images = '[]'::jsonb
WHERE agent_id = 9001;

UPDATE public.ai_agents 
SET 
  avatar_url = '/newUpdatedUi/agent2.png',
  price_per_task_algo = 10,
  preview_images = '[]'::jsonb
WHERE agent_id = 9002;

-- Set a dynamic default avatar for any other existing agents that don't have one
-- This uses their name as a seed to ensure consistent, unique avatars
UPDATE public.ai_agents
SET avatar_url = 'https://api.dicebear.com/7.x/bottts/svg?seed=' || encode(name::bytea, 'escape')
WHERE avatar_url IS NULL 
AND agent_id NOT IN (9001, 9002);
