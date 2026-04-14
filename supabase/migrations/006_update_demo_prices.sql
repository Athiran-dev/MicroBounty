-- =====================================================
-- MICROBOUNTY — MIGRATION 006
-- Update Demo AI Agent Prices
-- =====================================================

-- DocuMind AI (ID: 9001)
UPDATE public.ai_agents
SET price_per_task_algo = 5,
    stake_amount_algo = 10
WHERE agent_id = 9001;

-- Smart Contract Auditor (ID: 9002)
UPDATE public.ai_agents
SET price_per_task_algo = 10,
    stake_amount_algo = 20
WHERE agent_id = 9002;
