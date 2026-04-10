import { useWallet } from '@txnlab/use-wallet-react';
import { useSnackbar } from 'notistack';
import { useMemo } from 'react';
import algosdk from 'algosdk';
import { AlgorandClient, microAlgos } from '@algorandfoundation/algokit-utils';
import { MicroBountyClient } from '../contracts/MicroBounty';
import { CONTRACT_CONFIG } from '../constants/contract';

const { APP_ID, APP_ADDRESS } = CONTRACT_CONFIG;

/**
 * Hook to manage Algorand smart contract interactions with MicroBounty.
 * Memoizes clients to ensure high performance and zero loading lag.
 */
export function useTransaction() {
  const { activeAddress, transactionSigner } = useWallet();
  const { enqueueSnackbar } = useSnackbar();

  // 🚀 PERFORMANCE: Memoize Algokit clients to prevent re-init lag
  const algorand = useMemo(() => {
    const client = AlgorandClient.testNet();
    if (activeAddress && transactionSigner) {
      client.account.setSigner(activeAddress, transactionSigner);
    }
    return client;
  }, [activeAddress, transactionSigner]);

  const appClient = useMemo(() => new MicroBountyClient({
    appId: BigInt(APP_ID),
    algorand,
  }), [algorand]);

  /**
   * CREATE BOUNTY
   */
  const createBounty = async (params: {
    rewardAmount: number;
    maxApplicants: number;
    deadline: number;
    split1: number;
    split2: number;
    split3: number;
  }): Promise<number | undefined> => {
    
    if (!activeAddress || !transactionSigner) {
      enqueueSnackbar('Secure Connection Required', { variant: 'error' });
      return;
    }

    try {
      const microAlgoAmount = Math.floor(Number(params.rewardAmount) * 1_000_000);
      const suggestedParams = await algorand.client.algod.getTransactionParams().do();
      
      const escrowPayment = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: activeAddress,
        receiver: APP_ADDRESS,
        amount: microAlgoAmount,
        suggestedParams,
      });

      const paymentWithSigner = { txn: escrowPayment, signer: transactionSigner };

      // Send Atomic Transaction Group
      // Align with ARC-56 generated client expected args
      const result = await appClient.send.createBounty({
        sender: activeAddress,
        args: {
          paymentTxn: paymentWithSigner,
          maxApplicants: params.maxApplicants,
          deadline: BigInt(params.deadline),
          split_1: params.split1,
          split_2: params.split2,
          split_3: params.split3,
        },
        populateAppCallResources: true,
      });

      return Number(result.return);

    } catch (e: any) {
      console.error("🔥 ON-CHAIN ERROR:", e);
      enqueueSnackbar(`Bounty Deployment Failed: ${e.message || e}`, { variant: 'error' });
      throw e;
    }
  };

  /**
   * APPLY FOR BOUNTY
   */
  const applyBounty = async (bountyId: number) => {
    if (!activeAddress || !transactionSigner) return;
    try {
      await appClient.send.applyBounty({
        sender: String(activeAddress),
        args: { 
          bountyId: BigInt(bountyId) 
        } as any,
        populateAppCallResources: true,
      });
      return true;
    } catch (e: any) {
      console.error("🔥 APPLY ERROR:", e);
      throw e;
    }
  };

  /**
   * SUBMIT WORK
   */
  const submitWork = async (bountyId: number, deployLinkHash: Uint8Array, githubLink: string, commitHash: string) => {
    if (!activeAddress || !transactionSigner) return;
    try {
      await appClient.send.submitWork({
        sender: String(activeAddress),
        args: {
          bountyId: BigInt(bountyId),
          deployLinkHash: deployLinkHash,
          githubLink: githubLink,
          commitHash: commitHash,
        } as any,
        populateAppCallResources: true,
      });
      return true;
    } catch (e: any) {
      console.error("🔥 SUBMIT ERROR:", e);
      throw e;
    }
  };

  /**
   * SELECT WINNER AND PAY
   */
  const selectWinnerAndPay = async (bountyId: number, w1: string, w2: string, w3: string) => {
    if (!activeAddress || !transactionSigner) return;
    try {
      await appClient.send.selectWinnerAndPay({
        sender: String(activeAddress),
        args: { 
          bountyId: BigInt(bountyId), 
          w1, w2, w3 
        } as any,
        populateAppCallResources: true,
        extraFee: microAlgos(3000),
      });
      return true;
    } catch (e: any) {
      console.error("🔥 PAYOUT ERROR:", e);
      throw e;
    }
  };

  return { algorand, appClient, createBounty, applyBounty, submitWork, selectWinnerAndPay };
}
