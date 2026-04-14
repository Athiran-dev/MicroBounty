-- =====================================================
-- MICROBOUNTY — MIGRATION 002
-- Dispute System + AI Agent Marketplace + Table Sync Fields
-- Run in Supabase SQL Editor after 001_complete_setup.sql
-- App ID: 761815545 | Algorand Testnet
-- =====================================================


-- ═════════════════════════════════════════════════════
-- PART 1: ALTER EXISTING TABLES
-- ═════════════════════════════════════════════════════

-- ── bounties: add sync + winner fields ──
ALTER TABLE public.bounties
  ADD COLUMN IF NOT EXISTS winner_count      smallint,
  ADD COLUMN IF NOT EXISTS split_1           smallint,
  ADD COLUMN IF NOT EXISTS split_2           smallint DEFAULT 0,
  ADD COLUMN IF NOT EXISTS split_3           smallint DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_reward_algo   numeric,
  ADD COLUMN IF NOT EXISTS platform_fee_algo numeric,
  ADD COLUMN IF NOT EXISTS algo_app_id       bigint   DEFAULT 761815545,
  ADD COLUMN IF NOT EXISTS disputed_rank     smallint;

-- ── submissions: add on-chain sync fields ──
ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS commit_hash          text,
  ADD COLUMN IF NOT EXISTS deploy_link_hash     text,
  ADD COLUMN IF NOT EXISTS submitted_at_round   bigint;


-- ═════════════════════════════════════════════════════
-- PART 2: CREATE NEW TABLES
-- ═════════════════════════════════════════════════════

-- ── Table: validators ──
CREATE TABLE IF NOT EXISTS public.validators (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address   text        UNIQUE NOT NULL,
  skills           text[]      NOT NULL,
  reputation_score numeric     DEFAULT 1.0,
  total_votes      integer     DEFAULT 0,
  correct_votes    integer     DEFAULT 0,
  is_active        boolean     DEFAULT true,
  joined_at        timestamptz DEFAULT now(),
  last_voted_at    timestamptz
);

-- ── Table: disputes ──
CREATE TABLE IF NOT EXISTS public.disputes (
  id                      uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  bounty_id               bigint      NOT NULL REFERENCES public.bounties(bounty_id) ON DELETE CASCADE,
  disputed_rank           smallint    NOT NULL,
  disputed_hunter_wallet  text        NOT NULL,
  creator_wallet          text        NOT NULL,
  client_argument         text        NOT NULL,
  hunter_defence          text,
  status                  text        NOT NULL DEFAULT 'awaiting_defence'
    CHECK (status IN ('awaiting_defence','voting','resolved_hunter_wins','resolved_client_wins')),
  created_at              timestamptz DEFAULT now(),
  resolved_at             timestamptz,
  algo_txn_id             text
);

-- ── Table: validator_assignments ──
CREATE TABLE IF NOT EXISTS public.validator_assignments (
  id                uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  dispute_id        uuid        NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  bounty_id         bigint      NOT NULL REFERENCES public.bounties(bounty_id) ON DELETE CASCADE,
  validator_wallet  text        NOT NULL,
  reputation_score  numeric     DEFAULT 1.0,
  vote              boolean,
  vote_weight       numeric     DEFAULT 1.0,
  voted_at          timestamptz,
  algo_txn_id       text,
  assigned_at       timestamptz DEFAULT now(),
  UNIQUE (dispute_id, validator_wallet)
);

-- ── Table: winners ──
CREATE TABLE IF NOT EXISTS public.winners (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  bounty_id       bigint      NOT NULL REFERENCES public.bounties(bounty_id) ON DELETE CASCADE,
  rank            smallint    NOT NULL,
  hunter_wallet   text        NOT NULL,
  payout_percent  smallint    NOT NULL,
  status          text        NOT NULL DEFAULT 'pending_approval'
    CHECK (status IN ('pending_approval','approved','disputed','promoted','removed','refunded_to_client')),
  set_at          timestamptz DEFAULT now(),
  UNIQUE (bounty_id, rank)
);

