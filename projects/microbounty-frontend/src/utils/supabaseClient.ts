// ─────────────────────────────────────────────────────
// MicroBounty — Supabase Client Singleton (STABLE)
// ─────────────────────────────────────────────────────
// Creates a Supabase client that sends the connected
// wallet address via x-wallet-address header for RLS.
// ─────────────────────────────────────────────────────

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// 🔥 HACKATHON HARDCODE: Bypassing .env because of WSL sync issues
const SUPABASE_URL = "https://sditsitcwpjsxbxnzqtf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkaXRzaXRjd3Bqc3hieG56cXRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5MzQzNjUsImV4cCI6MjA5MTUxMDM2NX0.GLkobr56jCt1FEOfVjF1gRtiEb8O-Vjfm1zbzU0ZRdA";

// 🛡️ DUAL SINGLETON CACHE
// We maintain exactly one anonymous client and one authenticated client per wallet address
// to prevent the "Multiple GoTrueClient instances" warning.
let _anonClient: SupabaseClient | null = null;
let _authClient: SupabaseClient | null = null;
let _currentAuthWallet = '';

/**
 * Get the Supabase client configured for the given wallet address.
 * The wallet is sent as a custom header used by RLS policies.
 */
export function getSupabase(walletAddress?: string): SupabaseClient {
  const wallet = walletAddress || '';

  // Case 1: Anonymous Request
  if (!wallet) {
    if (!_anonClient) {
      console.log('🌐 [Supabase] Initializing singleton ANONYMOUS client');
      _anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false, detectSessionInUrl: false }
      });
    }
    return _anonClient;
  }

  // Case 2: Authenticated Request (with wallet header)
  if (!_authClient || wallet !== _currentAuthWallet) {
    _currentAuthWallet = wallet;
    console.log(`🌐 [Supabase] Initializing singleton AUTH client for wallet: ${wallet}`);
    
    _authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, detectSessionInUrl: false },
      global: {
        headers: { 'x-wallet-address': wallet }
      },
    });
  }

  return _authClient;
}

/**
 * Get the Supabase project URL (for calling Edge Functions directly)
 */
export function getSupabaseUrl(): string {
  return SUPABASE_URL;
}

/**
 * Get the Supabase anon key (for Edge Function authorization header)
 */
export function getSupabaseAnonKey(): string {
  return SUPABASE_ANON_KEY;
}

// Optional: Default export for standard usage
export const supabase = getSupabase();