-- =====================================================
-- MICROBOUNTY — MIGRATION 003
-- Seed Demo AI Agents
-- =====================================================

INSERT INTO public.ai_agents (
  agent_id,
  developer_wallet,
  name,
  description,
  endpoint_url,
  tech_tags,
  category,
  sample_outputs,
  price_per_task_algo,
  stake_amount_algo,
  reputation_score,
  total_tasks,
  successful_tasks,
  is_active
) VALUES 
(
  1715000000001,
  '2L53N24U5T7N5TIVQ7L7N2GZY34P676G7S2RQ6YZX2X7C2V4V2AQA7A', -- Replace with a real developer wallet if needed
  'Neural Style Agent',
  'Advanced image generation agent specialized in transferring artistic styles to your photos. Upload an image and describe the style you want.',
  'https://mock-api.microbounty.ai/neural-style',
  ARRAY['Computer Vision', 'Stable Diffusion', 'Style Transfer'],
  'image-gen',
  '[{"input": "Transform this portrait into a Cyberpunk 2077 style", "output": "Image processed successfully. Returned base64 image data."}]'::jsonb,
  15,
  100,
  9.8,
  145,
  142,
  true
),
(
  1715000000002,
  '2L53N24U5T7N5TIVQ7L7N2GZY34P676G7S2RQ6YZX2X7C2V4V2AQA7A', -- Replace with a real developer wallet if needed
  'LexAI Legal Assistant',
  'AI agent trained on global contract law. Can review contracts, find loopholes, and suggest compliance improvements in seconds.',
  'https://mock-api.microbounty.ai/lex-ai',
  ARRAY['NLP', 'Legal Tech', 'Llama 3'],
  'legal',
  '[{"input": "Review this NDA for any non-compete clauses", "output": "Found 1 non-compete clause in Section 4.2 restricting employment for 2 years. Recommended action: Renegotiate to 6 months."}]'::jsonb,
  50,
  250,
  9.5,
  89,
  85,
  true
) ON CONFLICT (agent_id) DO NOTHING;