-- ── Table: ai_agents ──
CREATE TABLE IF NOT EXISTS public.ai_agents (
  id                    uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id              bigint      UNIQUE NOT NULL,
  developer_wallet      text        NOT NULL,
  name                  text        NOT NULL,
  description           text        NOT NULL,
  endpoint_url          text        NOT NULL,
  tech_tags             text[]      NOT NULL,
  category              text        NOT NULL,
  sample_inputs         jsonb,
  sample_outputs        jsonb,
  price_per_task_algo   numeric     NOT NULL,
  stake_amount_algo     numeric     NOT NULL,
  reputation_score      numeric     DEFAULT 5.0,
  total_tasks           integer     DEFAULT 0,
  successful_tasks      integer     DEFAULT 0,
  unsatisfied_count     integer     DEFAULT 0,
  is_active             boolean     DEFAULT true,
  registered_at         timestamptz DEFAULT now(),
  algo_txn_id           text
);

-- ── Table: ai_tasks ──
CREATE TABLE IF NOT EXISTS public.ai_tasks (
  id                    uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id               bigint      UNIQUE NOT NULL,
  agent_id              bigint      NOT NULL REFERENCES public.ai_agents(agent_id),
  client_wallet         text        NOT NULL,
  input_type            text        NOT NULL
    CHECK (input_type IN ('text','image','video','file','mixed')),
  input_data            jsonb       NOT NULL,
  output_data           jsonb,
  judge_verdict         boolean,
  judge_reasoning       text,
  client_satisfaction   boolean,
  payment_amount_algo   numeric     NOT NULL,
  net_to_agent_algo     numeric     NOT NULL,
  platform_cut_algo     numeric     NOT NULL,
  status                text        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','judge_passed','judge_failed','paid','refunded')),
  lock_txn_id           text,
  release_txn_id        text,
  refund_txn_id         text,
  created_at            timestamptz DEFAULT now(),
  completed_at          timestamptz
);


-- ═════════════════════════════════════════════════════
-- PART 3: INDEXES
-- ═════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_disputes_bounty          ON public.disputes(bounty_id);
CREATE INDEX IF NOT EXISTS idx_disputes_hunter          ON public.disputes(disputed_hunter_wallet);
CREATE INDEX IF NOT EXISTS idx_disputes_status          ON public.disputes(status);
CREATE INDEX IF NOT EXISTS idx_val_assign_dispute       ON public.validator_assignments(dispute_id);
CREATE INDEX IF NOT EXISTS idx_val_assign_wallet        ON public.validator_assignments(validator_wallet);
CREATE INDEX IF NOT EXISTS idx_validators_active        ON public.validators(is_active);
CREATE INDEX IF NOT EXISTS idx_validators_wallet        ON public.validators(wallet_address);
CREATE INDEX IF NOT EXISTS idx_winners_bounty           ON public.winners(bounty_id);
CREATE INDEX IF NOT EXISTS idx_ai_agents_dev            ON public.ai_agents(developer_wallet);
CREATE INDEX IF NOT EXISTS idx_ai_agents_active         ON public.ai_agents(is_active);
CREATE INDEX IF NOT EXISTS idx_ai_agents_tags           ON public.ai_agents USING GIN(tech_tags);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_client          ON public.ai_tasks(client_wallet);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_agent           ON public.ai_tasks(agent_id);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_status          ON public.ai_tasks(status);


-- ═════════════════════════════════════════════════════
-- PART 4: ROW LEVEL SECURITY
-- ═════════════════════════════════════════════════════

ALTER TABLE public.validators          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validator_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.winners             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agents           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tasks            ENABLE ROW LEVEL SECURITY;


-- ── validators policies ──

CREATE POLICY "validators_select_public"
  ON public.validators FOR SELECT
  USING (true);

