import os
from dotenv import load_dotenv
from algosdk import mnemonic, account
from algosdk.v2client.algod import AlgodClient
from algosdk.transaction import ApplicationCreateTxn, StateSchema, OnComplete, wait_for_confirmation
from pathlib import Path
import base64
import subprocess

load_dotenv()

# ─────────────────────────────────────────────
#  NETWORK CONFIG
# ─────────────────────────────────────────────

NETWORK = "testnet"  # localnet | testnet | mainnet

NETWORK_CONFIG = {
    "localnet": {
        "algod_server": "http://localhost",
        "algod_port":   4001,
        "algod_token":  "a" * 64,
    },
    "testnet": {
        "algod_server": "https://testnet-api.algonode.cloud",
        "algod_port":   443,
        "algod_token":  "",
    },
    "mainnet": {
        "algod_server": "https://mainnet-api.algonode.cloud",
        "algod_port":   443,
        "algod_token":  "",
    },
}


# ─────────────────────────────────────────────
#  ALGOD CLIENT
# ─────────────────────────────────────────────

def get_algod_client() -> AlgodClient:
    cfg = NETWORK_CONFIG[NETWORK]
    address = f"{cfg['algod_server']}:{cfg['algod_port']}"
    return AlgodClient(cfg["algod_token"], address)


# ─────────────────────────────────────────────
#  DEPLOYER ACCOUNT FROM MNEMONIC
# ─────────────────────────────────────────────

def get_deployer():
    mn = os.getenv("DEPLOYER_MNEMONIC", "").strip()
    if not mn:
        raise ValueError(
            "\n❌ DEPLOYER_MNEMONIC not set in .env!\n"
            "Add this line to your .env file:\n"
            "DEPLOYER_MNEMONIC=\"word1 word2 ... word25\"\n"
        )
    private_key = mnemonic.to_private_key(mn)
    public_key  = account.address_from_private_key(private_key)
    return private_key, public_key


# ─────────────────────────────────────────────
#  COMPILE CONTRACT → TEAL (via algokit compile)
# ─────────────────────────────────────────────

def compile_contract() -> tuple[bytes, bytes]:
    contract_path = Path("smart_contracts/bounty/contract.py")

    print("⚙️  Compiling contract with AlgoKit...")
    result = subprocess.run(
        ["algokit", "compile", "py", str(contract_path)],
        capture_output=True,
        text=True,
    )

    if result.returncode != 0:
        print("❌ Compile failed!\n")
        print(result.stderr)
        raise RuntimeError("Contract compilation failed")

    print("✅ Compilation successful!\n")

    # AlgoKit outputs .approval.teal and .clear.teal in same folder
    parent = contract_path.parent

    # Find approval teal
    approval_files = list(parent.glob("*.approval.teal"))
    clear_files    = list(parent.glob("*.clear.teal"))

    if not approval_files:
        raise FileNotFoundError(f"No .approval.teal found in {parent}\nFiles: {list(parent.iterdir())}")
    if not clear_files:
        raise FileNotFoundError(f"No .clear.teal found in {parent}")

    approval_teal = approval_files[0]
    clear_teal    = clear_files[0]

    print(f"📄 Approval TEAL : {approval_teal}")
    print(f"📄 Clear TEAL    : {clear_teal}\n")

    return approval_teal.read_bytes(), clear_teal.read_bytes()


# ─────────────────────────────────────────────
#  COMPILE TEAL → BYTECODE (via algod)
# ─────────────────────────────────────────────

def compile_teal(algod: AlgodClient, teal_source: bytes) -> bytes:
    response = algod.compile(teal_source.decode("utf-8"))
    return base64.b64decode(response["result"])


# ─────────────────────────────────────────────
#  DEPLOY FUNCTION
# ─────────────────────────────────────────────

