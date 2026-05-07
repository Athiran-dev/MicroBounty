/**
 * x402 Agent Client — MicroBounty
 * ================================
 * Implements the x402 HTTP Payment Protocol (Algorand flavour via @x402-avm)
 * for calling AI agent endpoints that require on-the-fly micropayments.
 *
 * Flow:
 *  1. Client calls agent endpoint → receives 402 Payment Required
 *  2. x402HTTPClient decodes the PaymentRequired from headers
 *  3. Creates an Algorand payment txn, signs with Lute/Pera via txnlab adapter
 *  4. Retries the request with X-PAYMENT header
 *  5. Server accepts → returns 200 with agent result
 *
 * This runs ALONGSIDE the existing lockAiPayment() escrow flow.
 * x402 = transport layer; escrow = on-chain verification layer.
 */

import { x402Client, x402HTTPClient } from '@x402-avm/core/client';
import type { PaymentRequired } from '@x402-avm/core/types';
import { registerExactAvmScheme } from '@x402-avm/avm/exact/client';
import type { ClientAvmSigner } from '@x402-avm/avm';
import algosdk from 'algosdk';

// Algorand Testnet CAIP-2 identifier (genesis hash based)
export const ALGO_TESTNET_CAIP2 = 'algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface X402AgentRequest {
  agentId: string | number;
  prompt: string;
  amountAlgo: number;
  payTo: string; // Escrow / agent receiver address
}

export interface X402AgentResponse {
  status: 200 | 402;
  result?: unknown;
  paymentRequired?: PaymentRequired;
  txId?: string; // Confirmed Algorand TxID if payment was made
}

export type X402FlowStep =
  | 'idle'
  | 'requesting'
  | '402_received'
  | 'signing'
  | 'retrying'
  | 'success'
  | 'error';

// ─── Wallet Signer Adapter ───────────────────────────────────────────────────

/**
 * Adapts @txnlab/use-wallet-react's transactionSigner to the
 * ClientAvmSigner interface expected by @x402-avm.
 *
 * @txnlab signer: (txns: algosdk.Transaction[], indices: number[]) => Promise<Uint8Array[]>
 * x402 signer:   (txns: Uint8Array[], indices?: number[]) => Promise<(Uint8Array | null)[]>
 *
 * Works with both Lute Wallet and Pera Wallet via the txnlab abstraction.
 */
export function createX402Signer(
  activeAddress: string,
  transactionSigner: (txns: algosdk.Transaction[], indices: number[]) => Promise<Uint8Array[]>
): ClientAvmSigner {
  return {
    address: activeAddress,

    async signTransactions(
      txns: Uint8Array[],
      indexesToSign?: number[]
    ): Promise<(Uint8Array | null)[]> {
      console.log('[x402] 🖊️  Signing Algorand payment transaction via Lute/Pera Wallet...');

      // Decode raw Uint8Array → algosdk Transaction objects
      const decodedTxns = txns.map((rawTxn) => {
        try {
          return algosdk.decodeUnsignedTransaction(rawTxn);
        } catch {
          // Might already be signed (multisig scenarios), decode as signed
          return algosdk.decodeSignedTransaction(rawTxn).txn;
        }
      });

      // Determine which indices to sign
      const indices = indexesToSign ?? decodedTxns.map((_, i) => i);

      // Sign via the wallet (Lute or Pera — txnlab handles it)
      const signedTxns = await transactionSigner(decodedTxns, indices);

      // --- ACTUALLY SUBMIT TO NETWORK ---
      // The mock server doesn't have an Algorand node connection to submit it for us.
      // To ensure the payment actually happens on-chain for the hackathon demo, we submit it here.
      try {
        console.log('[x402] 🌐 Submitting signed x402 payment to Algorand Testnet...');
        
        // Concatenate Uint8Array array into a single Uint8Array for sendRawTransaction
        const totalLength = signedTxns.reduce((sum, txn) => sum + txn.length, 0);
        const concatenatedTxns = new Uint8Array(totalLength);
        let offset = 0;
        for (const txn of signedTxns) {
          concatenatedTxns.set(txn, offset);
          offset += txn.length;
        }

        const algokit = await import('@algorandfoundation/algokit-utils');
        const algoClient = algokit.AlgorandClient.testNet();
        const { txid } = await algoClient.client.algod.sendRawTransaction(concatenatedTxns).do() as any;
        console.log(`[x402] 🔗 Payment submitted! TxID: ${txid}`);
        
        // Wait for confirmation
        await algosdk.waitForConfirmation(algoClient.client.algod, txid, 4);
        console.log(`[x402] ✅ Payment confirmed on-chain!`);
      } catch (e) {
        console.error('[x402] ⚠️ Failed to submit transaction to network:', e);
        throw new Error(`Failed to submit payment to Algorand: ${e}`);
      }

      // Map back: signed indices get their Uint8Array, others get null
      const result: (Uint8Array | null)[] = txns.map((_, i) => {
        const signedIdx = indices.indexOf(i);
        return signedIdx !== -1 ? signedTxns[signedIdx] : null;
      });

      console.log('[x402] ✅ Transaction signed successfully');
      return result;
    },
  };
}

