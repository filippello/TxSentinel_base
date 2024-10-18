import json
import asyncio
import logging

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, BackgroundTasks
from hexbytes import HexBytes
from eth_typing import HexStr
from eth_account import Account
from eth_account.typed_transactions.typed_transaction import TypedTransaction

from models import RPC, TxWarning, ClientMessage, TxAllow, TxWarningAccept, TxDone, AgentMessage, Warning, ClaimRewards, TxInfo, TxMessage, WalletTrack
from w3_client import w3c

logger = logging.getLogger(__name__)

rpc_router = APIRouter()
agent_websocket = APIRouter()
client_websocket = APIRouter()

PAYOUT = 1
CHAIN_ID = 31337
AGENTS_TIMEOUT = 5
CLIENT_TIMEOUT = 60
CONTRACT_ACCOUNT = "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720"
CONTRACT_PK = "0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6"

# TODO: merge warnings dict into TxInfo
warnings: dict[str, TxWarning] = {}
txs: dict[str, TxInfo] = {}
agents: dict[str, list[WebSocket]] = {}
clients: dict[str, list[WebSocket]] = {}
balances: dict[str, int] = {
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266": 100,
    "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f": 100,
}

class JSONEnc(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, HexBytes):
            return o.hex()
        # if isinstance(o, Decimal):
            # return str(o)
        return super().default(o)

def withdraw_balance(account: str, amount: int) -> str:
    if account not in balances:
        logger.error(f"ERROR WITHDRAWING BALANCE: {account} not found.")
        return ""
    if balances[account] < amount:
        logger.error(f"ERROR WITHDRAWING BALANCE: Insufficient balance for {account}.")
        return ""

    balances[account] -= amount

    try:
        transaction = {
            'from': CONTRACT_ACCOUNT,
            'to': account,
            'value': amount,
            'nonce': w3c.eth.get_transaction_count(CONTRACT_ACCOUNT),
            'gas': 200000,
            'maxFeePerGas': 2000000000,
            'maxPriorityFeePerGas': 1000000000,
            "chainId": CHAIN_ID,
        }

        signed = w3c.eth.account.sign_transaction(transaction, CONTRACT_PK)

        return w3c.eth.send_raw_transaction(signed.raw_transaction).to_0x_hex()
    except Exception as e:
        logger.error(f"ERROR WITHDRAWING BALANCE: {e}")
        return ""

async def reward_agent(from_account: str, agent_account: str) -> int:
    balances[from_account] -= PAYOUT
    if agent_account not in balances:
        balances[agent_account] = 0
    balances[agent_account] += PAYOUT
    return balances[from_account]

async def accept_warning(warning_hash: str) -> tuple[str, int]:
    tx_hash = warnings[warning_hash].tx_hash
    client_balance = await reward_agent(
        txs[tx_hash].from_account,
        warnings[warning_hash].agent_address
    )
    del warnings[warning_hash]

    return tx_hash, client_balance

async def release_tx(tx_hash: str) -> str:
    if tx_hash not in txs:
        raise

    signed_raw_tx = HexStr(txs[tx_hash].signed_raw_tx)

    # remove warnings
    for warning_hash in txs[tx_hash].warnings:
        for ws in agents[warnings[warning_hash].agent_address]:
            try:
                await ws.send_text(
                    TxDone(
                        tx_hash=tx_hash,
                        client_balance=balances[txs[tx_hash].from_account]
                    ).model_dump_json(by_alias=True)
                )
            except Exception as e:
                logger.warning(f"ERROR SENDING TX DONE TO AGENT: {e}")

        del warnings[warning_hash]

    del txs[tx_hash]

    return HexBytes(w3c.eth.send_raw_transaction(signed_raw_tx)).to_0x_hex()

async def send_warning(warning: TxWarning) -> None:
    for ws in clients[txs[warning.tx_hash].from_account]:
        await ws.send_text(warning.model_dump_json(by_alias=True))

