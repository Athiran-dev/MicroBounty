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
    Byte
)

# ─────────────────────────────────────────────
#  STATUS CONSTANTS
# ─────────────────────────────────────────────
STATUS_OPEN: Final[int] = 0
STATUS_ACTIVE: Final[int] = 1
STATUS_SUBMITTED: Final[int] = 2
STATUS_WINNER_SET: Final[int] = 3
STATUS_PAID: Final[int] = 4
STATUS_DISPUTED: Final[int] = 5
STATUS_REFUNDED: Final[int] = 6

# ─────────────────────────────────────────────
#  DATA STRUCTS
# ─────────────────────────────────────────────
class BountyState(arc4.Struct):
    creator: Address
    reward_amount: ARC4UInt64
    max_applicants: UInt8
    deadline: ARC4UInt64
    applicant_count: UInt8
    winner_count: UInt8
    payment_status: UInt8
    dispute_flag: Bool
    validator_count: UInt8

class SubmissionData(arc4.Struct):
    hunter: Address
    deploy_link_hash: StaticArray[Byte, Literal[32]]
    github_link: String
    commit_hash: String
    submitted_at: ARC4UInt64

class WinnerData(arc4.Struct):
    hunter: Address
    payout_percent: UInt8
    rank: UInt8


# ─────────────────────────────────────────────
#  MAIN CONTRACT
# ─────────────────────────────────────────────
class MicroBounty(ARC4Contract):

    def __init__(self) -> None:
        self.bounties = BoxMap(ARC4UInt64, BountyState, key_prefix=b"b_")
        self.submissions = BoxMap(Bytes, SubmissionData, key_prefix=b"s_")
        self.winners = BoxMap(Bytes, WinnerData, key_prefix=b"w_")
        self.payout_splits = BoxMap(Bytes, UInt8, key_prefix=b"p_")
        self.validator_votes = BoxMap(Bytes, Bool, key_prefix=b"v_")
        self.applicants = BoxMap(Bytes, Bool, key_prefix=b"a_")
        self.bounty_counter = GlobalState(UInt64, key=b"counter")

    # ─────────────────────────────────────────
    #  1. CREATE BOUNTY
    # ─────────────────────────────────────────
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
        assert payment_txn.receiver == Global.current_application_address, "Money must go to Escrow"
        assert (split_1.native + split_2.native + split_3.native) == 100, "Splits must sum to 100"
        assert deadline.native > Global.latest_timestamp, "Future deadline required"

        winner_count = UInt64(1)
        if split_2.native > 0:
            winner_count = UInt64(2)
        if split_3.native > 0:
            winner_count = UInt64(3)

        # Safely increment: if it doesn't exist, start from 0
        new_id = self.bounty_counter.get(UInt64(0)) + 1
        self.bounty_counter.value = new_id
        b_id = new_id
        
        self.bounties[ARC4UInt64(b_id)] = BountyState(
            creator=Address(Txn.sender),
            reward_amount=ARC4UInt64(payment_txn.amount),
            max_applicants=max_applicants,
            deadline=deadline,
            applicant_count=UInt8(0),
            winner_count=UInt8(winner_count),
            payment_status=UInt8(STATUS_OPEN),
            dispute_flag=Bool(False),
            validator_count=UInt8(0),
        )

        bid_bytes = op.itob(b_id)
        self.payout_splits[bid_bytes + b"\x01"] = split_1
        self.payout_splits[bid_bytes + b"\x02"] = split_2
        self.payout_splits[bid_bytes + b"\x03"] = split_3

        return ARC4UInt64(b_id)

    # ─────────────────────────────────────────
    #  2. APPLY FOR BOUNTY
    # ─────────────────────────────────────────
    @abimethod
    def apply_bounty(self, bounty_id: ARC4UInt64) -> None:
        bounty = self.bounties[bounty_id].copy()
        assert bounty.payment_status.native < UInt64(STATUS_SUBMITTED), "Applications closed"
        assert Global.latest_timestamp < bounty.deadline.native, "Deadline passed"
        assert bounty.applicant_count.native < bounty.max_applicants.native, "Room full"

        app_key = op.itob(bounty_id.native) + Txn.sender.bytes
        assert not self.applicants.maybe(app_key)[1], "Already applied"

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
            validator_count=bounty.validator_count
        )

    # ─────────────────────────────────────────
    #  3. SUBMIT WORK
    # ─────────────────────────────────────────
    @abimethod
    def submit_work(
        self,
        bounty_id: ARC4UInt64,
        deploy_link_hash: StaticArray[Byte, Literal[32]],
        github_link: String,
        commit_hash: String,
    ) -> None:
        bounty = self.bounties[bounty_id].copy()
        app_key = op.itob(bounty_id.native) + Txn.sender.bytes
        assert self.applicants.maybe(app_key)[1], "Not an applicant"
        assert bounty.payment_status.native == UInt64(STATUS_ACTIVE), "Not accepting submissions"

        self.submissions[app_key] = SubmissionData(
            hunter=Address(Txn.sender),
            deploy_link_hash=deploy_link_hash.copy(),
            github_link=github_link,
            commit_hash=commit_hash,
            submitted_at=ARC4UInt64(Global.latest_timestamp)
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
            validator_count=bounty.validator_count
        )

    # ─────────────────────────────────────────
    #  4. SELECT WINNER & PAY
    # ─────────────────────────────────────────
    @abimethod
    def select_winner_and_pay(
        self,
        bounty_id: ARC4UInt64,
        w1: Address, w2: Address, w3: Address,
    ) -> None:
        bounty = self.bounties[bounty_id].copy()
        assert bounty.creator == Address(Txn.sender), "Unauthorized"
        assert bounty.payment_status.native == UInt64(STATUS_SUBMITTED), "No submissions"
        assert not bounty.dispute_flag.native, "In Dispute"

        bid_bytes = op.itob(bounty_id.native)
        reward = bounty.reward_amount.native

        pct1 = self.payout_splits[bid_bytes + b"\x01"].native
        if pct1 > 0:
            itxn.Payment(receiver=w1.native, amount=(reward * pct1) // 100, fee=0).submit()
        
        pct2 = self.payout_splits[bid_bytes + b"\x02"].native
        if pct2 > 0:
            itxn.Payment(receiver=w2.native, amount=(reward * pct2) // 100, fee=0).submit()
        
        pct3 = self.payout_splits[bid_bytes + b"\x03"].native
        if pct3 > 0:
            itxn.Payment(receiver=w3.native, amount=(reward * pct3) // 100, fee=0).submit()

        self.bounties[bounty_id] = BountyState(
            creator=bounty.creator, reward_amount=bounty.reward_amount, 
            max_applicants=bounty.max_applicants, deadline=bounty.deadline,
            applicant_count=bounty.applicant_count, winner_count=bounty.winner_count,
            payment_status=UInt8(STATUS_PAID), dispute_flag=Bool(False), validator_count=UInt8(0)
        )

    # ─────────────────────────────────────────
    #  5. AUTO REFUND
    # ─────────────────────────────────────────
    @abimethod
    def auto_refund(self, bounty_id: ARC4UInt64) -> None:
        bounty = self.bounties[bounty_id].copy()
        assert Global.latest_timestamp > bounty.deadline.native, "Time not up"
        assert bounty.payment_status.native < UInt64(STATUS_SUBMITTED), "Work already submitted"

        itxn.Payment(receiver=bounty.creator.native, amount=bounty.reward_amount.native, fee=0).submit()
        
        self.bounties[bounty_id] = BountyState(
            creator=bounty.creator, reward_amount=bounty.reward_amount, 
            max_applicants=bounty.max_applicants, deadline=bounty.deadline,
            applicant_count=bounty.applicant_count, winner_count=bounty.winner_count,
            payment_status=UInt8(STATUS_REFUNDED), dispute_flag=Bool(False), validator_count=UInt8(0)
        )

    # ─────────────────────────────────────────
    #  6. RAISE DISPUTE
    # ─────────────────────────────────────────
    @abimethod
    def raise_dispute(self, bounty_id: ARC4UInt64) -> None:
        bounty = self.bounties[bounty_id].copy()
        assert bounty.creator == Address(Txn.sender), "Only creator can raise dispute"
        assert bounty.payment_status.native == UInt64(STATUS_SUBMITTED), "Can only dispute after submission"
        assert not bounty.dispute_flag.native, "Already disputed"

        self.bounties[bounty_id] = BountyState(
            creator=bounty.creator, reward_amount=bounty.reward_amount, 
            max_applicants=bounty.max_applicants, deadline=bounty.deadline,
            applicant_count=bounty.applicant_count, winner_count=bounty.winner_count,
            payment_status=UInt8(STATUS_DISPUTED), dispute_flag=Bool(True), validator_count=bounty.validator_count
        )

    # ─────────────────────────────────────────
    #  7. CAST VOTE (Validators)
    # ─────────────────────────────────────────
    @abimethod
    def cast_vote(self, bounty_id: ARC4UInt64, vote: Bool) -> None:
        bounty = self.bounties[bounty_id].copy()
        assert bounty.payment_status.native == UInt64(STATUS_DISPUTED), "Not in dispute"

        vote_key = op.itob(bounty_id.native) + Txn.sender.bytes
        assert not self.validator_votes.maybe(vote_key)[1], "Already voted"

        self.validator_votes[vote_key] = vote

        self.bounties[bounty_id] = BountyState(
            creator=bounty.creator, reward_amount=bounty.reward_amount, 
            max_applicants=bounty.max_applicants, deadline=bounty.deadline,
            applicant_count=bounty.applicant_count, winner_count=bounty.winner_count,
            payment_status=bounty.payment_status, dispute_flag=bounty.dispute_flag, 
            validator_count=UInt8(bounty.validator_count.native + 1)
        )

    # ─────────────────────────────────────────
    #  8. RESOLVE DISPUTE
    # ─────────────────────────────────────────
    @abimethod
    def resolve_dispute(
        self,
        bounty_id: ARC4UInt64,
        valid_votes: UInt8,
        w1: Address, w2: Address, w3: Address
    ) -> None:
        bounty = self.bounties[bounty_id].copy()
        assert bounty.payment_status.native == UInt64(STATUS_DISPUTED), "No active dispute"
        assert bounty.validator_count.native >= 5, "Requires 5 votes"

        reward = bounty.reward_amount.native
        bid_bytes = op.itob(bounty_id.native)

        if valid_votes.native >= 3:
            # VALID: 90% to winners (10% left in contract for validators to claim later)
            winner_pool = (reward * 90) // 100
            
            pct1 = self.payout_splits[bid_bytes + b"\x01"].native
            if pct1 > 0:
                itxn.Payment(receiver=w1.native, amount=(winner_pool * pct1) // 100, fee=0).submit()
            
            pct2 = self.payout_splits[bid_bytes + b"\x02"].native
            if pct2 > 0:
                itxn.Payment(receiver=w2.native, amount=(winner_pool * pct2) // 100, fee=0).submit()
                
            pct3 = self.payout_splits[bid_bytes + b"\x03"].native
            if pct3 > 0:
                itxn.Payment(receiver=w3.native, amount=(winner_pool * pct3) // 100, fee=0).submit()
        else:
            # FRAUD: Refund full amount to creator
            itxn.Payment(receiver=bounty.creator.native, amount=reward, fee=0).submit()

        self.bounties[bounty_id] = BountyState(
            creator=bounty.creator, reward_amount=bounty.reward_amount, 
            max_applicants=bounty.max_applicants, deadline=bounty.deadline,
            applicant_count=bounty.applicant_count, winner_count=bounty.winner_count,
            payment_status=UInt8(STATUS_PAID), dispute_flag=Bool(False), validator_count=bounty.validator_count
        )

    # ─────────────────────────────────────────
    #  9. READONLY / GETTERS
    # ─────────────────────────────────────────
    @abimethod(readonly=True)
    def get_bounty(self, bounty_id: ARC4UInt64) -> BountyState:
        return self.bounties[bounty_id].copy()

    @abimethod(readonly=True)
    def get_github_link(self, bounty_id: ARC4UInt64, hunter: Address) -> String:
        bounty = self.bounties[bounty_id].copy()
        assert bounty.payment_status.native == UInt64(STATUS_PAID), "Payment pending"
        sub_key = op.itob(bounty_id.native) + hunter.bytes
        return self.submissions[sub_key].github_link