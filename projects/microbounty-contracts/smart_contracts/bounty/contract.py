from typing import Literal, Final
from algopy import (
    ARC4Contract,
    arc4,
    BoxMap,
    GlobalState,
    Txn,
    Global,
    UInt64,
    Bytes,
    itxn,
    gtxn,
    op,
)
from algopy.arc4 import (
    abimethod,
    Address,
    UInt8,
    UInt64 as ARC4UInt64,
    String,
    Bool,
    StaticArray,
    Byte,
)

# ═══════════════════════════════════════════════════════════════
#  MicroBounty Smart Contract — AlgoBharat Hack Series 3.0
#  Team: CodeTitan
#  Version: 3.0 FINAL
#
#  HUMAN BOUNTY STATUS FLOW:
#  OPEN(0) → ACTIVE(1) → SUBMITTED(2) → WINNER_SET(3) → PAID(4)
#                                             ↓
#                                        DISPUTED(5) → PAID(4)
#  REFUNDED(6) — deadline passed, no submissions
#
#  AI TASK STATUS FLOW:
#  AI_PENDING(0) → AI_PAID(1) | AI_REFUNDED(2)
#
#  PLATFORM WALLET:
#  → Set to deployer wallet at contract creation via deploy().
#  → Receives 5% fee on every human bounty created.
#  → Receives 10% cut on every AI task payment released.
#  → No separate initialize() needed — deployer = platform.
# ═══════════════════════════════════════════════════════════════


# ─────────────────────────────────────────────
#  BOUNTY STATUS CONSTANTS
# ─────────────────────────────────────────────
STATUS_OPEN: Final[int] = 0
STATUS_ACTIVE: Final[int] = 1
STATUS_SUBMITTED: Final[int] = 2
STATUS_WINNER_SET: Final[int] = 3
STATUS_PAID: Final[int] = 4
STATUS_DISPUTED: Final[int] = 5
STATUS_REFUNDED: Final[int] = 6

# ─────────────────────────────────────────────
#  AI TASK STATUS CONSTANTS
# ─────────────────────────────────────────────
AI_STATUS_PENDING: Final[int] = 0
AI_STATUS_PAID: Final[int] = 1
AI_STATUS_REFUNDED: Final[int] = 2

# ─────────────────────────────────────────────
#  PLATFORM CONSTANTS
# ─────────────────────────────────────────────
PLATFORM_FEE_PCT: Final[int] = 5         # 5% on every human bounty
VALIDATOR_POOL_PCT: Final[int] = 10      # 10% of disputed share → validators
VALIDATOR_COUNT: Final[int] = 5          # exactly 5 validators per dispute
AI_PLATFORM_CUT_PCT: Final[int] = 10    # 10% of AI task payment → platform
AGENT_MIN_STAKE: Final[int] = 5_000_000  # 5 ALGO minimum stake (microALGO)


# ═══════════════════════════════════════════════════════════════
#  DATA STRUCTS
# ═══════════════════════════════════════════════════════════════

class BountyState(arc4.Struct):
    """
    Core on-chain state for every human bounty.
    reward_amount       = NET pool after 5% platform fee deducted at creation.
    disputed_winner_rank = which rank is under dispute (1/2/3). 0 = no dispute.
    """
    creator: Address
    reward_amount: ARC4UInt64
    max_applicants: UInt8
    deadline: ARC4UInt64
    applicant_count: UInt8
    winner_count: UInt8
    payment_status: UInt8
    dispute_flag: Bool
    validator_count: UInt8
    disputed_winner_rank: UInt8


class SubmissionData(arc4.Struct):
    """
    Locked on-chain at submit time.
    deploy_link_hash → SHA-256 of deploy URL, visible for preview.
    github_link      → hidden until STATUS_WINNER_SET.
    commit_hash      → locks repo state, tamper-proof after submit.
    """
    hunter: Address
    deploy_link_hash: StaticArray[Byte, Literal[32]]
    github_link: String
    commit_hash: String
    submitted_at: ARC4UInt64


class WinnerEntry(arc4.Struct):
    """Which hunter was picked for which rank slot."""
    hunter: Address
    rank: UInt8


class AIAgentState(arc4.Struct):
    """
    On-chain registration record for every AI agent.
    stake_amount   = ALGO locked by developer (min 5 ALGO).
    price_per_task = set by developer, enforced on-chain.
    """
    developer: Address
    stake_amount: ARC4UInt64
    price_per_task: ARC4UInt64
    is_active: Bool


class AITaskState(arc4.Struct):
    """
    On-chain payment lock for every AI task.
    net_to_agent = 90% of gross (10% goes to platform on release).
    """
    client: Address
    agent_id: ARC4UInt64
    payment_amount: ARC4UInt64
    net_to_agent: ARC4UInt64
    status: UInt8


# ═══════════════════════════════════════════════════════════════
#  MAIN CONTRACT
# ═══════════════════════════════════════════════════════════════