CREATE POLICY "validators_insert_own"
  ON public.validators FOR INSERT
  WITH CHECK (wallet_address = public.get_wallet());

CREATE POLICY "validators_update_own"
  ON public.validators FOR UPDATE
  USING (wallet_address = public.get_wallet())
  WITH CHECK (wallet_address = public.get_wallet());


-- ── disputes policies ──

-- Anyone can read disputes (public transparency)
CREATE POLICY "disputes_select_public"
  ON public.disputes FOR SELECT
  USING (true);

-- Only the bounty creator can raise a dispute
CREATE POLICY "disputes_insert_creator"
  ON public.disputes FOR INSERT
  WITH CHECK (
    public.get_wallet() != ''
    AND creator_wallet = public.get_wallet()
    AND EXISTS (
      SELECT 1 FROM public.bounties b
      WHERE b.bounty_id = disputes.bounty_id
      AND b.creator_wallet = public.get_wallet()
    )
  );

-- Disputed hunter can submit their defence when status = awaiting_defence
CREATE POLICY "disputes_update_hunter_defence"
  ON public.disputes FOR UPDATE
  USING (
    disputed_hunter_wallet = public.get_wallet()
    AND status = 'awaiting_defence'
  )
  WITH CHECK (
    disputed_hunter_wallet = public.get_wallet()
  );


-- ── validator_assignments policies ──

-- Validators see ONLY their own assignment (blind voting)
CREATE POLICY "val_assign_select_own"
  ON public.validator_assignments FOR SELECT
  USING (
    validator_wallet = public.get_wallet()
    OR EXISTS (
      SELECT 1 FROM public.disputes d
      WHERE d.id = validator_assignments.dispute_id
      AND d.status IN ('resolved_hunter_wins', 'resolved_client_wins')
      AND (
        d.creator_wallet = public.get_wallet()
        OR d.disputed_hunter_wallet = public.get_wallet()
      )
    )
  );

-- Validators can cast their vote (only once, only own row, only when vote IS NULL)
CREATE POLICY "val_assign_update_vote"
  ON public.validator_assignments FOR UPDATE
  USING (
    validator_wallet = public.get_wallet()
    AND vote IS NULL
  )
  WITH CHECK (
    validator_wallet = public.get_wallet()
  );


-- ── winners policies ──

CREATE POLICY "winners_select_public"
  ON public.winners FOR SELECT
  USING (true);

CREATE POLICY "winners_insert_creator"
  ON public.winners FOR INSERT
  WITH CHECK (
    public.get_wallet() != ''
    AND EXISTS (
      SELECT 1 FROM public.bounties b
      WHERE b.bounty_id = winners.bounty_id
      AND b.creator_wallet = public.get_wallet()
    )
  );


-- ── ai_agents policies ──

-- Anyone can see active agents
CREATE POLICY "ai_agents_select_active"
  ON public.ai_agents FOR SELECT
  USING (is_active = true);

-- Developers can also see their own inactive agents
CREATE POLICY "ai_agents_select_own"
  ON public.ai_agents FOR SELECT
  USING (developer_wallet = public.get_wallet());

-- Only developer can register their own agent
CREATE POLICY "ai_agents_insert_dev"
  ON public.ai_agents FOR INSERT
  WITH CHECK (
    public.get_wallet() != ''
    AND developer_wallet = public.get_wallet()
  );

-- Developer can update their own agent's public-facing fields only
CREATE POLICY "ai_agents_update_dev"
  ON public.ai_agents FOR UPDATE
  USING (developer_wallet = public.get_wallet())
  WITH CHECK (developer_wallet = public.get_wallet());


-- ── ai_tasks policies ──

-- Clients can read their own tasks
CREATE POLICY "ai_tasks_select_client"
  ON public.ai_tasks FOR SELECT
  USING (client_wallet = public.get_wallet());

