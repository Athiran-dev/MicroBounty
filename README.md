# 🛡️ MicroBounty — Decentralized Escrow-Backed Bounties on Algorand

> Built for **AlgoBharat 3.0 Hackathon** organized by **Algorand Foundation**  
> Track: Web3 / Blockchain Open Innovation — Powered by Algorand

---

## 👥 Team CodeTitan

| Name | Role |
|------|------|
| **Aman Savita** | Team Leader & Full Stack Developer |
| **Abhishek Sahu** | Deployment & DevOps |
| **Haina Kherkatary** | UI/UX Designer |

---

## 📌 Problem Statement

Traditional bounty platforms suffer from "trust gaps." Creators worry about quality, while hunters worry about getting paid. Centralized platforms often have slow payout cycles and high fees.

**MicroBounty** solves this by leveraging Algorand's on-chain escrows. Funds are committed upfront, and payouts are handled by atomic smart contracts — making work verification trustless, instant, and tamper-proof.

---

## 💡 What is MicroBounty?

MicroBounty is a decentralized task-market built on Algorand. It allows anybody to initiate a "Mission" (bounty) by locking ALGO rewards into a secure smart contract. Hunters can then apply, collaborate in a secure real-time **Nexus**, and submit proof of work. Once requirements are met, the escrow releases funds automatically to the winner.

---

## 🏗️ Architecture Overview

![MicroBounty Tech Stack & Flow](techStack.png)

```
┌─────────────────────────────────────────────────────────┐
│                      FRONTEND (React + Vite)            │
│   - Multi-Wallet Bridge (Pera / Defly / Lute)           │
│   - Mission Dashboard: Create / Apply / Submit          │
│   - Premium UI with Framer Motion & GSAP animations     │
└────────────────────────┬────────────────────────────────┘
           ┌─────────────┴─────────────┐
           ▼                           ▼
┌─────────────────────────┐   ┌──────────────────────────┐
│    ALGORAND TESTNET     │   │      SUPABASE CLOUD      │
│                         │   │                          │
│   MicroBounty Contract  │   │  - Real-time Bounty Nexus│
│   - On-Chain Escrow     │   │  - Bounty Metadata Store │
│   - Atomic Payouts      │   │  - Submission Indexing   │
│   - Hunter Whitelisting │   │  - Live Chat System      │
└─────────────────────────┘   └──────────────────────────┘
```

---

## ⚙️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contract | Algorand Python (AlgoPy/Puya) via AlgoKit |
| Contract Framework | ARC-56 (Generated Clients) |
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS v4 + Liquid Glassmorphism |
| Animation | Framer Motion + GSAP |
| Wallet | `@txnlab/use-wallet-react` (Pera, Defly, Lute) |
| Off-Chain / Real-time | Supabase (PostgreSQL + Realtime) |
| Blockchain SDK | `@algorandfoundation/algokit-utils` v9 |

---

## ✨ Features

### For Creators (Initiators)
- 🔒 **Escrow-on-Creation** — Funds are locked at the start. Your bounty is your bond.
- 📡 **Bounty Nexus** — Real-time chat with every applicant directly in the dashboard.
- 📐 **Mission Parameters** — Define split-payouts, deadlines, and seat limits.
- ⚡ **Atomic Release** — Released funds reach hunters instantly upon verification.

### For Hunters (Mercenaries)
- 💰 **Guaranteed Pay** — Verify on-chain that the reward is already in escrow before starting.
- 🔒 **Selective Disclosure** — Your GitHub/Private links stay hidden until the payout is released.
- 💬 **Collaborative Sync** — Use the built-in real-time chat to clarify requirements.
- 🏆 **Proof of Work** — Submit hashes and links directly to the immutable record.

---

## 📋 Smart Contract Functions

| Function | Access | Description |
|----------|--------|-------------|
| `create_bounty` | Anyone | Create a mission & lock ALGO reward in escrow |
| `apply_bounty` | Hunter | Join a campaign to start working |
| `submit_work` | Applicant | Submit hashes/links as proof of work |
| `select_winner_and_pay`| Creator | Trigger atomic payout to the winner(s) |
| `get_bounty` | Public | Verify the current state of any mission |
| `mark_paid` | Creator | Update off-chain state after successful payout |

---

## 🛡️ The Bounty Nexus (Real-Time Chat)

MicroBounty features a **Bounty Nexus** — a real-time collaboration suite powered by Supabase Realtime.

1. **Member Only**: Only the Creator and verified Applicants can access the room.
2. **Ephemeral Power**: Chat history exists to aid collaboration, not to track forever.
3. **Audit Trail**: Key milestones (application, submission) are mirrored in the chat.

---

## 🚀 Live Demo

- **Live URL:** `[Add your hosted URL here]`
- **App ID (Testnet):** `[Add your App ID here]`
- **Testnet Explorer:** `https://testnet.explorer.perawallet.app/application/[APP_ID]/`

---

## 🛠️ Installation & Setup

### Prerequisites
- Node.js >= 20
- Python >= 3.12
- AlgoKit >= 2.0
- Docker Desktop (for LocalNet)

### 1. Clone the repository
```bash
git clone https://github.com/Aman-81/microbounty.git
cd microbounty
```

### 2. Smart Contract Setup
```bash
cd projects/microbounty-contracts

# Initialize environment
algokit project bootstrap all

# Start local blockchain (optional)
algokit localnet start

# Build & Deploy
algokit project run build
algokit project deploy localnet
```

### 3. Frontend Setup
```bash
cd projects/microbounty-frontend

# Install dependencies
npm install

# Setup environment variables
cp .env.template .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# Launch the Dashboard
npm run dev
```

---

## 📁 Project Structure

```
microbounty/
├── projects/
│   ├── microbounty-contracts/       # Python Smart Contracts
│   │   ├── smart_contracts/
│   │   │   └── bounty/
│   │   │       └── contract.py      # Main Bounty logic
│   └── microbounty-frontend/        # React Dashboard
│       └── src/
│           ├── components/          # UI Components (Nexus, GlassCard)
│           ├── hooks/               # useTransaction, useAlgoPrice
│           ├── pages/               # Explore, Create, Profile
│           └── contracts/           # Generated ABI Clients
└── README.md
```

---

## 📜 License

MIT License — Built for AlgoBharat 3.0 by Team CodeTitan.