class MicroBounty(ARC4Contract):

    def __init__(self) -> None:
        # ── Human Bounty Storage ──────────────────────────────
        self.bounties = BoxMap(ARC4UInt64, BountyState, key_prefix=b"b_")
        self.submissions = BoxMap(Bytes, SubmissionData, key_prefix=b"s_")
        self.winners = BoxMap(Bytes, WinnerEntry, key_prefix=b"w_")
        self.payout_splits = BoxMap(Bytes, UInt8, key_prefix=b"p_")
        self.applicants = BoxMap(Bytes, Bool, key_prefix=b"a_")
        self.validator_votes = BoxMap(Bytes, Bool, key_prefix=b"v_")
        self.bounty_counter = GlobalState(UInt64, key=b"counter")

        # ── AI Agent Storage ──────────────────────────────────
        self.agents = BoxMap(ARC4UInt64, AIAgentState, key_prefix=b"ag_")
        self.ai_tasks = BoxMap(ARC4UInt64, AITaskState, key_prefix=b"t_")
        self.agent_counter = GlobalState(UInt64, key=b"ag_counter")
        self.task_counter = GlobalState(UInt64, key=b"t_counter")

        # ── Platform Wallet ───────────────────────────────────
        # Set once at deploy() — deployer wallet = platform wallet forever
        self.platform_wallet = GlobalState(Address, key=b"platform")
        self.platform_initialized = GlobalState(UInt64, key=b"init")


    # ═══════════════════════════════════════════════════════════
    #  DEPLOY — One-time setup at contract creation
    # ═══════════════════════════════════════════════════════════



    # ═══════════════════════════════════════════════════════════
    #  1. CREATE BOUNTY
    # ═══════════════════════════════════════════════════════════

    @abimethod
    def create_bounty(
        self,
        payment_txn: gtxn.PaymentTransaction,
        max_applicants: UInt8,
        deadline: ARC4UInt64,
        split_1: UInt8,
        split_2: UInt8,
        split_3: UInt8,
    ) -> ARC4UInt64:
        """
        Client creates a bounty and locks ALGO in escrow.

        SPLIT RULES (client sets freely — fully dynamic):
          1 winner  → split_1=100, split_2=0,  split_3=0
          2 winners → split_1=70,  split_2=30, split_3=0
          2 winners → split_1=50,  split_2=50, split_3=0
          3 winners → split_1=70,  split_2=20, split_3=10
          3 winners → split_1=50,  split_2=30, split_3=20
          Any combo works — must sum to 100.

        PLATFORM FEE:
          5% sent immediately to deployer wallet.
          NET pool (95%) stored on-chain as reward_amount.

        DEADLINE:
          If deadline passes with no submissions → auto_refund() available.
          NET pool returned to client. Platform fee non-refundable.
        """
        # Set platform wallet on first bounty creation
        if not self.platform_initialized.get(UInt64(0)):
            self.platform_wallet.value = Address(Txn.sender)
            self.platform_initialized.value = UInt64(1)

        assert payment_txn.receiver == Global.current_application_address, "Payment must go to contract"
        assert (split_1.native + split_2.native + split_3.native) == 100, "Splits must sum to 100"
        assert split_1.native > 0, "Rank 1 split is required"
        assert deadline.native > Global.latest_timestamp, "Deadline must be in the future"
        assert max_applicants.native > 0, "Need at least 1 applicant slot"

        gross = payment_txn.amount

        # ── 5% platform fee → deployer wallet immediately ─────
        platform_cut = (gross * UInt64(PLATFORM_FEE_PCT)) // 100
        net_pool = gross - platform_cut

        itxn.Payment(
            receiver=self.platform_wallet.value.native,
            amount=platform_cut,
            fee=1000,
        ).submit()

        # ── Derive winner count from splits ───────────────────
        winner_count = UInt64(1)
        if split_2.native > 0:
            winner_count = UInt64(2)
        if split_3.native > 0:
            winner_count = UInt64(3)

        # ── Assign bounty ID ──────────────────────────────────
        new_id = self.bounty_counter.get(UInt64(0)) + 1
        self.bounty_counter.value = new_id

        # ── Store bounty state ────────────────────────────────
        self.bounties[ARC4UInt64(new_id)] = BountyState(
            creator=Address(Txn.sender),
            reward_amount=ARC4UInt64(net_pool),
            max_applicants=max_applicants,
            deadline=deadline,
            applicant_count=UInt8(0),
            winner_count=UInt8(winner_count),
            payment_status=UInt8(STATUS_OPEN),
            dispute_flag=Bool(False),
            validator_count=UInt8(0),
            disputed_winner_rank=UInt8(0),
        )

        # ── Store payout splits ───────────────────────────────
        bid_bytes = op.itob(new_id)
        self.payout_splits[bid_bytes + b"\x01"] = split_1
        self.payout_splits[bid_bytes + b"\x02"] = split_2
        self.payout_splits[bid_bytes + b"\x03"] = split_3

        return ARC4UInt64(new_id)


    # ═══════════════════════════════════════════════════════════
    #  2. APPLY FOR BOUNTY
    # ═══════════════════════════════════════════════════════════

    @abimethod
    def apply_bounty(self, bounty_id: ARC4UInt64) -> None:
        """
        Hunter applies for an open bounty.
        First application moves status OPEN → ACTIVE.
        Blocked once max_applicants reached or deadline passed.
        Each hunter can only apply once per bounty.
        """
        bounty = self.bounties[bounty_id].copy()
        assert bounty.payment_status.native < UInt64(STATUS_SUBMITTED), "Applications closed"
        assert Global.latest_timestamp < bounty.deadline.native, "Deadline passed"
        assert bounty.applicant_count.native < bounty.max_applicants.native, "Bounty room is full"

        app_key = op.itob(bounty_id.native) + Txn.sender.bytes
        assert not self.applicants.maybe(app_key)[1], "Already applied to this bounty"

        self.applicants[app_key] = Bool(True)

        self.bounties[bounty_id] = BountyState(
            creator=bounty.creator,
            reward_amount=bounty.reward_amount,
            max_applicants=bounty.max_applicants,
            deadline=bounty.deadline,
            applicant_count=UInt8(bounty.applicant_count.native + 1),
            winner_count=bounty.winner_count,
            payment_status=UInt8(STATUS_ACTIVE),
            dispute_flag=bounty.dispute_flag,
            validator_count=bounty.validator_count,
            disputed_winner_rank=UInt8(0),
        )


    # ═══════════════════════════════════════════════════════════
    #  3. SUBMIT WORK
    # ═══════════════════════════════════════════════════════════

    @abimethod
    def submit_work(
        self,
        bounty_id: ARC4UInt64,
        deploy_link_hash: StaticArray[Byte, Literal[32]],
        github_link: String,
        commit_hash: String,
    ) -> None:
        """
        Hunter submits their work after building.

        deploy_link_hash → SHA-256 of deploy URL. Client previews live project.
        github_link      → actual repo URL. HIDDEN until set_winners() called.
        commit_hash      → locks repo state on-chain. Hunter cannot push after submit.

        Multiple hunters can submit. Status → SUBMITTED on first submission.
        """
        bounty = self.bounties[bounty_id].copy()
        app_key = op.itob(bounty_id.native) + Txn.sender.bytes

        assert self.applicants.maybe(app_key)[1], "Not an applicant for this bounty"
        assert bounty.payment_status.native == UInt64(STATUS_ACTIVE), "Not accepting submissions"

        self.submissions[app_key] = SubmissionData(
            hunter=Address(Txn.sender),
            deploy_link_hash=deploy_link_hash.copy(),
            github_link=github_link,
            commit_hash=commit_hash,
            submitted_at=ARC4UInt64(Global.latest_timestamp),
        )

        self.bounties[bounty_id] = BountyState(
            creator=bounty.creator,
            reward_amount=bounty.reward_amount,
            max_applicants=bounty.max_applicants,
            deadline=bounty.deadline,
            applicant_count=bounty.applicant_count,
            winner_count=bounty.winner_count,
            payment_status=UInt8(STATUS_SUBMITTED),
            dispute_flag=bounty.dispute_flag,
            validator_count=bounty.validator_count,
            disputed_winner_rank=UInt8(0),
        )


    # ═══════════════════════════════════════════════════════════
    #  4. SET WINNERS (Client picks — GitHub revealed, no payment yet)
    # ═══════════════════════════════════════════════════════════

    @abimethod
    def set_winners(
        self,
        bounty_id: ARC4UInt64,
        w1: Address,
        w2: Address,
        w3: Address,
    ) -> None:
        """
        Client reviews deploy links and picks winners.
        Does NOT release payment yet — GitHub repos revealed first.
        Status → WINNER_SET.

        After this, client has two options:
          approve_and_pay() → satisfied with GitHub repos → instant full payout
          raise_dispute()   → found fraud in a specific winner's repo
        """
        bounty = self.bounties[bounty_id].copy()
        assert bounty.creator == Address(Txn.sender), "Only bounty creator can set winners"
        assert bounty.payment_status.native == UInt64(STATUS_SUBMITTED), "No submissions yet"

        bid_bytes = op.itob(bounty_id.native)

        self.winners[bid_bytes + b"\x01"] = WinnerEntry(hunter=w1, rank=UInt8(1))
        if bounty.winner_count.native >= 2:
            self.winners[bid_bytes + b"\x02"] = WinnerEntry(hunter=w2, rank=UInt8(2))
        if bounty.winner_count.native >= 3:
            self.winners[bid_bytes + b"\x03"] = WinnerEntry(hunter=w3, rank=UInt8(3))

        self.bounties[bounty_id] = BountyState(
            creator=bounty.creator,
            reward_amount=bounty.reward_amount,
            max_applicants=bounty.max_applicants,
            deadline=bounty.deadline,
            applicant_count=bounty.applicant_count,
            winner_count=bounty.winner_count,
            payment_status=UInt8(STATUS_WINNER_SET),
            dispute_flag=Bool(False),
            validator_count=UInt8(0),
            disputed_winner_rank=UInt8(0),
        )


    # ═══════════════════════════════════════════════════════════
    #  5. APPROVE AND PAY (Client satisfied — instant payout)
    # ═══════════════════════════════════════════════════════════

    @abimethod
    def approve_and_pay(self, bounty_id: ARC4UInt64) -> None:
        """
        Client reviewed GitHub repos and is satisfied.
        Instantly releases full NET pool to all winners per their split %.

        Example — 100 ALGO sent, 3 winners, split 50/30/20:
          Platform (5%)  → 5 ALGO  (already sent at creation)
          NET pool       → 95 ALGO
          Rank 1 (50%)   → 47.5 ALGO
          Rank 2 (30%)   → 28.5 ALGO
          Rank 3 (20%)   → 19 ALGO

        Example — 100 ALGO sent, 1 winner, split 100:
          Platform (5%)  → 5 ALGO
          Rank 1 (100%)  → 95 ALGO
        """
        bounty = self.bounties[bounty_id].copy()
        assert bounty.creator == Address(Txn.sender), "Only creator can approve"
        assert bounty.payment_status.native == UInt64(STATUS_WINNER_SET), "Winners not set yet"
        assert not bounty.dispute_flag.native, "Active dispute — resolve first"

        bid_bytes = op.itob(bounty_id.native)
        pool = bounty.reward_amount.native

        # ── Pay Rank 1 (always exists) ────────────────────────
        w1 = self.winners[bid_bytes + b"\x01"].copy()
        pct1 = self.payout_splits[bid_bytes + b"\x01"].native
        itxn.Payment(
            receiver=w1.hunter.native,
            amount=(pool * pct1) // 100,
            fee=1000,
        ).submit()

        # ── Pay Rank 2 if exists ──────────────────────────────
        pct2 = self.payout_splits[bid_bytes + b"\x02"].native
        if pct2 > 0:
            w2 = self.winners[bid_bytes + b"\x02"].copy()
            itxn.Payment(
                receiver=w2.hunter.native,
                amount=(pool * pct2) // 100,
                fee=1000,
            ).submit()

        # ── Pay Rank 3 if exists ──────────────────────────────
        pct3 = self.payout_splits[bid_bytes + b"\x03"].native
        if pct3 > 0:
            w3 = self.winners[bid_bytes + b"\x03"].copy()
            itxn.Payment(
                receiver=w3.hunter.native,
                amount=(pool * pct3) // 100,
                fee=1000,
            ).submit()

        self.bounties[bounty_id] = BountyState(
            creator=bounty.creator,
            reward_amount=bounty.reward_amount,
            max_applicants=bounty.max_applicants,
            deadline=bounty.deadline,
            applicant_count=bounty.applicant_count,
            winner_count=bounty.winner_count,
            payment_status=UInt8(STATUS_PAID),
            dispute_flag=Bool(False),
            validator_count=UInt8(0),
            disputed_winner_rank=UInt8(0),
        )


    # ═══════════════════════════════════════════════════════════
    #  6. RAISE DISPUTE
    # ═══════════════════════════════════════════════════════════

    @abimethod
    def raise_dispute(
        self,
        bounty_id: ARC4UInt64,
        disputed_rank: UInt8,
    ) -> None:
        """
        Client disputes a SPECIFIC winner's submission (empty repo, fraud, etc).
        Only callable after set_winners() — status must be WINNER_SET.
        Other winners are NOT affected by this dispute.

        disputed_rank = rank slot being disputed (1, 2, or 3).

        After dispute raised:
          → Client submits written argument (Supabase off-chain)
          → Disputed hunter submits defence (Supabase off-chain)
          → 5 validators selected off-chain by platform (skill match + reputation)
          → Validators cast_vote() on-chain (blind voting)
          → Platform calls resolve_dispute() with weighted majority verdict
        """
        bounty = self.bounties[bounty_id].copy()
        assert bounty.creator == Address(Txn.sender), "Only creator can raise dispute"
        assert bounty.payment_status.native == UInt64(STATUS_WINNER_SET), "Can only dispute after winners set"
        assert not bounty.dispute_flag.native, "Dispute already active"
        assert disputed_rank.native >= 1, "Rank must be 1, 2, or 3"
        assert disputed_rank.native <= bounty.winner_count.native, "Rank exceeds winner count"

        self.bounties[bounty_id] = BountyState(
            creator=bounty.creator,
            reward_amount=bounty.reward_amount,
            max_applicants=bounty.max_applicants,
            deadline=bounty.deadline,
            applicant_count=bounty.applicant_count,
            winner_count=bounty.winner_count,
            payment_status=UInt8(STATUS_DISPUTED),
            dispute_flag=Bool(True),
            validator_count=UInt8(0),
            disputed_winner_rank=disputed_rank,
        )


    # ═══════════════════════════════════════════════════════════
    #  7. CAST VOTE
    # ═══════════════════════════════════════════════════════════

    @abimethod
    def cast_vote(
        self,
        bounty_id: ARC4UInt64,
        vote: Bool,
    ) -> None:
        """
        Called by each of the 5 selected validators.
        vote = True  → hunter innocent (valid submission)
        vote = False → fraud confirmed

        Validators selected off-chain (Supabase) by skill match + reputation.
        Weighted majority verdict calculated off-chain using reputation scores.
        Blind voting enforced by Supabase UI — validators can't see others' votes.
        On-chain: records vote + increments count. Each wallet votes once only.
        """
        bounty = self.bounties[bounty_id].copy()
        assert bounty.payment_status.native == UInt64(STATUS_DISPUTED), "No active dispute"

        vote_key = op.itob(bounty_id.native) + Txn.sender.bytes
        assert not self.validator_votes.maybe(vote_key)[1], "Already voted on this dispute"

        self.validator_votes[vote_key] = vote

        self.bounties[bounty_id] = BountyState(
            creator=bounty.creator,
            reward_amount=bounty.reward_amount,
            max_applicants=bounty.max_applicants,
            deadline=bounty.deadline,
            applicant_count=bounty.applicant_count,
            winner_count=bounty.winner_count,
            payment_status=bounty.payment_status,
            dispute_flag=bounty.dispute_flag,
            validator_count=UInt8(bounty.validator_count.native + 1),
            disputed_winner_rank=bounty.disputed_winner_rank,
        )


    # ═══════════════════════════════════════════════════════════
    #  8. RESOLVE DISPUTE
    # ═══════════════════════════════════════════════════════════

    @abimethod
    def resolve_dispute(
        self,
        bounty_id: ARC4UInt64,
        hunter_wins: Bool,
        v1: Address, v2: Address, v3: Address, v4: Address, v5: Address,
    ) -> None:
        """
        Called by platform after all 5 validators voted.
        hunter_wins = weighted majority verdict (computed off-chain with reputation weights).

        ── HUNTER INNOCENT (hunter_wins = True) ─────────────────────────────────
          All winners paid their full % from net pool.
          Validators compensated from platform's 5% fee (handled off-chain).
          Client gets nothing back.

        ── FRAUD CONFIRMED (hunter_wins = False) ────────────────────────────────

          Validators always get: 10% of fraud share split 5 ways (2% each)
          Fraud winner always gets: 0

          CASE 1 — Single winner (split [100]):
            Client  → 90% of net pool
            Validators → 10% of net pool

          CASE 2 — Two winners, Rank 1 fraud (split [A, B]):
            Rank 2 promoted → gets A% slot
            Client          → gets B% (empty last slot)
            Validators      → 10% of Rank 1's share (A% of pool)

          CASE 2 — Two winners, Rank 2 fraud (split [A, B]):
            Rank 1 untouched → gets A%
            Client           → 90% of Rank 2's share
            Validators       → 10% of Rank 2's share

          CASE 3 — Three winners, Rank 1 fraud (split [A, B, C]):
            Rank 2 promoted → gets A% slot
            Rank 3 promoted → gets B% slot
            Client          → gets C% (empty last slot)
            Validators      → 10% of Rank 1's share

          CASE 3 — Three winners, Rank 2 fraud (split [A, B, C]):
            Rank 1 untouched → gets A%
            Rank 3 promoted  → gets B% slot
            Client           → gets C% (empty last slot)
            Validators       → 10% of Rank 2's share

          CASE 3 — Three winners, Rank 3 fraud (split [A, B, C]):
            Rank 1 untouched → gets A%
            Rank 2 untouched → gets B%
            Client           → 90% of Rank 3's share
            Validators       → 10% of Rank 3's share
        """
        bounty = self.bounties[bounty_id].copy()
        assert bounty.payment_status.native == UInt64(STATUS_DISPUTED), "No active dispute"
        assert bounty.validator_count.native >= UInt64(VALIDATOR_COUNT), "Need all 5 votes first"

        bid_bytes = op.itob(bounty_id.native)
        pool = bounty.reward_amount.native
        disputed_rank = bounty.disputed_winner_rank.native
        winner_count = bounty.winner_count.native

        pct1 = self.payout_splits[bid_bytes + b"\x01"].native
        pct2 = self.payout_splits[bid_bytes + b"\x02"].native
        pct3 = self.payout_splits[bid_bytes + b"\x03"].native

        w1 = self.winners[bid_bytes + b"\x01"].copy()
        w2 = self.winners[bid_bytes + b"\x02"].copy() if winner_count >= 2 else WinnerEntry(hunter=w1.hunter, rank=UInt8(0))
        w3 = self.winners[bid_bytes + b"\x03"].copy() if winner_count >= 3 else WinnerEntry(hunter=w1.hunter, rank=UInt8(0))

        if hunter_wins.native:
            # ── HUNTER INNOCENT — pay all winners their full % ─
            itxn.Payment(
                receiver=w1.hunter.native,
                amount=(pool * pct1) // 100,
                fee=1000,
            ).submit()
            if pct2 > 0:
                itxn.Payment(
                    receiver=w2.hunter.native,
                    amount=(pool * pct2) // 100,
                    fee=1000,
                ).submit()
            if pct3 > 0:
                itxn.Payment(
                    receiver=w3.hunter.native,
                    amount=(pool * pct3) // 100,
                    fee=1000,
                ).submit()

        else:
            # ── FRAUD CONFIRMED ───────────────────────────────
            # Disputed winner's share in microALGO
            if disputed_rank == 1:
                fraud_share = (pool * pct1) // 100
            elif disputed_rank == 2:
                fraud_share = (pool * pct2) // 100
            else:
                fraud_share = (pool * pct3) // 100

            # Validator reward = 10% of fraud share, 2% each
            validator_total = (fraud_share * UInt64(VALIDATOR_POOL_PCT)) // 100
            per_validator = validator_total // UInt64(VALIDATOR_COUNT)
            client_from_fraud = fraud_share - validator_total

            # ── Pay 5 validators ──────────────────────────────
            itxn.Payment(receiver=v1.native, amount=per_validator, fee=1000).submit()
            itxn.Payment(receiver=v2.native, amount=per_validator, fee=1000).submit()
            itxn.Payment(receiver=v3.native, amount=per_validator, fee=1000).submit()
            itxn.Payment(receiver=v4.native, amount=per_validator, fee=1000).submit()
            itxn.Payment(receiver=v5.native, amount=per_validator, fee=1000).submit()

            # ── Promotion + payout per case ───────────────────
            if winner_count == 1:
                itxn.Payment(
                    receiver=bounty.creator.native,
                    amount=client_from_fraud,
                    fee=1000,
                ).submit()

            elif winner_count == 2:
                if disputed_rank == 1:
                    # Rank 2 → Rank 1 slot
                    itxn.Payment(
                        receiver=w2.hunter.native,
                        amount=(pool * pct1) // 100,
                        fee=1000,
                    ).submit()
                    # Empty last slot → client
                    itxn.Payment(
                        receiver=bounty.creator.native,
                        amount=(pool * pct2) // 100,
                        fee=1000,
                    ).submit()
                else:
                    # Rank 2 fraud, Rank 1 untouched
                    itxn.Payment(
                        receiver=w1.hunter.native,
                        amount=(pool * pct1) // 100,
                        fee=1000,
                    ).submit()
                    # Client gets 90% of Rank 2's share
                    itxn.Payment(
                        receiver=bounty.creator.native,
                        amount=client_from_fraud,
                        fee=1000,
                    ).submit()

            else:
                # winner_count == 3
                if disputed_rank == 1:
                    # Rank 2 → Rank 1, Rank 3 → Rank 2
                    itxn.Payment(
                        receiver=w2.hunter.native,
                        amount=(pool * pct1) // 100,
                        fee=1000,
                    ).submit()
                    itxn.Payment(
                        receiver=w3.hunter.native,
                        amount=(pool * pct2) // 100,
                        fee=1000,
                    ).submit()
                    # Empty last slot (pct3) → client
                    itxn.Payment(
                        receiver=bounty.creator.native,
                        amount=(pool * pct3) // 100,
                        fee=1000,
                    ).submit()

                elif disputed_rank == 2:
                    # Rank 1 untouched, Rank 3 → Rank 2
                    itxn.Payment(
                        receiver=w1.hunter.native,
                        amount=(pool * pct1) // 100,
                        fee=1000,
                    ).submit()
                    itxn.Payment(
                        receiver=w3.hunter.native,
                        amount=(pool * pct2) // 100,
                        fee=1000,
                    ).submit()
                    # Empty last slot (pct3) → client
                    itxn.Payment(
                        receiver=bounty.creator.native,
                        amount=(pool * pct3) // 100,
                        fee=1000,
                    ).submit()

                else:
                    # Rank 3 fraud, Rank 1 + 2 untouched
                    itxn.Payment(
                        receiver=w1.hunter.native,
                        amount=(pool * pct1) // 100,
                        fee=1000,
                    ).submit()
                    itxn.Payment(
                        receiver=w2.hunter.native,
                        amount=(pool * pct2) // 100,
                        fee=1000,
                    ).submit()
                    # Client gets 90% of Rank 3's share
                    itxn.Payment(
                        receiver=bounty.creator.native,
                        amount=client_from_fraud,
                        fee=1000,
                    ).submit()

        self.bounties[bounty_id] = BountyState(
            creator=bounty.creator,
            reward_amount=bounty.reward_amount,
            max_applicants=bounty.max_applicants,
            deadline=bounty.deadline,
            applicant_count=bounty.applicant_count,
            winner_count=bounty.winner_count,
            payment_status=UInt8(STATUS_PAID),
            dispute_flag=Bool(False),
            validator_count=bounty.validator_count,
            disputed_winner_rank=UInt8(0),
        )


    # ═══════════════════════════════════════════════════════════
    #  9. AUTO REFUND
    # ═══════════════════════════════════════════════════════════

    @abimethod
    def auto_refund(self, bounty_id: ARC4UInt64) -> None:
        """
        Anyone can call this once deadline passes with zero submissions.
        Returns full NET pool (95%) back to client.

        Covers both cases:
          → No hunter applied at all before deadline
          → Hunters applied but nobody submitted before deadline

        5% platform fee already sent at creation — non-refundable.
        Platform provided escrow infrastructure.
        """
        bounty = self.bounties[bounty_id].copy()
        assert Global.latest_timestamp > bounty.deadline.native, "Deadline not passed yet"
        assert bounty.payment_status.native < UInt64(STATUS_SUBMITTED), "Work already submitted"

        itxn.Payment(
            receiver=bounty.creator.native,
            amount=bounty.reward_amount.native,
            fee=1000,
        ).submit()

        self.bounties[bounty_id] = BountyState(
            creator=bounty.creator,
            reward_amount=bounty.reward_amount,
            max_applicants=bounty.max_applicants,
            deadline=bounty.deadline,
            applicant_count=bounty.applicant_count,
            winner_count=bounty.winner_count,
            payment_status=UInt8(STATUS_REFUNDED),
            dispute_flag=Bool(False),
            validator_count=UInt8(0),
            disputed_winner_rank=UInt8(0),
        )


    # ═══════════════════════════════════════════════════════════
    #  10. REGISTER AI AGENT
    # ═══════════════════════════════════════════════════════════

    @abimethod
    def register_agent(
        self,
        stake_txn: gtxn.PaymentTransaction,
        price_per_task: ARC4UInt64,
    ) -> ARC4UInt64:
        """
        AI agent developer registers their agent on-chain.
        Minimum 5 ALGO stake locked — quality signal + spam prevention.
        Full agent profile (name, description, tags, sample outputs) in Supabase.
        Returns agent_id → frontend links this with Supabase profile row.

        price_per_task: developer sets freely (minimum 1 ALGO enforced).
        Platform takes 10% of every successful task payment automatically.
        """
        assert stake_txn.receiver == Global.current_application_address, "Stake must go to contract"
        assert stake_txn.amount >= UInt64(AGENT_MIN_STAKE), "Minimum 5 ALGO stake required"
        assert price_per_task.native >= UInt64(1_000_000), "Minimum task price is 1 ALGO"

        new_agent_id = self.agent_counter.get(UInt64(0)) + 1
        self.agent_counter.value = new_agent_id

        self.agents[ARC4UInt64(new_agent_id)] = AIAgentState(
            developer=Address(Txn.sender),
            stake_amount=ARC4UInt64(stake_txn.amount),
            price_per_task=price_per_task,
            is_active=Bool(True),
        )

        return ARC4UInt64(new_agent_id)


    # ═══════════════════════════════════════════════════════════
    #  11. LOCK AI TASK PAYMENT
    # ═══════════════════════════════════════════════════════════

    @abimethod
    def lock_ai_payment(
        self,
        payment_txn: gtxn.PaymentTransaction,
        agent_id: ARC4UInt64,
    ) -> ARC4UInt64:
        """
        Client locks ALGO before AI agent executes the task.
        Held in contract until Judge AI verdict.

        Split precomputed at lock time:
          net_to_agent = 90% of gross
          platform_cut = 10% of gross

        Returns task_id for frontend tracking + Supabase linking.
        """
        # Set platform wallet on first bounty creation
        if not self.platform_initialized.get(UInt64(0)):
            self.platform_wallet.value = Address(Txn.sender)
            self.platform_initialized.value = UInt64(1)

        assert payment_txn.receiver == Global.current_application_address, "Payment must go to contract"

        agent = self.agents[agent_id].copy()
        assert agent.is_active.native, "Agent is not active"
        assert payment_txn.amount >= agent.price_per_task.native, "Insufficient payment for this agent"

        gross = payment_txn.amount
        platform_cut = (gross * UInt64(AI_PLATFORM_CUT_PCT)) // 100
        net_to_agent = gross - platform_cut

        new_task_id = self.task_counter.get(UInt64(0)) + 1
        self.task_counter.value = new_task_id

        self.ai_tasks[ARC4UInt64(new_task_id)] = AITaskState(
            client=Address(Txn.sender),
            agent_id=agent_id,
            payment_amount=ARC4UInt64(gross),
            net_to_agent=ARC4UInt64(net_to_agent),
            status=UInt8(AI_STATUS_PENDING),
        )

        return ARC4UInt64(new_task_id)


    # ═══════════════════════════════════════════════════════════
    #  12. RELEASE AI PAYMENT (Judge AI passed)
    # ═══════════════════════════════════════════════════════════

    @abimethod
    def release_ai_payment(self, task_id: ARC4UInt64) -> None:
        """
        Called by platform backend after Judge AI verifies output quality passed.
        90% released to agent developer, 10% to deployer wallet.

        After this: client can click Unsatisfied → agent reputation
        degrades in Supabase only. No on-chain reversal — payment is final.
        """
        task = self.ai_tasks[task_id].copy()
        assert task.status.native == UInt64(AI_STATUS_PENDING), "Task not in pending state"

        agent = self.agents[task.agent_id].copy()
        platform_cut = task.payment_amount.native - task.net_to_agent.native

        itxn.Payment(
            receiver=agent.developer.native,
            amount=task.net_to_agent.native,
            fee=1000,
        ).submit()

        itxn.Payment(
            receiver=self.platform_wallet.value.native,
            amount=platform_cut,
            fee=1000,
        ).submit()

        self.ai_tasks[task_id] = AITaskState(
            client=task.client,
            agent_id=task.agent_id,
            payment_amount=task.payment_amount,
            net_to_agent=task.net_to_agent,
            status=UInt8(AI_STATUS_PAID),
        )


    # ═══════════════════════════════════════════════════════════
    #  13. REFUND AI PAYMENT (Judge AI failed)
    # ═══════════════════════════════════════════════════════════

    @abimethod
    def refund_ai_payment(self, task_id: ARC4UInt64) -> None:
        """
        Called by platform backend when Judge AI determines output failed.
        Full gross amount refunded to client — agent gets nothing.
        No platform fee on failed tasks — client wasn't served.
        Agent reputation degrades in Supabase (off-chain).
        """
        task = self.ai_tasks[task_id].copy()
        assert task.status.native == UInt64(AI_STATUS_PENDING), "Task not in pending state"

        itxn.Payment(
            receiver=task.client.native,
            amount=task.payment_amount.native,
            fee=1000,
        ).submit()

        self.ai_tasks[task_id] = AITaskState(
            client=task.client,
            agent_id=task.agent_id,
            payment_amount=task.payment_amount,
            net_to_agent=task.net_to_agent,
            status=UInt8(AI_STATUS_REFUNDED),
        )


    # ═══════════════════════════════════════════════════════════
    #  14. DEACTIVATE AGENT
    # ═══════════════════════════════════════════════════════════

    @abimethod
    def deactivate_agent(self, agent_id: ARC4UInt64) -> None:
        """
        Agent developer pauses agent from receiving new tasks.
        Existing pending tasks still execute normally.
        Stake remains locked (stake return = V2 feature).
        """
        agent = self.agents[agent_id].copy()
        assert agent.developer == Address(Txn.sender), "Only agent developer can deactivate"
        assert agent.is_active.native, "Agent already inactive"

        self.agents[agent_id] = AIAgentState(
            developer=agent.developer,
            stake_amount=agent.stake_amount,
            price_per_task=agent.price_per_task,
            is_active=Bool(False),
        )


    # ═══════════════════════════════════════════════════════════
    #  READONLY GETTERS
    # ═══════════════════════════════════════════════════════════

    @abimethod(readonly=True)
    def get_bounty(self, bounty_id: ARC4UInt64) -> BountyState:
        """Full bounty state. Safe to call anytime."""
        return self.bounties[bounty_id].copy()

    @abimethod(readonly=True)
    def get_github_link(self, bounty_id: ARC4UInt64, hunter: Address) -> String:
        """
        Returns hunter's GitHub repo URL.
        Only accessible after set_winners() — STATUS_WINNER_SET or later.
        Core SHA-256 protection: code hidden until client commits to winner.
        """
        bounty = self.bounties[bounty_id].copy()
        assert bounty.payment_status.native >= UInt64(STATUS_WINNER_SET), "GitHub not revealed yet"
        sub_key = op.itob(bounty_id.native) + hunter.bytes
        return self.submissions[sub_key].github_link

    @abimethod(readonly=True)
    def get_winner(self, bounty_id: ARC4UInt64, rank: UInt8) -> WinnerEntry:
        """Returns winner wallet for a given rank slot (1, 2, or 3)."""
        bid_bytes = op.itob(bounty_id.native)
        if rank.native == 1:
            return self.winners[bid_bytes + b"\x01"].copy()
        elif rank.native == 2:
            return self.winners[bid_bytes + b"\x02"].copy()
        else:
            return self.winners[bid_bytes + b"\x03"].copy()

    @abimethod(readonly=True)
    def get_agent(self, agent_id: ARC4UInt64) -> AIAgentState:
        """Returns AI agent on-chain state."""
        return self.agents[agent_id].copy()

    @abimethod(readonly=True)
    def get_ai_task(self, task_id: ARC4UInt64) -> AITaskState:
        """Returns AI task payment state."""
        return self.ai_tasks[task_id].copy()