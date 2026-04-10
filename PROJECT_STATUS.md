# MicroBounty — Project Status & Handover Context
**Last Updated:** 2026-04-14
**Status:** Hackathon Submission Ready (Core logic verified on-chain)

## 🚀 Environment Configuration
These are the active credentials for the Testnet deployment.

| Variable | Value |
| :--- | :--- |
| **VITE_APP_ID** | `758806939` |
| **VITE_APP_ADDRESS** | `ISOM7J3NG65QEK4ZMH3ZREXDQBH4NMALY6M22HL7BXDMDSEBJNWO7DAHWY` |
| **VITE_SUPABASE_URL** | `https://sditsitcwpjsxbxnzqtf.supabase.co` |
| **VITE_SUPABASE_ANON_KEY** | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (See .env for full key) |
| **VITE_NETWORK** | `testnet` |
| **VITE_ALGO_NODE** | `https://testnet-api.algonode.cloud` |

## 🛠 Critical Technical Fixes (Don't Revert!)
We resolved several complex blockchain and sync issues. Ensure these patterns are maintained:

1. **Transaction Fees (Inner Transactions)**: 
   - The `selectWinnerAndPay` method triggers inner transactions to pay hunters. 
   - **Fix:** We added `extraFee: microAlgos(3000)` to cover these. Always use the `microAlgos()` helper from `@algorandfoundation/algokit-utils` to avoid **BigInt/Number type mismatch** errors.

2. **Blockchain "Source of Truth" Sync**:
   - We implemented a **"Self-Healing" fallback** in `BountyDetailPage.tsx`. 
   - Even if Supabase says a bounty is "Submitted", the app now verifies the status directly on the blockchain (`paymentStatus`). It maps statuses 0-6 correctly.
   - If the blockchain says `paid` but Supabase says `submitted`, the UI automatically triggers `markBountyPaid` to sync them.

3. **Supabase Realtime Errors**:
   - Fixed "cannot add callbacks after subscribe" by ensuring `removeChannel()` is called in `supabase-helpers.ts` before creating new chat subscriptions.

4. **Hunter UX**:
   - Added auto-generation of Commit Hashes in `SubmitWorkPage.tsx` using `sha256` of the Git URL to speed up submission.

## 📦 Project Structure
- `/projects/microbounty-contracts`: Algorand Python/PyTeal smart contracts.
- `/projects/microbounty-frontend`: React (Vite) frontend.
  - `/src/contracts/MicroBounty.ts`: Generated TypeScript client for the smart contract.
  - `/src/hooks/useTransaction.ts`: Centralized logic for all blockchain interactions.
  - `/src/utils/supabase-helpers.ts`: All database integration logic.

## 🎯 Next Steps / Outstanding
- **Final Build**: Run `npm run build` in the frontend directory before deployment.
- **Hunter Status**: If "Pick Winner" ever fails with `pc=772`, it means the Hunter's on-chain submission didn't complete. Verify on-chain status = 2.

---
**Handover Note:** Read this file first before making changes to `useTransaction.ts` or `BountyDetailPage.tsx`.
