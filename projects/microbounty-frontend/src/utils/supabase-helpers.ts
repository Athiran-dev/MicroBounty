// ─────────────────────────────────────────────────────
// MicroBounty — Supabase Helper Functions
// ─────────────────────────────────────────────────────
// All 9 helper functions for the React frontend.
// Uses wallet-based identity (no traditional auth).
// ─────────────────────────────────────────────────────

import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabase, getSupabaseUrl, getSupabaseAnonKey } from './supabaseClient';
import type {
  Bounty,
  BountyWithApplicants,
  BountyRoom,
  Message,
  Submission,
  CreateBountyResponse,
  ApplyBountyResponse,
  SubmitWorkResponse,
  MessageCallback,
  RoomUpdateCallback,
} from './supabase-types';


// ═════════════════════════════════════════════════════
// 1. FETCH BOUNTIES — Get all bounties for listing page
// ═════════════════════════════════════════════════════

/**
 * Fetch all bounties with applicant counts for the listing page.
 * Optionally filter by status or search tags.
 *
 * @param options.status - Filter by bounty status (default: all)
 * @param options.tags - Filter by tags (bounties containing ANY of these tags)
 * @param options.limit - Max results (default: 50)
 * @param options.offset - Pagination offset (default: 0)
 */
export async function fetchBounties(options?: {
  status?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}): Promise<BountyWithApplicants[]> {
  const supabase = getSupabase();
  const { status, tags, limit = 50, offset = 0 } = options || {};

  // Get bounties
  let query = supabase
    .from('bounties')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq('status', status);
  }

  if (tags && tags.length > 0) {
    query = query.overlaps('tags', tags);
  }

  const { data: bounties, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch bounties: ${error.message}`);
  }

  if (!bounties || bounties.length === 0) return [];

  // Get applicant counts for all bounties in one query
  const bountyIds = bounties.map((b) => b.bounty_id);
  const { data: applications } = await supabase
    .from('applications')
    .select('bounty_id')
    .in('bounty_id', bountyIds);

  // Count applicants per bounty
  const countMap = new Map<number, number>();
  (applications || []).forEach((app) => {
    countMap.set(app.bounty_id, (countMap.get(app.bounty_id) || 0) + 1);
  });

  return bounties.map((b) => ({
    ...b,
    applicant_count: countMap.get(b.bounty_id) || 0,
  })) as BountyWithApplicants[];
}


// ═════════════════════════════════════════════════════
// 2. FETCH BOUNTY BY ID — Get single bounty details
// ═════════════════════════════════════════════════════

/**
 * Fetch a single bounty by its on-chain bounty_id.
 */
export async function fetchBountyById(bountyId: number): Promise<BountyWithApplicants | null> {
  const supabase = getSupabase();

  const { data: bounty, error } = await supabase
    .from('bounties')
    .select('*')
    .eq('bounty_id', bountyId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // not found
    throw new Error(`Failed to fetch bounty: ${error.message}`);
  }

  // Get applicant count
  const { count } = await supabase
    .from('applications')
    .select('id', { count: 'exact', head: true })
    .eq('bounty_id', bountyId);

  return {
    ...bounty,
    applicant_count: count || 0,
  } as BountyWithApplicants;
}


// ═════════════════════════════════════════════════════
// 3. GET APPLICANT COUNT
// ═════════════════════════════════════════════════════

/**
 * Get the current number of applicants for a bounty.
 */
export async function getApplicantCount(bountyId: number): Promise<number> {
  const supabase = getSupabase();

  const { count, error } = await supabase
    .from('applications')
    .select('id', { count: 'exact', head: true })
    .eq('bounty_id', bountyId);

  if (error) {
    throw new Error(`Failed to get applicant count: ${error.message}`);
  }

  return count || 0;
}


// ═════════════════════════════════════════════════════
// 4. SUBSCRIBE TO ROOM — Realtime chat messages
// ═════════════════════════════════════════════════════

/**
 * Subscribe to new messages in a bounty room via Supabase Realtime.
 * Returns a RealtimeChannel that can be unsubscribed when leaving.
 *
 * @param roomId - The bounty_room UUID
 * @param onMessage - Callback fired when a new message arrives
 * @param onRoomUpdate - Optional callback for room changes (hunter joins, etc.)
 * @param walletAddress - Connected wallet for RLS
 */
export function subscribeToRoom(
  roomId: string,
  onMessage: MessageCallback,
  walletAddress: string,
  onRoomUpdate?: RoomUpdateCallback
): RealtimeChannel {
  const supabase = getSupabase(walletAddress);
  const topic = `realtime:room:${roomId}`;

  // Clean up any existing channel with this name to avoid conflicts
  const existing = supabase.getChannels().find(c => c.topic === topic);
  if (existing) {
    supabase.removeChannel(existing);
  }

  const channel = supabase
    .channel(`room:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `room_id=eq.${roomId}`,
      },
      (payload) => {
        onMessage(payload.new as Message);
      }
    );

  // Optionally listen for room updates (new hunters joining)
  if (onRoomUpdate) {
    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'bounty_rooms',
        filter: `id=eq.${roomId}`,
      },
      (payload) => {
        onRoomUpdate(payload.new as BountyRoom);
      }
    );
  }

  channel.subscribe();

  return channel;
}