def deploy() -> None:
    print(f"\n🚀 Deploying MicroBounty to {NETWORK.upper()}...\n")

    # 1. Algod client
    algod = get_algod_client()

    # 2. Check connection
    try:
        status = algod.status()
        print(f"🔗 Connected to Algorand {NETWORK}")
        print(f"   Last round : {status['last-round']}\n")
    except Exception as e:
        raise ConnectionError(f"Cannot connect to Algorand node: {e}")

    # 3. Deployer account
    private_key, deployer_address = get_deployer()
    print(f"📬 Deployer address : {deployer_address}")

    account_info = algod.account_info(deployer_address)
    balance_algo = account_info["amount"] / 1_000_000
    print(f"💰 Deployer balance : {balance_algo} ALGO\n")

    if balance_algo < 1:
        raise ValueError(
            f"❌ Not enough ALGO! You have {balance_algo} ALGO.\n"
            f"Get testnet ALGO: https://testnet.algoexplorer.io/dispenser\n"
            f"Your address: {deployer_address}"
        )

    # 4. Compile contract
    approval_teal, clear_teal = compile_contract()

    # 5. Compile TEAL → bytecode via algod
    print("🔨 Compiling TEAL to bytecode...")
    approval_program = compile_teal(algod, approval_teal)
    clear_program    = compile_teal(algod, clear_teal)
    print("✅ Bytecode ready\n")

    # 6. State schema — BoxMap needs no global/local state except counter
    global_schema = StateSchema(num_uints=1, num_byte_slices=0)
    local_schema  = StateSchema(num_uints=0, num_byte_slices=0)

    # 7. Suggested params
    sp = algod.suggested_params()

    # 8. Create transaction
    txn = ApplicationCreateTxn(
        sender=deployer_address,
        sp=sp,
        on_complete=OnComplete.NoOpOC,
        approval_program=approval_program,
        clear_program=clear_program,
        global_schema=global_schema,
        local_schema=local_schema,
        extra_pages=3,
    )

    # 9. Sign and send
    print("📤 Sending deployment transaction...")
    signed_txn = txn.sign(private_key)
    txid = algod.send_transaction(signed_txn)
    print(f"   TxID : {txid}")

    # 10. Wait for confirmation
    print("⏳ Waiting for confirmation...")
    confirmed = wait_for_confirmation(algod, txid, wait_rounds=10)
    app_id = confirmed["application-index"]


    from algosdk.logic import get_application_address
    app_address = get_application_address(app_id)

    print(f"\n✅ Contract deployed!")
    print(f"📋 App ID      : {app_id}")
    print(f"📮 App Address : {app_address}")
    print(f"🌐 Explorer    : https://testnet.algoexplorer.io/application/{app_id}\n")

    # 11. Fund app account for MBR
    print("💸 Funding contract with 2 ALGO for MBR...")
    from algosdk.transaction import PaymentTxn

    sp2 = algod.suggested_params()
    fund_txn = PaymentTxn(
        sender=deployer_address,
        sp=sp2,
        receiver=app_address,
        amt=2_000_000,
    )
    signed_fund = fund_txn.sign(private_key)
    fund_txid = algod.send_transaction(signed_fund)
    wait_for_confirmation(algod, fund_txid, wait_rounds=10)
    print("✅ Contract funded with 2 ALGO\n")

    # 12. Save to .env
    _save_app_id(app_id)

    print("🎉 Deployment complete!")
    print(f"   VITE_APP_ID={app_id}\n")


# ─────────────────────────────────────────────
#  SAVE APP ID TO .env
# ─────────────────────────────────────────────

def _save_app_id(app_id: int) -> None:
    env_path = Path(".env")
    key = "VITE_APP_ID"
    lines = []
    found = False

    if env_path.exists():
        lines = env_path.read_text().splitlines(keepends=True)
        for i, line in enumerate(lines):
            if line.startswith(f"{key}="):
                lines[i] = f"{key}={app_id}\n"
                found = True
                break

    if not found:
        lines.append(f"{key}={app_id}\n")

    env_path.write_text("".join(lines))
    print(f"💾 Saved {key}={app_id} to .env")


# ─────────────────────────────────────────────
#  MBR ESTIMATE
# ─────────────────────────────────────────────

def calculate_mbr(num_bounties: int = 100) -> None:
    bounty_mbr     = (2500 + 400 * (10 + 200)) * num_bounties
    submission_mbr = (2500 + 400 * (40 + 500)) * num_bounties
    split_mbr      = (2500 + 400 * (9 + 1)) * 3 * num_bounties
    total_algo     = (bounty_mbr + submission_mbr + split_mbr) / 1_000_000

    print(f"\n📊 MBR Estimate for {num_bounties} bounties:")
    print(f"   BountyState boxes   : {bounty_mbr/1_000_000:.4f} ALGO")
    print(f"   SubmissionData boxes: {submission_mbr/1_000_000:.4f} ALGO")
    print(f"   PayoutSplit boxes   : {split_mbr/1_000_000:.4f} ALGO")
    print(f"   ─────────────────────────")
    print(f"   Total MBR           : {total_algo:.4f} ALGO\n")


# ─────────────────────────────────────────────
#  ENTRY POINT
# ─────────────────────────────────────────────

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "mbr":
        n = int(sys.argv[2]) if len(sys.argv) > 2 else 100
        calculate_mbr(n)
    else:
        deploy()