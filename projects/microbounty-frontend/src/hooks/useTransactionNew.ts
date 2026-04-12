import { useWallet } from '@txnlab/use-wallet-react';
import { useSnackbar } from 'notistack';
import algosdk from 'algosdk';
import { AlgorandClient } from '@algorandfoundation/algokit-utils';
import { MicroBountyClient } from '../contracts/MicroBounty';
import { CONTRACT_CONFIG } from '../constants/contract';

const { APP_ID, APP_ADDRESS } = CONTRACT_CONFIG;

export function useTransaction() {
  const { activeAddress, transactionSigner } = useWallet();
  const { enqueueSnackbar } = useSnackbar();

  // Initialize Algokit clients
  // Note: Using testnet by default as per the project context
  const algorand = AlgorandClient.testNet();
  const appClient = new MicroBountyClient({
    appId: BigInt(APP_ID),
    algorand,
  });

  /**
   * CREATE BOUNTY
   * Uses a raw transaction builder to bypass algosdk/algokit versioning issues
   * and ensure compatibility with wallets like Lute.
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
      enqueueSnackbar('Wallet not connected!', { variant: 'error' });
      return;
    }

    try {
      const microAlgoAmount = Math.floor(Number(params.rewardAmount) * 1_000_000);
      const suggestedParams = await algorand.client.algod.getTransactionParams().do();

      console.log("🚀 [FINAL SPRINT] Manual Transaction Build...");

      // 🔥 RAW TRANSACTION BUILDER (algosdk V3 compatible)
      const escrowPayment = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: activeAddress,
        receiver: APP_ADDRESS,
        amount: microAlgoAmount,
        suggestedParams,
      });

      const paymentWithSigner = { txn: escrowPayment, signer: transactionSigner };

      // Send the Atomic Transaction Group
      const result = await appClient.send.createBounty({
        // 🔥 THE FIX: AlgoKit needs both 'addr' and 'signer' together here
        sender: {
          addr: activeAddress,
          signer: transactionSigner
        },
        args: {
          paymentTxn: paymentWithSigner,
          payment_txn: paymentWithSigner, // Fallback for generated client
          maxApplicants: params.maxApplicants,
          max_applicants: params.maxApplicants,
          deadline: BigInt(params.deadline),
          split1: params.split1,
          split_1: params.split1,
          split2: params.split2,
          split_2: params.split2,
          split3: params.split3,
          split_3: params.split3,
        } as any,
        populateAppCallResources: true,
      });

      return Number(result.return);

    } catch (e: any) {
      console.error("🔥 ERROR:", e);
      enqueueSnackbar(`Failed: ${e.message || e}`, { variant: 'error' });
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
          bounty_id: BigInt(bountyId),
          bountyId: BigInt(bountyId)
        } as any,
        populateAppCallResources: true,
      });
      return true;
    } catch (e: any) {
      console.error(e);
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
          bounty_id: BigInt(bountyId), bountyId: BigInt(bountyId),
          deploy_link_hash: deployLinkHash, deployLinkHash: deployLinkHash,
          github_link: githubLink, githubLink: githubLink,
          commit_hash: commitHash, commitHash: commitHash,
        } as any,
        populateAppCallResources: true,
      });
      return true;
    } catch (e: any) {
      console.error(e);
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
          bounty_id: BigInt(bountyId),
          bountyId: BigInt(bountyId),
          w1, w2, w3
        } as any,
        populateAppCallResources: true,
      });
      return true;
    } catch (e: any) {
      console.error(e);
      throw e;
    }
  };

  return { algorand, appClient, createBounty, applyBounty, submitWork, selectWinnerAndPay };
}
