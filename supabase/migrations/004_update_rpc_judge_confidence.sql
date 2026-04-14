-- =====================================================
-- MICROBOUNTY — MIGRATION 004
-- Add judge_confidence to ai_tasks + Update record_ai_task_result RPC
-- =====================================================

-- 1. Add column to ai_tasks
ALTER TABLE public.ai_tasks
  ADD COLUMN IF NOT EXISTS judge_confidence numeric DEFAULT 0;

-- 2. Update record_ai_task_result RPC
CREATE OR REPLACE FUNCTION public.record_ai_task_result(
  p_task_id           bigint,
  p_output_data       jsonb,
  p_judge_verdict     boolean,
  p_judge_confidence  numeric,
  p_judge_reasoning   text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agent_id bigint;
BEGIN
  -- Get agent_id before update
  SELECT agent_id INTO v_agent_id
    FROM public.ai_tasks
   WHERE task_id = p_task_id;

  -- Update the task record
  UPDATE public.ai_tasks
     SET output_data      = p_output_data,
         judge_verdict    = p_judge_verdict,
         judge_confidence = p_judge_confidence,
         judge_reasoning  = p_judge_reasoning,
         status           = CASE WHEN p_judge_verdict THEN 'judge_passed' ELSE 'judge_failed' END,
         completed_at     = now()
   WHERE task_id = p_task_id;

  -- Increment agent total_tasks
  UPDATE public.ai_agents
     SET total_tasks = total_tasks + 1
   WHERE agent_id = v_agent_id;

  -- Increment successful_tasks if judge approved
  IF p_judge_verdict = true THEN
    UPDATE public.ai_agents
       SET successful_tasks = successful_tasks + 1
     WHERE agent_id = v_agent_id;
  END IF;
END;
$$;

-- Re-grant execute permission
GRANT EXECUTE ON FUNCTION public.record_ai_task_result(bigint, jsonb, boolean, numeric, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_ai_task_result(bigint, jsonb, boolean, numeric, text) TO authenticated, anon;
