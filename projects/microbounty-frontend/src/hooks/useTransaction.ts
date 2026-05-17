import { useWallet } from '@txnlab/use-wallet-react';
import { useSnackbar } from 'notistack';
import { useMemo } from 'react';
import algosdk from 'algosdk';
import { AlgorandClient } from '@algorandfoundation/algokit-utils';
import { MicroBountyClient } from '../contracts/MicroBounty';
import { CONTRACT_CONFIG } from '../constants/contract';

const { APP_ID, APP_ADDRESS } = CONTRACT_CONFIG;

// Raw algod client for building/sending atomic groups
const algodClient = new algosdk.Algodv2('', 'https://testnet-api.algonode.cloud', 443);

/**
 * ABI method selector helper — returns the 4-byte method selector
 * for the given method signature string.
 */
function methodSelector(signature: string): Uint8Array {
  return algosdk.ABIMethod.fromSignature(signature).getSelector();
}

/**
 * Hook to manage Algorand smart contract interactions with MicroBounty.
 * Uses raw algosdk atomic groups for all new contract functions.
 * The MicroBountyClient is only used for read-only getters (get_bounty).
 */
export function useTransaction() {
  const { activeAddress, transactionSigner } = useWallet();
  const { enqueueSnackbar } = useSnackbar();

  // AlgorandClient for the old appClient getter calls only
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

  // ─────────────────────────────────────────────────────────────────────
  // HELPER: build + sign + send an atomic group
  // ─────────────────────────────────────────────────────────────────────
  const sendAtomicGroup = async (txns: algosdk.Transaction[]): Promise<Uint8Array> => {
    algosdk.assignGroupID(txns);
    const indices = txns.map((_, i) => i);
    const signedTxns = await transactionSigner!(txns, indices);
    const { txid } = await algodClient.sendRawTransaction(signedTxns).do() as { txid: string };
    await algosdk.waitForConfirmation(algodClient, txid, 6);
    return signedTxns[0];
  };

  // ─────────────────────────────────────────────────────────────────────
  // CREATE BOUNTY
  // Atomic: PaymentTxn → create_bounty ABI call
  // Returns: bounty_id (uint64 from ABI return)
  // ─────────────────────────────────────────────────────────────────────
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
      const sp = await algodClient.getTransactionParams().do();

      const payTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: activeAddress,
        receiver: APP_ADDRESS,
        amount: microAlgoAmount,
        suggestedParams: sp,
      });

      const paymentWithSigner = { txn: payTxn, signer: transactionSigner };

      // Use the appClient for create_bounty since it's in the original ABI
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

    } catch (e: unknown) {
      const err = e as Error;
      console.error('🔥 CREATE BOUNTY ERROR:', err);
      enqueueSnackbar(`Bounty Deployment Failed: ${err.message || String(e)}`, { variant: 'error' });
      throw e;
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  // APPLY FOR BOUNTY
  // ─────────────────────────────────────────────────────────────────────
  const applyBounty = async (bountyId: number): Promise<boolean> => {
    if (!activeAddress || !transactionSigner) return false;
    try {
      await appClient.send.applyBounty({
        sender: String(activeAddress),
        args: { bountyId: BigInt(bountyId) } as never,
        populateAppCallResources: true,
      });
      return true;
    } catch (e: unknown) {
      const err = e as Error;
      console.error('🔥 APPLY ERROR:', err);
      throw e;
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  // SUBMIT WORK
  // deploy_link_hash = SHA-256 Uint8Array[32] from caller
  // ─────────────────────────────────────────────────────────────────────
  const submitWork = async (
    bountyId: number,
    deployLinkHash: Uint8Array,
    githubLink: string,
    commitHash: string
  ): Promise<boolean> => {
    if (!activeAddress || !transactionSigner) return false;
    try {
      await appClient.send.submitWork({
        sender: String(activeAddress),
        args: {
          bountyId: BigInt(bountyId),
          deployLinkHash,
          githubLink,
          commitHash,
        } as never,
        populateAppCallResources: true,
      });
      return true;
    } catch (e: unknown) {
      const err = e as Error;
      console.error('🔥 SUBMIT ERROR:', err);
      throw e;
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  // SET WINNERS — raw algosdk call
  // method: set_winners(uint64,address,address,address)void
  // ─────────────────────────────────────────────────────────────────────
  const setWinners = async (
    bountyId: number,
    w1: string,
    w2: string,
    w3: string
  ): Promise<boolean> => {
    if (!activeAddress || !transactionSigner) {
      enqueueSnackbar('Wallet not connected', { variant: 'error' });
      return false;
    }
    try {
      const sp = await algodClient.getTransactionParams().do();
      // Extra fee for inner transactions (3 winner payouts)
      sp.fee = BigInt(4000);
      sp.flatFee = true;

      const selector = methodSelector('set_winners(uint64,address,address,address)void');

      // Encode addresses as 32-byte public keys
      const encodeAddr = (addr: string) => algosdk.decodeAddress(addr).publicKey;

      const appCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
        sender: activeAddress,
        appIndex: APP_ID,
        appArgs: [
          selector,
          algosdk.encodeUint64(bountyId),
          encodeAddr(w1),
          encodeAddr(w2),
          encodeAddr(w3),
        ],
        accounts: [w1, w2, w3],
        suggestedParams: sp,
      });

      algosdk.assignGroupID([appCallTxn]);
      const signedTxns = await transactionSigner([appCallTxn], [0]);
      const { txid } = await algodClient.sendRawTransaction(signedTxns).do() as { txid: string };
      await algosdk.waitForConfirmation(algodClient, txid, 6);

      return true;
    } catch (e: unknown) {
      const err = e as Error;
      console.error('🔥 SET WINNERS ERROR:', err);
      enqueueSnackbar(`Set Winners Failed: ${err.message || String(e)}`, { variant: 'error' });
      throw e;
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  // APPROVE AND PAY — raw algosdk call
  // method: approve_and_pay(uint64)void
  // ─────────────────────────────────────────────────────────────────────
  const approveAndPay = async (bountyId: number): Promise<boolean> => {
    if (!activeAddress || !transactionSigner) {
      enqueueSnackbar('Wallet not connected', { variant: 'error' });
      return false;
    }
    try {
      const sp = await algodClient.getTransactionParams().do();
      // Extra fee for inner payout transactions (up to 3 winners)
      sp.fee = BigInt(4000);
      sp.flatFee = true;

      const selector = methodSelector('approve_and_pay(uint64)void');

      const appCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
        sender: activeAddress,
        appIndex: APP_ID,
        appArgs: [
          selector,
          algosdk.encodeUint64(bountyId),
        ],
        suggestedParams: sp,
      });

      algosdk.assignGroupID([appCallTxn]);
      const signedTxns = await transactionSigner([appCallTxn], [0]);
      const { txid } = await algodClient.sendRawTransaction(signedTxns).do() as { txid: string };
      await algosdk.waitForConfirmation(algodClient, txid, 6);

      return true;
    } catch (e: unknown) {
      const err = e as Error;
      console.error('🔥 APPROVE AND PAY ERROR:', err);
      enqueueSnackbar(`Payout Failed: ${err.message || String(e)}`, { variant: 'error' });
      throw e;
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  // AUTO REFUND — raw algosdk call
  // method: auto_refund(uint64)void
  // Anyone can call after deadline passes
  // ─────────────────────────────────────────────────────────────────────
  const autoRefund = async (bountyId: number): Promise<boolean> => {
    if (!activeAddress || !transactionSigner) {
      enqueueSnackbar('Wallet not connected', { variant: 'error' });
      return false;
    }
    try {
      const sp = await algodClient.getTransactionParams().do();
      sp.fee = BigInt(2000);
      sp.flatFee = true;

      const selector = methodSelector('auto_refund(uint64)void');

      const appCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
        sender: activeAddress,
        appIndex: APP_ID,
        appArgs: [
          selector,
          algosdk.encodeUint64(bountyId),
        ],
        suggestedParams: sp,
      });

      algosdk.assignGroupID([appCallTxn]);
      const signedTxns = await transactionSigner([appCallTxn], [0]);
      const { txid } = await algodClient.sendRawTransaction(signedTxns).do() as { txid: string };
      await algosdk.waitForConfirmation(algodClient, txid, 6);

      return true;
    } catch (e: unknown) {
      const err = e as Error;
      console.error('🔥 AUTO REFUND ERROR:', err);
      enqueueSnackbar(`Refund Failed: ${err.message || String(e)}`, { variant: 'error' });
      throw e;
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  // GET BOUNTY ON-CHAIN (read-only via appClient getter)
  // ─────────────────────────────────────────────────────────────────────
  const getBountyOnChain = async (bountyId: number) => {
    if (!activeAddress) return null;
    try {
      const result = await appClient.getBounty({
        args: { bountyId: BigInt(bountyId) },
        sender: activeAddress,
      });
      return result;
    } catch (e) {
      console.warn('🛡️ On-chain get_bounty failed:', e);
      return null;
    }
  };

  return {
    algorand,
    appClient,
    createBounty,
    applyBounty,
    submitWork,
    setWinners,
    approveAndPay,
    autoRefund,
    getBountyOnChain,
  };
}