/**
 * Unsubscribe from a room's realtime channel.
 */
export function unsubscribeFromRoom(channel: RealtimeChannel): void {
  const supabase = getSupabase();
  supabase.removeChannel(channel);
}


// ═════════════════════════════════════════════════════
// 5. SEND MESSAGE — Send a chat message to a room
// ═════════════════════════════════════════════════════

/**
 * Send a chat message to a bounty room.
 * The sender must be a member (creator or hunter in the room).
 *
 * @param roomId - The bounty_room UUID
 * @param senderWallet - The sender's Algorand wallet address
 * @param content - Message text content
 */
export async function sendMessage(
  roomId: string,
  senderWallet: string,
  content: string
): Promise<Message> {
  const supabase = getSupabase(senderWallet);

  const { data, error } = await supabase
    .from('messages')
    .insert({
      room_id: roomId,
      sender_wallet: senderWallet,
      content: content.trim(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to send message: ${error.message}`);
  }

  return data as Message;
}


// ═════════════════════════════════════════════════════
// 6. GET MESSAGES — Fetch all messages for a room
// ═════════════════════════════════════════════════════

/**
 * Fetch all messages for a bounty room, ordered by creation time.
 *
 * @param roomId - The bounty_room UUID
 * @param walletAddress - Connected wallet for RLS
 * @param options.limit - Max messages (default: 200)
 * @param options.before - Fetch messages before this timestamp (pagination)
 */
export async function getMessages(
  roomId: string,
  walletAddress: string,
  options?: { limit?: number; before?: string }
): Promise<Message[]> {
  const supabase = getSupabase(walletAddress);
  const { limit = 200, before } = options || {};

  let query = supabase
    .from('messages')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (before) {
    query = query.lt('created_at', before);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch messages: ${error.message}`);
  }

  return (data || []) as Message[];
}


// ═════════════════════════════════════════════════════
// 7. GET SUBMISSIONS — With access-controlled columns
// ═════════════════════════════════════════════════════

/**
 * Get submissions for a bounty with column-level access control.
 *
 * - deploy_link: always visible to creator
 * - github_link, starter_files_url, work_description:
 *   → Hunter sees own submission fully
 *   → Creator sees these ONLY if bounty status = 'paid'
 *   → Otherwise these fields are NULL
 *
 * Uses the server-side get_submissions_for_viewer() function.
 *
 * @param bountyId - The on-chain bounty_id
 * @param viewerWallet - The wallet of the person viewing
 */
export async function getSubmissions(
  bountyId: number,
  viewerWallet: string
): Promise<Submission[]> {
  const supabase = getSupabase(viewerWallet);

  const { data, error } = await supabase.rpc('get_submissions_for_viewer', {
    p_bounty_id: bountyId,
    p_viewer_wallet: viewerWallet,
  });

  if (error) {
    throw new Error(`Failed to fetch submissions: ${error.message}`);
  }

  return (data || []) as Submission[];
}


// ═════════════════════════════════════════════════════
// 8. MARK BOUNTY PAID — Update status after on-chain payment
// ═════════════════════════════════════════════════════

/**
 * Update bounty status to 'paid' after on-chain payment confirmation.
 * This triggers the 24h auto-delete countdown.
 *
 * Only the creator can call this (enforced by RLS).
 *
 * @param bountyId - The on-chain bounty_id
 * @param creatorWallet - The creator's wallet (for RLS)
 */
export async function markBountyPaid(
  bountyId: number,
  creatorWallet: string
): Promise<void> {
  const supabase = getSupabase(creatorWallet);

  const { error } = await supabase
    .from('bounties')
    .update({ status: 'paid' })
    .eq('bounty_id', bountyId)
    .eq('creator_wallet', creatorWallet); // extra safety check

  if (error) {
    throw new Error(`Failed to mark bounty as paid: ${error.message}`);
  }
}

/**
 * Update bounty status to 'refunded' after on-chain refund.
 * This triggers the 24h auto-delete countdown.
 */
export async function markBountyRefunded(
  bountyId: number,
  creatorWallet: string
): Promise<void> {
  const supabase = getSupabase(creatorWallet);

  const { error } = await supabase
    .from('bounties')
    .update({ status: 'refunded' })
    .eq('bounty_id', bountyId)
    .eq('creator_wallet', creatorWallet);

  if (error) {
    throw new Error(`Failed to mark bounty as refunded: ${error.message}`);
  }
}

/**
 * Update bounty status to 'disputed' after on-chain dispute.
 */
export async function markBountyDisputed(
  bountyId: number,
  creatorWallet: string
): Promise<void> {
  const supabase = getSupabase(creatorWallet);

  const { error } = await supabase
    .from('bounties')
    .update({ status: 'disputed' })
    .eq('bounty_id', bountyId)
    .eq('creator_wallet', creatorWallet);

  if (error) {
    throw new Error(`Failed to mark bounty as disputed: ${error.message}`);
  }
}


// ═════════════════════════════════════════════════════
// 9. GET ROOM BY BOUNTY ID — Get room if wallet is member
// ═════════════════════════════════════════════════════

/**
 * Get the bounty room for a given bounty, only if the wallet is a member.
 * Returns null if the wallet is not a room member (creator or hunter).
 *
 * @param bountyId - The on-chain bounty_id
 * @param walletAddress - The connected wallet address
 */
export async function getRoomByBountyId(
  bountyId: number,
  walletAddress: string
): Promise<BountyRoom | null> {
  const supabase = getSupabase(walletAddress);

  const { data, error } = await supabase
    .from('bounty_rooms')
    .select('*')
    .eq('bounty_id', bountyId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // not found / not authorized
    throw new Error(`Failed to fetch room: ${error.message}`);
  }

  return data as BountyRoom;
}


// ═════════════════════════════════════════════════════
// EDGE FUNCTION CALLERS
// Convenience wrappers for calling Edge Functions
// ═════════════════════════════════════════════════════

/**
 * Call the create-bounty Edge Function after on-chain tx is confirmed.
 */
export async function callCreateBounty(params: {
  bounty_id: number;
  creator_wallet: string;
  title: string;
  description: string;
  tags?: string[];
  reward_algo: number;
  max_applicants: number;
  payout_split: number[];
  deadline: string;
}): Promise<CreateBountyResponse> {
  const url = `${getSupabaseUrl()}/functions/v1/create-bounty`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getSupabaseAnonKey()}`,
    },
    body: JSON.stringify(params),
  });

  return response.json();
}

/**
 * Call the apply-bounty Edge Function after on-chain apply tx is confirmed.
 */
export async function callApplyBounty(params: {
  bounty_id: number;
  hunter_wallet: string;
}): Promise<ApplyBountyResponse> {
  const url = `${getSupabaseUrl()}/functions/v1/apply-bounty`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getSupabaseAnonKey()}`,
    },
    body: JSON.stringify(params),
  });

  return response.json();
}

