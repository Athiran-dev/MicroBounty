import { useWallet } from '@txnlab/use-wallet-react';
import { useSnackbar } from 'notistack';
import algosdk from 'algosdk';
import { AlgorandClient } from '@algorandfoundation/algokit-utils';
import { CONTRACT_CONFIG } from '../constants/contract';

const { APP_ADDRESS } = CONTRACT_CONFIG;

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
        receiver: APP_ADDRESS,
        amount: microAlgoAmount,
        suggestedParams,
      });

      // Sign transaction
      const signedTxn = await transactionSigner([stakePayment], [0]);
      
      // Send transaction
      const { txId } = await algorand.client.algod.sendRawTransaction(signedTxn[0]).do();
      await algosdk.waitForConfirmation(algorand.client.algod, txId, 4);
      
      console.log(`[MOCK SMART CONTRACT] Stake successful. TxID: ${txId}`);

      // Return a mock agent ID based on timestamp
      return `agent_${Date.now()}`;
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
        receiver: APP_ADDRESS,
        amount: microAlgoAmount,
        suggestedParams,
        note: new Uint8Array(Buffer.from(`AI Task Lock: ${agentId}`)),
      });

      const signedTxn = await transactionSigner([lockPayment], [0]);
      const { txId } = await algorand.client.algod.sendRawTransaction(signedTxn[0]).do();
      await algosdk.waitForConfirmation(algorand.client.algod, txId, 4);
      
      console.log(`[MOCK SMART CONTRACT] Payment locked. TxID: ${txId}`);

      return `task_${Date.now()}`;
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

  return { registerAgent, lockAiPayment, releaseAiPayment, refundAiPayment };
}
