-- =====================================================
-- MICROBOUNTY — COMPLETE SUPABASE SETUP
-- Run this entire file in Supabase SQL Editor (one shot)
-- =====================================================

-- ─────────────────────────────────────────────────────
-- STEP 0: Wallet-Based Auth Helper
-- MicroBounty uses Algorand wallet addresses as identity.
-- Frontend sends wallet via x-wallet-address header.
-- ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_wallet()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (current_setting('request.headers', true)::json->>'x-wallet-address'),
    ''
  );
$$;


-- ═════════════════════════════════════════════════════
-- STEP 1: CREATE ALL TABLES
-- ═════════════════════════════════════════════════════

-- ── Table 1: bounties ──
CREATE TABLE IF NOT EXISTS public.bounties (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  bounty_id bigint NOT NULL UNIQUE,
  creator_wallet text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  tags text[] DEFAULT '{}',
  reward_algo numeric NOT NULL,
  max_applicants integer NOT NULL,
  payout_split integer[] NOT NULL,
  deadline timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'active', 'submitted', 'paid', 'refunded', 'disputed')),
  created_at timestamptz DEFAULT now()
);

-- ── Table 2: applications ──
CREATE TABLE IF NOT EXISTS public.applications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  bounty_id bigint NOT NULL REFERENCES public.bounties(bounty_id) ON DELETE CASCADE,
  hunter_wallet text NOT NULL,
  applied_at timestamptz DEFAULT now(),
  UNIQUE(bounty_id, hunter_wallet)
);

-- ── Table 3: bounty_rooms ──
CREATE TABLE IF NOT EXISTS public.bounty_rooms (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  bounty_id bigint NOT NULL REFERENCES public.bounties(bounty_id) ON DELETE CASCADE UNIQUE,
  creator_wallet text NOT NULL,
  hunter_wallets text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'closed')),
  created_at timestamptz DEFAULT now()
);

-- ── Table 4: messages ──
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id uuid NOT NULL REFERENCES public.bounty_rooms(id) ON DELETE CASCADE,
  sender_wallet text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ── Table 5: submissions ──
CREATE TABLE IF NOT EXISTS public.submissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  bounty_id bigint NOT NULL REFERENCES public.bounties(bounty_id) ON DELETE CASCADE,
  hunter_wallet text NOT NULL,
  deploy_link text NOT NULL,
  github_link text NOT NULL,
  starter_files_url text,
  work_description text NOT NULL,
  submitted_at timestamptz DEFAULT now(),
  UNIQUE(bounty_id, hunter_wallet)
);

-- ── Table 6: scheduled_deletions (internal) ──
CREATE TABLE IF NOT EXISTS public.scheduled_deletions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  bounty_id bigint NOT NULL,
  delete_after timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ── Performance Indexes ──