/**
 * Call the submit-work Edge Function after on-chain submission tx is confirmed.
 */
export async function callSubmitWork(params: {
  bounty_id: number;
  hunter_wallet: string;
  deploy_link: string;
  github_link: string;
  starter_files_url?: string;
  work_description: string;
}): Promise<SubmitWorkResponse> {
  const url = `${getSupabaseUrl()}/functions/v1/submit-work`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getSupabaseAnonKey()}`,
    },
    body: JSON.stringify(params),
  });

  return response.json();
}


// ═════════════════════════════════════════════════════
// UTILITY: Check if wallet is bounty creator
// ═════════════════════════════════════════════════════

/**
 * Check if a wallet address is the creator of a given bounty.
 */
export async function isBountyCreator(
  bountyId: number,
  walletAddress: string
): Promise<boolean> {
  const supabase = getSupabase();

  const { data } = await supabase
    .from('bounties')
    .select('creator_wallet')
    .eq('bounty_id', bountyId)
    .single();

  return data?.creator_wallet === walletAddress;
}

/**
 * Check if a wallet has applied to a bounty.
 */
export async function hasApplied(
  bountyId: number,
  walletAddress: string
): Promise<boolean> {
  const supabase = getSupabase();

  const { count } = await supabase
    .from('applications')
    .select('id', { count: 'exact', head: true })
    .eq('bounty_id', bountyId)
    .eq('hunter_wallet', walletAddress);

  return (count || 0) > 0;
}


// ═════════════════════════════════════════════════════
// NEW SYNC HELPERS — After every successful on-chain txn
// ═════════════════════════════════════════════════════

/**
 * After set_winners() on-chain:
 * Insert winner records and update bounty status → 'winner_set'
 */
export async function callSetWinners(params: {
  bounty_id: number;
  winners: Array<{ rank: number; hunter_wallet: string; payout_percent: number }>;
  creator_wallet: string;
}): Promise<void> {
  const supabase = getSupabase(params.creator_wallet);

  // Upsert winners (idempotent)
  if (params.winners.length > 0) {
    await supabase
      .from('winners')
      .upsert(
        params.winners.map(w => ({
          bounty_id: params.bounty_id,
          rank: w.rank,
          hunter_wallet: w.hunter_wallet,
          payout_percent: w.payout_percent,
        })),
        { onConflict: 'bounty_id,rank' }
      );
  }

  // Update bounty status
  const { error } = await supabase
    .from('bounties')
    .update({ status: 'winner_set' })
    .eq('bounty_id', params.bounty_id)
    .eq('creator_wallet', params.creator_wallet);

  if (error) {
    console.error('callSetWinners Supabase error:', error);
    throw new Error(`Failed to sync set_winners: ${error.message}`);
  }
}

/**
 * After approve_and_pay() on-chain:
 * Update bounty status → 'paid'
 */
export async function callApprovePay(bountyId: number, creatorWallet: string): Promise<void> {
  const supabase = getSupabase(creatorWallet);

  const { error } = await supabase
    .from('bounties')
    .update({ status: 'paid' })
    .eq('bounty_id', bountyId)
    .eq('creator_wallet', creatorWallet);

  if (error) throw new Error(`Failed to sync approve_and_pay: ${error.message}`);
}

/**
 * After auto_refund() on-chain:
 * Update bounty status → 'refunded'
 */
export async function callAutoRefund(bountyId: number, callerWallet: string): Promise<void> {
  const supabase = getSupabase(callerWallet);

  const { error } = await supabase
    .from('bounties')
    .update({ status: 'refunded' })
    .eq('bounty_id', bountyId);

  if (error) throw new Error(`Failed to sync auto_refund: ${error.message}`);
}

/**
 * After lock_ai_payment() on-chain:
 * Insert ai_tasks record with status 'pending'
 */
export async function callAiTaskLocked(params: {
  task_id: string;
  agent_id: number | string;
  client_wallet: string;
  payment_amount_algo: number;
  input_data: string;
  input_type: string;
}): Promise<void> {
  const supabase = getSupabase(params.client_wallet);

  const netToAgent = params.payment_amount_algo * 0.9;
  const platformCut = params.payment_amount_algo * 0.1;

  const { error } = await supabase
    .from('ai_tasks')
    .upsert({
      task_id: params.task_id,
      agent_id: Number(params.agent_id),
      client_wallet: params.client_wallet,
      input_data: params.input_data,
      input_type: params.input_type,
      payment_amount_algo: params.payment_amount_algo,
      net_to_agent_algo: netToAgent,
      platform_cut_algo: platformCut,
      status: 'pending',
    }, { onConflict: 'task_id' });

  if (error) {
    console.error('callAiTaskLocked Supabase error:', error);
  }
}

/**
 * After release_ai_payment() on-chain:
 * Update ai_tasks status → 'paid' and increment agent stats
 */
export async function callAiTaskPaid(
  taskId: string,
  agentId: number | string,
  clientWallet: string
): Promise<void> {
  const supabase = getSupabase(clientWallet);

  // Update task status
  await supabase
    .from('ai_tasks')
    .update({ status: 'paid', completed_at: new Date().toISOString() })
    .eq('task_id', taskId);

  // Increment agent stats
  try {
    await supabase.rpc('increment_agent_success', { p_agent_id: Number(agentId) });
  } catch {
    // Non-critical — agent stats increment may not exist as RPC
    console.warn('increment_agent_success RPC not available, using manual update');
    const { data: agent } = await supabase
      .from('ai_agents')
      .select('successful_tasks, total_tasks')
      .eq('agent_id', Number(agentId))
      .single();

    if (agent) {
      await supabase
        .from('ai_agents')
        .update({
          successful_tasks: (agent.successful_tasks || 0) + 1,
          total_tasks: (agent.total_tasks || 0) + 1,
        })
        .eq('agent_id', Number(agentId));
    }
  }
}

/**
 * After refund_ai_payment() on-chain:
 * Update ai_tasks status → 'refunded' and increment agent total_tasks
 */
export async function callAiTaskRefunded(
  taskId: string,
  agentId: number | string,
  clientWallet: string
): Promise<void> {
  const supabase = getSupabase(clientWallet);

  await supabase
    .from('ai_tasks')
    .update({ status: 'refunded', completed_at: new Date().toISOString() })
    .eq('task_id', taskId);

  try {
    const { data: agent } = await supabase
      .from('ai_agents')
      .select('total_tasks')
      .eq('agent_id', Number(agentId))
      .single();

    if (agent) {
      await supabase
        .from('ai_agents')
        .update({ total_tasks: (agent.total_tasks || 0) + 1 })
        .eq('agent_id', Number(agentId));
    }
  } catch {
    console.warn('Failed to update agent total_tasks after refund');
  }
}

