/**
 * Mock Agent Server — MicroBounty x402
 * =====================================
 * Simulates an x402-protected AI agent HTTP endpoint entirely in the browser.
 * Since MicroBounty is a Vite-only frontend (no Node.js backend), this module
 * faithfully replicates the 402 → pay → 200 wire protocol client-side.
 *
 * What a REAL server would do:
 *  1. Receive request → check X-PAYMENT header
 *  2. If missing → return 402 with X-PAYMENT-REQUIRED header
 *  3. Verify payment on Algorand → return 200 with result
 *
 * This mock does exactly the same, producing real HTTP Response objects
 * with the correct headers so x402HTTPClient can process them natively.
 */

import type { PaymentRequired } from '@x402-avm/core/types';
import { ALGO_TESTNET_CAIP2 } from './x402-agent-client';

// ─── Agent Endpoint Config ────────────────────────────────────────────────────

const AGENT_CONFIGS: Record<string | number, {
  name: string;
  description: string;
  priceAlgo: number;
}> = {
  9001: {
    name: 'DocuMind Research AI',
    description: 'Analyzes research papers and extracts key findings',
    priceAlgo: 0.5,
  },
  9002: {
    name: 'Smart Contract Auditor',
    description: 'Audits smart contracts for security vulnerabilities',
    priceAlgo: 1.0,
  },
};

const DEFAULT_AGENT = {
  name: 'Generic AI Agent',
  description: 'General purpose AI task executor',
  priceAlgo: 0.1,
};

// Algorand Testnet escrow address (App Address from CONTRACT_CONFIG)
const PAYMENT_RECEIVER = import.meta.env.VITE_X402_AGENT_RECEIVER
  || import.meta.env.VITE_APP_ADDRESS
  || 'ISOM7J3NG65QEK4ZMH3ZREXDQBH4NMALY6M22HL7BXDMDSEBJNWO7DAHWY';

// ─── PaymentRequired Builder ──────────────────────────────────────────────────

/**
 * Builds a PaymentRequired object for an agent endpoint.
 * This is what a real x402 server would include in its 402 response headers.
 */
function buildPaymentRequired(agentId: string | number, amountAlgo: number): PaymentRequired {
  const config = AGENT_CONFIGS[agentId] ?? DEFAULT_AGENT;
  const amountMicroAlgo = BigInt(Math.floor(amountAlgo * 1_000_000));
  const resource = `https://microbounty.app/api/agent/${agentId}`;

  return {
    x402Version: 2,
    resource,
    description: config.description,
    accepts: [
      {
        scheme: 'exact',
        network: ALGO_TESTNET_CAIP2,
        amount: amountMicroAlgo.toString(),
        resource,
        description: `Pay to run ${config.name}`,
        mimeType: 'application/json',
        payTo: PAYMENT_RECEIVER,
        maxTimeoutSeconds: 120,
        asset: '0', // Native ALGO (not an ASA)
        outputSchema: null,
        extra: {
          name: 'Algorand',
          version: '2',
          agentId: String(agentId),
          agentName: config.name,
        },
      },
    ],
  } as unknown as PaymentRequired;
}

// ─── Mock Fetch Function Factory ──────────────────────────────────────────────

/**
 * Creates a mock fetch function for a specific agent endpoint.
 * Returns a function that:
 *  - Without paymentHeader → returns a real Response(402) with correct x402 headers
 *  - With paymentHeader → validates it exists, returns Response(200) with agent result
 *
 * The returned function is passed directly to fetchWithX402() in x402-agent-client.ts
 *
 * @param agentId - The agent ID
 * @param amountAlgo - Price in ALGO
 * @param agentResultFn - Async function that produces the actual agent output
 */
export function createMockAgentFetch(
  agentId: string | number,
  amountAlgo: number,
  agentResultFn: () => Promise<unknown>
): (paymentHeader?: string) => Promise<Response> {

  const paymentRequired = buildPaymentRequired(agentId, amountAlgo);

  return async (paymentHeader?: string): Promise<Response> => {

    // ── Simulate network latency ──
    await new Promise(res => setTimeout(res, 300));

    // ── No payment header → 402 ──
    if (!paymentHeader) {
      console.log(`[x402-mock-server] 🚦 No payment header. Returning 402 Payment Required.`);
      console.log(`[x402-mock-server] 📋 Payment required:`, paymentRequired);

      // Encode PaymentRequired as base64 JSON for the X-PAYMENT-REQUIRED header
      // (x402 v2 spec: header contains base64-encoded JSON of PaymentRequired)
      const paymentRequiredBase64 = btoa(JSON.stringify(paymentRequired));

      return new Response(
        JSON.stringify({ error: 'Payment required', x402Version: 2 }),
        {
          status: 402,
          statusText: 'Payment Required',
          headers: {
            'Content-Type': 'application/json',
            'X-PAYMENT-REQUIRED': paymentRequiredBase64,
            // v1 compat header (some x402 libs check this too)
            'X-Payment-Required': paymentRequiredBase64,
          },
        }
      );
    }

    // ── Payment header present → verify and serve ──
    console.log(`[x402-mock-server] ✅ Payment header received. Verifying...`);
    console.log(`[x402-mock-server] 💳 X-PAYMENT: ${paymentHeader.slice(0, 80)}...`);

    // In a real server, we'd verify the Algorand txn on-chain here.
    // For the mock, presence of the header = valid payment (demo mode).
    console.log(`[x402-mock-server] 🔍 Payment verified (mock). Running agent task...`);

    // Run the actual agent logic
    const result = await agentResultFn();

    // Build settle response headers
    const mockTxId = `MOCK_${Date.now()}_${agentId}`;
    const settleResponseBase64 = btoa(JSON.stringify({
      success: true,
      transaction: mockTxId,
      network: ALGO_TESTNET_CAIP2,
    }));

    console.log(`[x402-mock-server] 🎯 Agent task complete. Returning 200 with result.`);

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        statusText: 'OK',
        headers: {
          'Content-Type': 'application/json',
          'X-PAYMENT-RESPONSE': settleResponseBase64,
          'X-Payment-Response': settleResponseBase64,
        },
      }
    );
  };
}

// ─── Convenience helper ───────────────────────────────────────────────────────

/**
 * Returns a human-readable description of the x402 flow for UI display.
 */
export function getX402FlowDescription(step: string): string {
  const steps: Record<string, string> = {
    idle:        'Ready to call agent',
    requesting:  '📡 Contacting agent endpoint...',
    '402_received': '🔒 Agent requires payment (HTTP 402)',
    signing:     '✍️  Signing Algorand payment with Lute Wallet...',
    retrying:    '🔄 Retrying with payment proof...',
    success:     '✅ Payment accepted — agent responded',
    error:       '❌ Payment or agent error',
  };
  return steps[step] ?? step;
}
