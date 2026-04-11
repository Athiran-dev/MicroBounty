// // ─────────────────────────────────────────────────────
// // MicroBounty — Supabase Client Singleton
// // ─────────────────────────────────────────────────────
// // Creates a Supabase client that sends the connected
// // wallet address via x-wallet-address header for RLS.
// // ─────────────────────────────────────────────────────

// import { createClient, SupabaseClient } from '@supabase/supabase-js';

// const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
// const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
//   throw new Error(
//     'Missing Supabase environment variables. ' +
//     'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
//   );
// }

// // Track current client + wallet to recreate on wallet change
// let _client: SupabaseClient | null = null;
// let _currentWallet = '';

// /**
//  * Get the Supabase client configured for the given wallet address.
//  * The wallet is sent as a custom header used by RLS policies.
//  *
//  * Call this with the active wallet address from useWallet().
//  * When the wallet changes, a new client is created automatically.
//  *
//  * @param walletAddress - The connected Algorand wallet address (optional)
//  */
// export function getSupabase(walletAddress?: string): SupabaseClient {
//   const wallet = walletAddress || '';

//   if (!_client || wallet !== _currentWallet) {
//     _currentWallet = wallet;
//     _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
//       global: {
//         headers: wallet
//           ? { 'x-wallet-address': wallet }
//           : {},
//       },
//     });
//   }

//   return _client;
// }

// /**
//  * Get the Supabase project URL (for calling Edge Functions directly)
//  */
// export function getSupabaseUrl(): string {
//   return SUPABASE_URL;
// }

// /**
//  * Get the Supabase anon key (for Edge Function authorization header)
//  */
// export function getSupabaseAnonKey(): string {
//   return SUPABASE_ANON_KEY;
// }


// ─────────────────────────────────────────────────────
// MicroBounty — Supabase Client Singleton (WSL FIX)
// ─────────────────────────────────────────────────────
// Creates a Supabase client that sends the connected
// wallet address via x-wallet-address header for RLS.
// ─────────────────────────────────────────────────────

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    'Missing Supabase environment variables. ' +
    'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
  );
}


// Track current client + wallet to recreate on wallet change
let _client: SupabaseClient | null = null;
let _currentWallet = '';

/**
 * Get the Supabase client configured for the given wallet address.
 * The wallet is sent as a custom header used by RLS policies.
 */
export function getSupabase(walletAddress?: string): SupabaseClient {
  const wallet = walletAddress || '';

  // Recreate client if it doesn't exist OR if the wallet has changed
  if (!_client || wallet !== _currentWallet) {
    _currentWallet = wallet;
    
    console.log(`🌐 [Supabase] Initializing client for wallet: ${wallet || 'Anonymous'}`);
    
    _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: wallet
          ? { 'x-wallet-address': wallet }
          : {},
      },
    });
  }

  return _client;
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

// Optional: Default export if needed elsewhere
export const supabase = getSupabase();