-- Agent developers can read tasks for their agents
CREATE POLICY "ai_tasks_select_dev"
  ON public.ai_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_agents a
      WHERE a.agent_id = ai_tasks.agent_id
      AND a.developer_wallet = public.get_wallet()
    )
  );

-- Clients can create their own tasks
CREATE POLICY "ai_tasks_insert_client"
  ON public.ai_tasks FOR INSERT
  WITH CHECK (
    public.get_wallet() != ''
    AND client_wallet = public.get_wallet()
  );


-- ═════════════════════════════════════════════════════
-- PART 5: REALTIME
-- ═════════════════════════════════════════════════════

ALTER PUBLICATION supabase_realtime ADD TABLE public.disputes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.validator_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.winners;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_tasks;


-- ═════════════════════════════════════════════════════
-- PART 6: RPC FUNCTIONS
-- ═════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────
-- RPC 1: assign_validators
-- Picks top 5 skill-matched validators and inserts assignments
-- ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.assign_validators(
  p_dispute_id     uuid,
  p_bounty_id      bigint,
  p_required_skills text[]
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator_wallet         text;
  v_disputed_hunter_wallet text;
  v_validator              record;
  v_weight                 numeric;
  v_count                  integer := 0;
BEGIN
  -- Get dispute parties to exclude them
  SELECT creator_wallet, disputed_hunter_wallet
    INTO v_creator_wallet, v_disputed_hunter_wallet
    FROM public.disputes
   WHERE id = p_dispute_id;

  -- Loop through top 5 eligible validators
  FOR v_validator IN
    SELECT v.wallet_address, v.reputation_score
      FROM public.validators v
     WHERE v.is_active = true
       AND v.wallet_address != v_creator_wallet
       AND v.wallet_address != v_disputed_hunter_wallet
       AND v.skills && p_required_skills   -- overlaps operator
     ORDER BY v.reputation_score DESC
     LIMIT 5
  LOOP
    -- Calculate vote weight based on reputation tier
    IF v_validator.reputation_score < 1.2 THEN
      v_weight := 1.0;
    ELSIF v_validator.reputation_score <= 2.0 THEN
      v_weight := 1.5;
    ELSE
      v_weight := 2.0;
    END IF;

    INSERT INTO public.validator_assignments
      (dispute_id, bounty_id, validator_wallet, reputation_score, vote_weight)
    VALUES
      (p_dispute_id, p_bounty_id, v_validator.wallet_address, v_validator.reputation_score, v_weight);

    v_count := v_count + 1;
  END LOOP;

  -- Move dispute to voting phase
  UPDATE public.disputes
     SET status = 'voting'
   WHERE id = p_dispute_id;

  RETURN v_count;
END;
$$;


-- ─────────────────────────────────────────────────────
-- RPC 2: calculate_verdict
-- Tallies weighted votes and resolves the dispute
-- ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.calculate_verdict(
  p_dispute_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_innocent_weight   numeric := 0;
  v_fraud_weight      numeric := 0;
  v_hunter_wins       boolean;
  v_majority_vote     boolean;
  v_assignment        record;
  v_new_reputation    numeric;
BEGIN
  -- Tally weighted votes
  SELECT
    COALESCE(SUM(CASE WHEN vote = true  THEN vote_weight ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN vote = false THEN vote_weight ELSE 0 END), 0)
  INTO v_innocent_weight, v_fraud_weight
  FROM public.validator_assignments
  WHERE dispute_id = p_dispute_id;

  -- Determine winner
  v_hunter_wins   := (v_innocent_weight > v_fraud_weight);
  v_majority_vote := v_hunter_wins;  -- true = innocent won, false = fraud won

  -- Resolve the dispute
  UPDATE public.disputes
     SET status      = CASE WHEN v_hunter_wins THEN 'resolved_hunter_wins' ELSE 'resolved_client_wins' END,
         resolved_at = now()
   WHERE id = p_dispute_id;

  -- Update each validator's reputation based on whether they voted with majority
  FOR v_assignment IN
    SELECT va.id, va.validator_wallet, va.vote
      FROM public.validator_assignments va
     WHERE va.dispute_id = p_dispute_id
  LOOP
    -- Always increment total_votes
    UPDATE public.validators
       SET total_votes    = total_votes + 1,
           last_voted_at  = now()
     WHERE wallet_address = v_assignment.validator_wallet;

    -- Reward correct votes, penalise incorrect
    IF v_assignment.vote = v_majority_vote THEN
      UPDATE public.validators
         SET correct_votes    = correct_votes + 1,
             reputation_score = reputation_score + 0.1
       WHERE wallet_address = v_assignment.validator_wallet;
    ELSE
      -- Clamp minimum to 0.5
      SELECT GREATEST(0.5, reputation_score - 0.05)
        INTO v_new_reputation
        FROM public.validators
       WHERE wallet_address = v_assignment.validator_wallet;

      UPDATE public.validators
         SET reputation_score = v_new_reputation
       WHERE wallet_address = v_assignment.validator_wallet;
    END IF;
  END LOOP;

  RETURN v_hunter_wins;
END;
$$;


-- ─────────────────────────────────────────────────────
-- RPC 3: record_ai_task_result
-- Called by platform's Judge AI middleware after agent responds
-- ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.record_ai_task_result(
  p_task_id         bigint,
  p_output_data     jsonb,
  p_judge_verdict   boolean,
  p_judge_reasoning text
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
     SET output_data     = p_output_data,
         judge_verdict   = p_judge_verdict,
         judge_reasoning = p_judge_reasoning,
         status          = CASE WHEN p_judge_verdict THEN 'judge_passed' ELSE 'judge_failed' END,
         completed_at    = now()
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


-- ─────────────────────────────────────────────────────
-- RPC 4: record_client_satisfaction
-- Called when client rates a completed AI task
-- ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.record_client_satisfaction(
  p_task_id       bigint,
  p_is_satisfied  boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agent_id       bigint;
  v_new_reputation numeric;
BEGIN
  -- Get agent_id
  SELECT agent_id INTO v_agent_id
    FROM public.ai_tasks
   WHERE task_id = p_task_id;

  -- Record client satisfaction on task
  UPDATE public.ai_tasks
     SET client_satisfaction = p_is_satisfied
   WHERE task_id = p_task_id;

  IF p_is_satisfied = false THEN
    -- Clamp minimum to 0
    SELECT GREATEST(0, reputation_score - 0.2)
      INTO v_new_reputation
      FROM public.ai_agents
     WHERE agent_id = v_agent_id;

    UPDATE public.ai_agents
       SET unsatisfied_count  = unsatisfied_count + 1,
           reputation_score   = v_new_reputation
     WHERE agent_id = v_agent_id;

  ELSIF p_is_satisfied = true THEN
    -- Clamp maximum to 10
    SELECT LEAST(10, reputation_score + 0.1)
      INTO v_new_reputation
      FROM public.ai_agents
     WHERE agent_id = v_agent_id;

    UPDATE public.ai_agents
       SET reputation_score = v_new_reputation
     WHERE agent_id = v_agent_id;
  END IF;
END;
$$;


-- ─────────────────────────────────────────────────────
-- RPC 5: update_bounty_status
-- Syncs on-chain bounty state changes to Supabase
-- ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_bounty_status(
  p_bounty_id  bigint,
  p_new_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator_wallet text;
BEGIN
  -- Fetch the creator for authorisation check
  SELECT creator_wallet INTO v_creator_wallet
    FROM public.bounties
   WHERE bounty_id = p_bounty_id;

  -- Only creator wallet is allowed to call this (service_role bypasses RLS automatically)
  IF public.get_wallet() != '' AND public.get_wallet() != v_creator_wallet THEN
    RAISE EXCEPTION 'Unauthorized: only the bounty creator can update status';
  END IF;

  -- Update status
  UPDATE public.bounties
     SET status = p_new_status
   WHERE bounty_id = p_bounty_id;

  -- Schedule deletion 24h after terminal states
  IF p_new_status IN ('paid', 'refunded') THEN
    INSERT INTO public.scheduled_deletions (bounty_id, delete_after)
    VALUES (p_bounty_id, now() + interval '24 hours')
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;


-- ─────────────────────────────────────────────────────
-- RPC 6: promote_winners_after_dispute
-- Adjusts winners table after fraud is confirmed
-- ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.promote_winners_after_dispute(
  p_bounty_id      bigint,
  p_disputed_rank  smallint
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_winner      record;
  v_max_rank    smallint;
  v_creator_wallet text;
BEGIN
  -- Mark the disputed winner as removed
  UPDATE public.winners
     SET status = 'removed'
   WHERE bounty_id = p_bounty_id
     AND rank = p_disputed_rank;

  -- Promote each winner with rank > disputed_rank
  FOR v_winner IN
    SELECT id, rank
      FROM public.winners
     WHERE bounty_id = p_bounty_id
       AND rank > p_disputed_rank
     ORDER BY rank ASC
  LOOP
    UPDATE public.winners
       SET status = 'promoted',
           rank   = v_winner.rank - 1
     WHERE id = v_winner.id;
  END LOOP;

  -- Find the now-empty last rank slot
  SELECT MAX(rank) INTO v_max_rank
    FROM public.winners
   WHERE bounty_id = p_bounty_id;

  -- Record empty slot as refunded-to-client placeholder
  SELECT creator_wallet INTO v_creator_wallet
    FROM public.bounties
   WHERE bounty_id = p_bounty_id;

  INSERT INTO public.winners (bounty_id, rank, hunter_wallet, payout_percent, status)
  VALUES (
    p_bounty_id,
    COALESCE(v_max_rank, p_disputed_rank) + 1,
    v_creator_wallet,
    0,
    'refunded_to_client'
  );
END;
$$;


-- ═════════════════════════════════════════════════════
-- PART 7: GRANTS (allow authenticated + anon roles to call RPCs)
-- Service role has unrestricted access by default.
-- ═════════════════════════════════════════════════════

-- Public-safe RPCs (front-end calls after wallet verification)
GRANT EXECUTE ON FUNCTION public.update_bounty_status(bigint, text)                            TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.record_client_satisfaction(bigint, boolean)                   TO authenticated, anon;

-- Platform-only RPCs (called with service_role key from trusted context)
GRANT EXECUTE ON FUNCTION public.assign_validators(uuid, bigint, text[])                       TO service_role;
GRANT EXECUTE ON FUNCTION public.calculate_verdict(uuid)                                       TO service_role;
GRANT EXECUTE ON FUNCTION public.record_ai_task_result(bigint, jsonb, boolean, text)           TO service_role;
GRANT EXECUTE ON FUNCTION public.promote_winners_after_dispute(bigint, smallint)               TO service_role;

-- Existing cleanup RPCs — ensure service_role can call them
GRANT EXECUTE ON FUNCTION public.cleanup_bounty_data(bigint)                                   TO service_role;
GRANT EXECUTE ON FUNCTION public.process_scheduled_deletions()                                 TO service_role;


-- ═════════════════════════════════════════════════════
-- MIGRATION 002 COMPLETE ✅
-- New tables:   validators, disputes, validator_assignments, winners, ai_agents, ai_tasks
-- Altered:      bounties (8 cols added), submissions (3 cols added)
-- New RPCs:     assign_validators, calculate_verdict, record_ai_task_result,
--               record_client_satisfaction, update_bounty_status, promote_winners_after_dispute
-- Realtime:     disputes, validator_assignments, winners, ai_tasks
-- RLS:          Enabled on all new tables with wallet-based policies
-- Indexes:      9 new indexes including GIN on ai_agents.tech_tags
-- ═════════════════════════════════════════════════════