CREATE INDEX IF NOT EXISTS idx_bounties_status ON public.bounties(status);
CREATE INDEX IF NOT EXISTS idx_bounties_creator ON public.bounties(creator_wallet);
CREATE INDEX IF NOT EXISTS idx_bounties_deadline ON public.bounties(deadline);
CREATE INDEX IF NOT EXISTS idx_applications_bounty ON public.applications(bounty_id);
CREATE INDEX IF NOT EXISTS idx_applications_hunter ON public.applications(hunter_wallet);
CREATE INDEX IF NOT EXISTS idx_messages_room ON public.messages(room_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_submissions_bounty ON public.submissions(bounty_id);
CREATE INDEX IF NOT EXISTS idx_submissions_hunter ON public.submissions(hunter_wallet);
CREATE INDEX IF NOT EXISTS idx_bounty_rooms_bounty ON public.bounty_rooms(bounty_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_del_after ON public.scheduled_deletions(delete_after);


-- ═════════════════════════════════════════════════════
-- STEP 2: ENABLE ROW LEVEL SECURITY + POLICIES
-- ═════════════════════════════════════════════════════

ALTER TABLE public.bounties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bounty_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_deletions ENABLE ROW LEVEL SECURITY;

-- ── Bounties Policies ─────────────────────────────

-- Anyone can read bounties (public listing page)
CREATE POLICY "bounties_select_public"
  ON public.bounties FOR SELECT
  USING (true);

-- Any connected wallet can create a bounty
CREATE POLICY "bounties_insert_creator"
  ON public.bounties FOR INSERT
  WITH CHECK (
    public.get_wallet() != ''
    AND creator_wallet = public.get_wallet()
  );

-- Only creator can update their own bounty
CREATE POLICY "bounties_update_creator"
  ON public.bounties FOR UPDATE
  USING (creator_wallet = public.get_wallet())
  WITH CHECK (creator_wallet = public.get_wallet());


-- ── Applications Policies ─────────────────────────

-- Anyone can read applications (applicant count visible)
CREATE POLICY "applications_select_public"
  ON public.applications FOR SELECT
  USING (true);

-- Only the hunter can insert their own application
CREATE POLICY "applications_insert_hunter"
  ON public.applications FOR INSERT
  WITH CHECK (
    public.get_wallet() != ''
    AND hunter_wallet = public.get_wallet()
  );

-- No DELETE policy → applications are permanent


-- ── Bounty Rooms Policies ─────────────────────────

-- Only room members (creator or hunters in room) can see
CREATE POLICY "rooms_select_members"
  ON public.bounty_rooms FOR SELECT
  USING (
    creator_wallet = public.get_wallet()
    OR public.get_wallet() = ANY(hunter_wallets)
  );

-- Only creator can create rooms
CREATE POLICY "rooms_insert_creator"
  ON public.bounty_rooms FOR INSERT
  WITH CHECK (
    creator_wallet = public.get_wallet()
  );

-- Only creator can update rooms (add hunters)
CREATE POLICY "rooms_update_creator"
  ON public.bounty_rooms FOR UPDATE
  USING (creator_wallet = public.get_wallet())
  WITH CHECK (creator_wallet = public.get_wallet());


-- ── Messages Policies ─────────────────────────────

-- Only room members can read messages
CREATE POLICY "messages_select_members"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bounty_rooms r
      WHERE r.id = messages.room_id
      AND (
        r.creator_wallet = public.get_wallet()
        OR public.get_wallet() = ANY(r.hunter_wallets)
      )
    )
  );

-- Only room members can send messages
CREATE POLICY "messages_insert_members"
  ON public.messages FOR INSERT
  WITH CHECK (
    public.get_wallet() != ''
    AND sender_wallet = public.get_wallet()
    AND EXISTS (
      SELECT 1 FROM public.bounty_rooms r
      WHERE r.id = room_id
      AND (
        r.creator_wallet = public.get_wallet()
        OR public.get_wallet() = ANY(r.hunter_wallets)
      )
    )
  );

-- No UPDATE or DELETE on messages (immutable chat)


-- ── Submissions Policies ──────────────────────────

-- Row access: creator of the bounty OR the hunter who submitted
CREATE POLICY "submissions_select_authorized"
  ON public.submissions FOR SELECT
  USING (
    hunter_wallet = public.get_wallet()
    OR EXISTS (
      SELECT 1 FROM public.bounties b
      WHERE b.bounty_id = submissions.bounty_id
      AND b.creator_wallet = public.get_wallet()
    )
  );

-- Only hunters can insert their own submission
CREATE POLICY "submissions_insert_hunter"
  ON public.submissions FOR INSERT
  WITH CHECK (
    public.get_wallet() != ''
    AND hunter_wallet = public.get_wallet()
  );

-- No UPDATE or DELETE (submissions are immutable)


-- ── Scheduled Deletions (internal, no public access) ──

CREATE POLICY "scheduled_del_deny_all"
  ON public.scheduled_deletions FOR SELECT
  USING (false);


