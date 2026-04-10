// ─────────────────────────────────────────────────────
// MicroBounty — Supabase TypeScript Types
// ─────────────────────────────────────────────────────

export type BountyStatus = 'open' | 'active' | 'submitted' | 'paid' | 'refunded' | 'disputed';
export type RoomStatus = 'active' | 'closed';

/** Bounty record from Supabase */
export interface Bounty {
  id: string;
  bounty_id: number;
  creator_wallet: string;
  title: string;
  description: string;
  tags: string[];
  reward_algo: number;
  max_applicants: number;
  payout_split: number[];
  deadline: string;
  status: BountyStatus;
  created_at: string;
}

/** Bounty with computed applicant count (for listing page) */
export interface BountyWithApplicants extends Bounty {
  applicant_count: number;
}

/** Application record */
export interface Application {
  id: string;
  bounty_id: number;
  hunter_wallet: string;
  applied_at: string;
}

/** Bounty room (group chat) record */
export interface BountyRoom {
  id: string;
  bounty_id: number;
  creator_wallet: string;
  hunter_wallets: string[];
  status: RoomStatus;
  created_at: string;
}

/** Chat message */
export interface Message {
  id: string;
  room_id: string;
  sender_wallet: string;
  content: string;
  created_at: string;
}

/** Submission record (column-masked based on viewer) */
export interface Submission {
  id: string;
  bounty_id: number;
  hunter_wallet: string;
  deploy_link: string;
  github_link: string | null;       // null if hidden (bounty not paid yet)
  starter_files_url: string | null; // null if hidden
  work_description: string | null;  // null if hidden
  submitted_at: string;
}

/** Edge Function response types */
export interface CreateBountyResponse {
  success: boolean;
  bounty_id?: number;
  room_id?: string;
  error?: string;
}

export interface ApplyBountyResponse {
  success: boolean;
  room_id?: string;
  error?: string;
}

export interface SubmitWorkResponse {
  success: boolean;
  error?: string;
}

/** Realtime message callback */
export type MessageCallback = (message: Message) => void;

/** Realtime room update callback */
export type RoomUpdateCallback = (room: BountyRoom) => void;
