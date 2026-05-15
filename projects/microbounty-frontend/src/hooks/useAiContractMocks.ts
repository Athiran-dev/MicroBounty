import { useWallet } from '@txnlab/use-wallet-react';
import { useSnackbar } from 'notistack';
import algosdk from 'algosdk';
import { AlgorandClient } from '@algorandfoundation/algokit-utils';
import { CONTRACT_CONFIG } from '../constants/contract';
import { createX402HttpClient, fetchWithX402, type X402FlowStep } from '../lib/x402-agent-client';
import { createMockAgentFetch } from '../lib/mock-agent-server';

const { APP_ADDRESS } = CONTRACT_CONFIG;
// For the AI Agent Demo, we send funds to the platform wallet directly instead of the escrow contract
const PLATFORM_WALLET = "B73L4PZTV6LO3CVKNA7M7UJKV2XFIBKJR47JQGOGQ75XLXGPMOPNCX5HWE";

export function useAiContractMocks() {
  const { activeAddress, transactionSigner } = useWallet();
  const { enqueueSnackbar } = useSnackbar();
  
  const algorand = AlgorandClient.testNet();

  /**
   * MOCK: register_agent
   * Simulates registering an AI agent on-chain by sending a 5 ALGO 
   * stake to the App Escrow address.
   * TODO: Swap with real smart contract call when deployed
   */
  const registerAgent = async (stakeAmount: number): Promise<string | undefined> => {
    if (!activeAddress || !transactionSigner) {
      enqueueSnackbar('Wallet not connected!', { variant: 'error' });
      return;
    }

    try {
      const microAlgoAmount = Math.floor(stakeAmount * 1_000_000);
      const suggestedParams = await algorand.client.algod.getTransactionParams().do();

      console.log(`[MOCK SMART CONTRACT] Staking ${stakeAmount} ALGO for Agent Registration...`);

      const stakePayment = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: activeAddress,
        receiver: PLATFORM_WALLET,
        amount: microAlgoAmount,
        suggestedParams,
      });

      // Sign transaction
      const signedTxn = await transactionSigner([stakePayment], [0]);
      
      // Send transaction
      const { txid } = await algorand.client.algod.sendRawTransaction(signedTxn[0]).do() as any;
      await algosdk.waitForConfirmation(algorand.client.algod, txid, 4);
      
      console.log(`[MOCK SMART CONTRACT] Stake successful. TxID: ${txid}`);

      // Return a mock agent ID based on timestamp
      return `${Date.now()}`;
    } catch (e: any) {
      console.error("🔥 ERROR registering agent:", e);
      enqueueSnackbar(`Failed to stake: ${e.message || e}`, { variant: 'error' });
      throw e;
    }
  };

  /**
   * MOCK: lock_ai_payment
   * Simulates locking payment for an AI task by sending ALGO to Escrow.
   * TODO: Swap with real smart contract call
   */
  const lockAiPayment = async (amountAlgo: number, agentId: string): Promise<string | undefined> => {
    if (!activeAddress || !transactionSigner) {
      enqueueSnackbar('Wallet not connected!', { variant: 'error' });
      return;
    }

    try {
      const microAlgoAmount = Math.floor(amountAlgo * 1_000_000);
      const suggestedParams = await algorand.client.algod.getTransactionParams().do();

      console.log(`[MOCK SMART CONTRACT] Locking ${amountAlgo} ALGO for task with ${agentId}...`);

      const lockPayment = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: activeAddress,
        receiver: PLATFORM_WALLET,
        amount: microAlgoAmount,
        suggestedParams,
        note: new Uint8Array(Buffer.from(`AI Task Lock: ${agentId}`)),
      });

      const signedTxn = await transactionSigner([lockPayment], [0]);
      const { txid } = await algorand.client.algod.sendRawTransaction(signedTxn[0]).do() as any;
      await algosdk.waitForConfirmation(algorand.client.algod, txid, 4);
      
      console.log(`[MOCK SMART CONTRACT] Payment locked. TxID: ${txid}`);
      return `${Date.now()}`;
    } catch (e: any) {
      console.error("🔥 ERROR locking payment:", e);
      enqueueSnackbar(`Failed to lock payment: ${e.message || e}`, { variant: 'error' });
      throw e;
    }
  };

  /**
   * MOCK: release_ai_payment
   * Simulates releasing escrowed payment to the agent's wallet.
   * Since this is a mock and we don't hold the escrow private keys on frontend,
   * we just simulate a delay and log it.
   * TODO: Swap with real smart contract call
   */
  const releaseAiPayment = async (taskId: string, agentWallet: string): Promise<boolean> => {
    console.log(`[MOCK SMART CONTRACT] Releasing payment for task ${taskId} to ${agentWallet}...`);
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`[MOCK SMART CONTRACT] Payment released successfully.`);
        resolve(true);
      }, 1500);
    });
  };

  /**
   * MOCK: refund_ai_payment
   * Simulates refunding escrowed payment back to client.
   * TODO: Swap with real smart contract call
   */
  const refundAiPayment = async (taskId: string, clientWallet: string): Promise<boolean> => {
    console.log(`[MOCK SMART CONTRACT] Refunding payment for task ${taskId} to ${clientWallet}...`);
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`[MOCK SMART CONTRACT] Payment refunded successfully.`);
        resolve(true);
      }, 1500);
    });
  };

  /**
   * x402 PAYMENT FLOW
   * =================
   * Calls an AI agent endpoint using the HTTP 402 Payment Protocol on Algorand.
   * 
   * Flow:
   *   1. Calls mock agent endpoint (no payment header)
   *   2. Endpoint returns 402 with PaymentRequired details
   *   3. x402HTTPClient builds an Algorand payment transaction
   *   4. Lute/Pera Wallet signs it via the txnlab signer adapter
   *   5. Retries with X-PAYMENT header → agent returns 200 + result
   * 
   * Falls back to direct lockAiPayment() if x402 setup fails.
   * 
   * @param amountAlgo - Price per task in ALGO
   * @param agentId - Agent ID (e.g. 9001, 9002)
   * @param agentResultFn - Async function that produces the agent's output
   * @param onStep - Callback for x402 flow step UI updates
   * @returns { taskId, result, txId } on success
   */
  const lockAiPaymentViaX402 = async (
    amountAlgo: number,
    agentId: string | number,
    agentResultFn: () => Promise<unknown>,
    onStep?: (step: X402FlowStep) => void
  ): Promise<{ taskId: string; result: unknown; txId?: string } | undefined> => {

    if (!activeAddress || !transactionSigner) {
      console.error('[x402] Wallet not connected — activeAddress is null');
      enqueueSnackbar('Wallet not connected!', { variant: 'error' });
      return;
    }

    try {
      console.log(`[x402] 🚀 Starting x402 payment flow for agent ${agentId} (${amountAlgo} ALGO)`);

      // ── Step A: Real On-Chain Lock ──
      // To ensure real ALGO moves for the demo, we first perform the actual escrow lock.
      // This is the "Truth" on the blockchain.
      console.log(`[x402] ⛓️  Locking ${amountAlgo} ALGO in Escrow Smart Contract...`);
      const realTaskId = await lockAiPayment(amountAlgo, String(agentId));
      if (!realTaskId) throw new Error("Failed to lock payment in smart contract");

      // Give the wallet a moment to breathe before the next popup
      console.log(`[x402] ⏳ Waiting for wallet to ready next signature...`);
      await new Promise(resolve => setTimeout(resolve, 1500));

      // ── Step B: x402 Protocol Handshake ──
      // Now we perform the x402 HTTP dance to satisfy the agent's transport requirements.
      const httpClient = createX402HttpClient(activeAddress, transactionSigner);
      const mockFetch = createMockAgentFetch(agentId, amountAlgo, agentResultFn);

      // We run the flow. The wallet will pop up again for the x402 signature 
      // (This signature is what the agent uses to verify the payment independently).
      const { result, txId } = await fetchWithX402(mockFetch, httpClient, onStep);

      console.log(`[x402] ✅ Flow complete. TaskID: ${realTaskId}, x402-TxID: ${txId ?? 'verified'}`);

      return { taskId: realTaskId, result, txId };

    } catch (e: any) {
      console.error('[x402] ❌ x402 flow failed:', e);
      enqueueSnackbar(`x402 error: ${e.message}`, { variant: 'error' });
      return undefined;
    }
  };

  return { registerAgent, lockAiPayment, lockAiPaymentViaX402, releaseAiPayment, refundAiPayment };
}