-- ═════════════════════════════════════════════════════
-- STEP 3: SUBMISSIONS VIEW WITH COLUMN MASKING
-- Hides github_link, starter_files_url, work_description
-- from creator until bounty status = 'paid'
-- ═════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_submissions_for_viewer(
  p_bounty_id bigint,
  p_viewer_wallet text
)
RETURNS TABLE(
  id uuid,
  bounty_id bigint,
  hunter_wallet text,
  deploy_link text,
  github_link text,
  starter_files_url text,
  work_description text,
  submitted_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bounty_status text;
  v_is_creator boolean;
BEGIN
  -- Get bounty status
  SELECT b.status INTO v_bounty_status
  FROM public.bounties b
  WHERE b.bounty_id = p_bounty_id;

  -- Check if viewer is the creator
  SELECT EXISTS(
    SELECT 1 FROM public.bounties b
    WHERE b.bounty_id = p_bounty_id
    AND b.creator_wallet = p_viewer_wallet
  ) INTO v_is_creator;

  RETURN QUERY
  SELECT
    s.id,
    s.bounty_id,
    s.hunter_wallet,
    s.deploy_link,  -- ALWAYS visible
    -- github_link: hunter sees own, creator sees after paid
    CASE
      WHEN s.hunter_wallet = p_viewer_wallet THEN s.github_link
      WHEN v_is_creator AND v_bounty_status = 'paid' THEN s.github_link
      ELSE NULL
    END AS github_link,
    -- starter_files_url: same logic
    CASE
      WHEN s.hunter_wallet = p_viewer_wallet THEN s.starter_files_url
      WHEN v_is_creator AND v_bounty_status = 'paid' THEN s.starter_files_url
      ELSE NULL
    END AS starter_files_url,
    -- work_description: same logic
    CASE
      WHEN s.hunter_wallet = p_viewer_wallet THEN s.work_description
      WHEN v_is_creator AND v_bounty_status = 'paid' THEN s.work_description
      ELSE NULL
    END AS work_description,
    s.submitted_at
  FROM public.submissions s
  WHERE s.bounty_id = p_bounty_id
  AND (
    s.hunter_wallet = p_viewer_wallet
    OR v_is_creator
  )
  ORDER BY s.submitted_at ASC;
END;
$$;


-- ═════════════════════════════════════════════════════
-- STEP 4: ENABLE REALTIME
-- ═════════════════════════════════════════════════════

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bounty_rooms;


-- ═════════════════════════════════════════════════════
-- STEP 5: AUTO-DELETE FUNCTION + TRIGGER
-- ═════════════════════════════════════════════════════

-- Cleanup function: deletes ALL Supabase data for a bounty
CREATE OR REPLACE FUNCTION public.cleanup_bounty_data(p_bounty_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Messages cascade via bounty_rooms FK
  DELETE FROM public.bounty_rooms WHERE bounty_id = p_bounty_id;

  -- Delete applications
  DELETE FROM public.applications WHERE bounty_id = p_bounty_id;

  -- Delete submissions
  DELETE FROM public.submissions WHERE bounty_id = p_bounty_id;

  -- Delete scheduled deletion entry
  DELETE FROM public.scheduled_deletions WHERE bounty_id = p_bounty_id;

  -- Delete the bounty itself
  DELETE FROM public.bounties WHERE bounty_id = p_bounty_id;
END;
$$;


-- Trigger function: schedules deletion 24h after status → paid/refunded
CREATE OR REPLACE FUNCTION public.on_bounty_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('paid', 'refunded')
     AND (OLD.status IS NULL OR OLD.status != NEW.status) THEN
    INSERT INTO public.scheduled_deletions (bounty_id, delete_after)
    VALUES (NEW.bounty_id, now() + interval '24 hours')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;


-- Attach trigger to bounties table
DROP TRIGGER IF EXISTS trg_bounty_status_change ON public.bounties;
CREATE TRIGGER trg_bounty_status_change
  AFTER UPDATE OF status ON public.bounties
  FOR EACH ROW
  EXECUTE FUNCTION public.on_bounty_status_change();


-- Process all expired scheduled deletions (called by cron/edge function)
CREATE OR REPLACE FUNCTION public.process_scheduled_deletions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer := 0;
  rec record;
BEGIN
  FOR rec IN
    SELECT sd.bounty_id
    FROM public.scheduled_deletions sd
    WHERE sd.delete_after <= now()
  LOOP
    PERFORM public.cleanup_bounty_data(rec.bounty_id);
    deleted_count := deleted_count + 1;
  END LOOP;

  RETURN deleted_count;
END;
$$;


-- ─────────────────────────────────────────────────────
-- OPTION A: pg_cron (if available on your Supabase plan)
-- Uncomment to enable hourly cleanup
-- ─────────────────────────────────────────────────────
-- SELECT cron.schedule(
--   'cleanup-expired-bounties',
--   '0 * * * *',
--   $$SELECT public.process_scheduled_deletions();$$
-- );


-- ═════════════════════════════════════════════════════
-- SETUP COMPLETE ✅
-- Tables: bounties, applications, bounty_rooms, messages, submissions, scheduled_deletions
-- RLS: Enabled on all tables with wallet-based policies
-- Realtime: messages + bounty_rooms
-- Auto-delete: Trigger + scheduled cleanup function
-- ═════════════════════════════════════════════════════