// ─── x402 Client Factory ─────────────────────────────────────────────────────

/**
 * Creates a fully configured x402HTTPClient with Algorand AVM support.
 * Registers the ExactAvmScheme for both testnet and mainnet wildcard.
 */
export function createX402HttpClient(
  activeAddress: string,
  transactionSigner: (txns: algosdk.Transaction[], indices: number[]) => Promise<Uint8Array[]>
): x402HTTPClient {
  const signer = createX402Signer(activeAddress, transactionSigner);

  const baseClient = new x402Client();
  registerExactAvmScheme(baseClient, {
    signer,
    // Support all Algorand networks (wildcard)
    // networks: [ALGO_TESTNET_CAIP2] // uncomment to restrict to testnet only
  });

  return new x402HTTPClient(baseClient);
}

// ─── Mock Fetch with x402 Handling ───────────────────────────────────────────

/**
 * Wraps a fetch-like function with automatic x402 payment handling.
 * When the endpoint returns 402, it builds + signs an Algorand payment and retries.
 *
 * @param fetchFn - The function to call (real fetch or mock endpoint simulator)
 * @param httpClient - The configured x402HTTPClient
 * @param onStep - Callback for UI step updates
 */
export async function fetchWithX402(
  fetchFn: (paymentHeader?: string) => Promise<Response>,
  httpClient: x402HTTPClient,
  onStep?: (step: X402FlowStep) => void
): Promise<{ result: unknown; txId?: string }> {

  onStep?.('requesting');
  console.log('[x402] 📡 Sending initial request to agent endpoint...');

  // ── Step 1: Initial request (no payment header) ──
  const initialResponse = await fetchFn();

  if (initialResponse.status !== 402) {
    // Already authorized or error
    const result = await initialResponse.json();
    onStep?.('success');
    return { result };
  }

  // ── Step 2: Parse 402 Payment Required ──
  onStep?.('402_received');
  console.log('[x402] 🔒 402 Payment Required received. Decoding payment requirements...');

  const paymentRequired = httpClient.getPaymentRequiredResponse(
    (name: string) => initialResponse.headers.get(name),
    await initialResponse.json().catch(() => undefined)
  );

  const pr = paymentRequired as any;
  console.log('[x402] 📋 Payment Required:', {
    resource: pr.resource,
    description: pr.description,
    requirements: (pr.accepts ?? pr.paymentRequirements)?.map((r: any) => ({
      scheme: r.scheme,
      network: r.network,
      amount: r.maxAmountRequired,
      payTo: r.payTo,
    }))
  });

  // ── Step 3: Create & sign payment payload ──
  onStep?.('signing');
  console.log('[x402] ✍️  Building Algorand payment payload...');

  const paymentPayload = await httpClient.createPaymentPayload(paymentRequired);
  const paymentHeaders = httpClient.encodePaymentSignatureHeader(paymentPayload);

  console.log('[x402] 📦 Payment payload created. Sending retry request with X-PAYMENT header...');

  // ── Step 4: Retry with payment header ──
  onStep?.('retrying');
  const paymentHeaderValue = paymentHeaders['X-PAYMENT'] || paymentHeaders['x-payment'] || '';
  const retryResponse = await fetchFn(paymentHeaderValue);

  if (!retryResponse.ok) {
    const errorBody = await retryResponse.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(`[x402] Agent rejected payment: ${JSON.stringify(errorBody)}`);
  }

  // ── Step 5: Parse settle response ──
  const settleResponse = httpClient.getPaymentSettleResponse(
    (name: string) => retryResponse.headers.get(name)
  );

  console.log('[x402] 🎉 Payment settled!', settleResponse);
  onStep?.('success');

  const result = await retryResponse.json();
  return {
    result,
    txId: (settleResponse as any)?.txId ?? (settleResponse as any)?.transaction ?? undefined,
  };
}
