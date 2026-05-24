import os
import sys
from dotenv import load_dotenv
from algosdk.v2client import algod
from algosdk import account, mnemonic, transaction
from algosdk.atomic_transaction_composer import AtomicTransactionComposer, TransactionWithSigner, AccountTransactionSigner
import base64

# Load environment variables
load_dotenv(".env")
deployer_mnemonic = os.getenv("DEPLOYER_MNEMONIC")
if not deployer_mnemonic:
    print("DEPLOYER_MNEMONIC not found in .env")
    sys.exit(1)

deployer_sk = mnemonic.to_private_key(deployer_mnemonic)
deployer_address = account.address_from_private_key(deployer_sk)
signer = AccountTransactionSigner(deployer_sk)

APP_ID = 762671388

client = algod.AlgodClient("", "https://testnet-api.algonode.cloud", headers={})

def get_next_agent_id():
    app_info = client.application_info(APP_ID)
    global_state = app_info.get("params", {}).get("global-state", [])
    ag_counter_key = base64.b64encode(b"ag_counter").decode("utf-8")
    for state in global_state:
        if state["key"] == ag_counter_key:
            return state["value"]["uint"] + 1
    return 1

try:
    sp = client.suggested_params()
    
    # 5 ALGO minimum stake
    stake_amount = 5_000_000
    
    # Send stake to App Address
    app_address = transaction.logic.get_application_address(APP_ID)
    ptxn = transaction.PaymentTxn(deployer_address, sp, app_address, stake_amount)
    
    # Register agent method
    # abimethod: register_agent(pay,uint64)uint64
    price_per_task = 1_000_000 # 1 ALGO
    
    next_agent_id = get_next_agent_id()
    print(f"Registering next agent id: {next_agent_id}")
    
    # The box name is b"ag_" + next_agent_id (8 bytes uint64)
    box_name = b"ag_" + next_agent_id.to_bytes(8, "big")
    
    comp = AtomicTransactionComposer()
    
    from algosdk import abi
    selector = abi.Method.from_signature("register_agent(pay,uint64)uint64").get_selector()
    
    app_call = transaction.ApplicationCallTxn(
        sender=deployer_address,
        sp=sp,
        index=APP_ID,
        on_complete=transaction.OnComplete.NoOpOC,
        app_args=[selector, price_per_task.to_bytes(8, "big")],
        boxes=[(APP_ID, box_name)]
    )
    
    # Group them
    gid = transaction.calculate_group_id([ptxn, app_call])
    ptxn.group = gid
    app_call.group = gid
    
    # Sign
    s_ptxn = ptxn.sign(deployer_sk)
    s_app_call = app_call.sign(deployer_sk)
    
    # Send
    txid = client.send_transactions([s_ptxn, s_app_call])
    print(f"Sent! txid: {txid}")
    transaction.wait_for_confirmation(client, txid, 4)
    print("Agent registered successfully!")

except Exception as e:
    print(f"Error: {e}")