@agent_websocket.websocket("/")
async def handle_agent(ws: WebSocket) -> None:
    await ws.accept()
    account = (await ws.receive_json())["account"]
    if not account in agents:
        agents[account] = []
    agents[account].append(ws)
    try:
        while True:
            msg = await ws.receive_text()
            try:
                am = AgentMessage.from_json_str(msg)
            except Exception as e:
                logger.warning(f"ERROR PARSING MESSAGE {msg}: {e}")
                continue
            if type(am) == Warning:
                warning_hash = w3c.keccak(
                    text=am.tx_hash + account + am.message
                ).to_0x_hex()
                warnings[warning_hash] = TxWarning(
                    agent_address=account,
                    tx_hash=am.tx_hash,
                    message=am.message,
                    warning_hash=warning_hash
                )
                txs[am.tx_hash].warnings.append(warning_hash)
                await send_warning(warnings[warning_hash])
            elif type(am) == ClaimRewards:
                withdraw_balance(account, am.amount)
            else:
                raise
    except WebSocketDisconnect:
        logger.warning("Websocket disconnected")
        agents[account].remove(ws)

@client_websocket.websocket("/")
async def handle_client(ws: WebSocket) -> None:
    await ws.accept()
    wt = ClientMessage.from_json_str(await ws.receive_text())
    assert type(wt) == WalletTrack
    account = wt.address
    if not account in clients:
        clients[account] = []
    clients[account].append(ws)
    print(clients)
    try:
        while True:
            msg = await ws.receive_text()
            try:
                cm = ClientMessage.from_json_str(msg)
            except Exception as e:
                logger.warning(f"ERROR PARSING MESSAGE {msg}: {e}")
                continue

            if type(cm) == WalletTrack:
                account = cm.address
                if not account in clients:
                    clients[account] = []
                clients[account].append(ws)

            if type(cm) == TxAllow:
                actual_hash = await release_tx(cm.tx_hash)
                assert actual_hash == cm.tx_hash
                await ws.send_text(
                    TxDone(
                        tx_hash=actual_hash,
                        client_balance=balances[txs[cm.tx_hash].from_account]
                    ).model_dump_json(by_alias=True)
                )
            elif type(cm) == TxWarningAccept:
                dropped_tx, client_balance = await accept_warning(cm.warning_hash)
                await ws.send_text(
                    TxDone(
                        tx_hash=dropped_tx,
                        client_balance=client_balance
                    ).model_dump_json(by_alias=True)
                )
            else:
                raise
    except WebSocketDisconnect:
        logger.warning("Websocket disconnected")
        clients[account].remove(ws)

async def release_tx_on_timeouts(tx_hash: str) -> None:
    await asyncio.sleep(AGENTS_TIMEOUT)
    if tx_hash not in txs:
        return

    if not txs[tx_hash].warnings:
        logger.info(f"NO WARNINGS FOR TX {tx_hash}, RELEASING.")
        await release_tx(tx_hash)
        return
    
    await asyncio.sleep(CLIENT_TIMEOUT)
    if tx_hash not in txs:
        return

    await release_tx(tx_hash)

@rpc_router.post("/")
async def rpc_handler(rpc: RPC, background_tasks: BackgroundTasks) -> dict:
    if rpc.method != "eth_sendRawTransaction":
        logger.warning(f"DELEGATING REQUEST TO PROVIDER: {rpc.method}")
        return w3c.provider.make_request(rpc.method, rpc.params)

    tx = TypedTransaction.from_bytes(
        HexBytes(rpc.params[0])
    ).as_dict()

    from_account = Account.recover_transaction(rpc.params[0])

    if balances.get(from_account, 0) < PAYOUT:
        raise HTTPException(
            status_code=403,
            detail=f"Insufficient balance for {from_account}."
        )

    # compute tx hash
    tx_hash = w3c.keccak(
        HexBytes(rpc.params[0])
    ).to_0x_hex()

    # unsign the tx
    del tx["v"]
    del tx["r"]
    del tx["s"]

    txs[tx_hash] = TxInfo(
        tx_hash=tx_hash,
        signed_raw_tx=rpc.params[0],
        from_account=from_account,
        tx=tx.copy(),
        warnings=[]
    )

    for agent in agents:
        for ws in agents[agent]:
            try:
                await ws.send_text(
                    TxMessage(
                        tx_hash=tx_hash,
                        unsigned_tx=json.loads(json.dumps(tx, cls=JSONEnc))
                    ).model_dump_json(by_alias=True)
                )
            except Exception as e:
                logger.warning(f"ERROR SENDING TX TO AGENT: {e}")

    background_tasks.add_task(release_tx_on_timeouts, tx_hash)

    return {"result": tx_hash, "id": rpc.id, "jsonrpc": "2.0"}
