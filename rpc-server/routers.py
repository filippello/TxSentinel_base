import json
import asyncio
import logging

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
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
CLIENT_TIMEOUT = 20
CONTRACT_ACCOUNT = "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720"
CONTRACT_PK = "0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6"

raw_txs: dict[str, str] = {}
agents: dict[str, list[WebSocket]] = {}
clients: dict[str, list[WebSocket]] = {}
tx_warnings: dict[str, list[TxWarning]] = {}
balances: dict[str, int] = {
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266": 100,
    "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f": 100,
    "0x976EA74026E726554dB657fA54763abd0C3a0aa9": 100,
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

async def release_tx(tx_hash: str) -> str:
    if tx_hash not in raw_txs:
        raise

    signed_raw_tx = HexStr(raw_txs[tx_hash])

    # remove warnings
    for warning in tx_warnings[tx_hash]:
        for ws in agents[warning.agent_address]:
            try:
                await ws.send_text(
                    TxDone(
                        tx_hash=tx_hash,
                    ).model_dump_json(by_alias=True)
                )
            except Exception as e:
                logger.warning(f"ERROR SENDING TX DONE TO AGENT: {e}")

    del tx_warnings[tx_hash]

    return HexBytes(w3c.eth.send_raw_transaction(signed_raw_tx)).to_0x_hex()

@client_websocket.websocket("/")
async def handle_client(ws: WebSocket) -> None:
    await ws.accept()
    wt = ClientMessage.from_json_str(await ws.receive_text())
    assert type(wt) == WalletTrack

    account = wt.address
    if not account in clients:
        clients[account] = []
    clients[account].append(ws)

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

            # TODO
            # if type(cm) == TxAllow:
            #     actual_hash = await release_tx(cm.tx_hash)
            #     assert actual_hash == cm.tx_hash
            #     await ws.send_text(
            #         TxDone(
            #             tx_hash=actual_hash,
            #         ).model_dump_json(by_alias=True)
            #     )

            elif type(cm) == TxWarningAccept:
                dropped_tx, client_balance = await accept_warning(cm.warning_hash)
                await ws.send_text(
                    TxDone(
                        tx_hash=dropped_tx,
                        client_balance=client_balance
                    ).model_dump_json(by_alias=True)
                )
                # RAISE IS CANCEL TX
                raise HTTPException(
                    status_code=410,
                    detail=f"WARNING ACCEPTED: {cm.warning_hash}"
                )
            else:
                raise
    except WebSocketDisconnect:
        logger.warning("Websocket disconnected")
        clients[account].remove(ws)


@rpc_router.post("/")
async def rpc_handler(rpc: RPC) -> dict:
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

    tx_hash = w3c.keccak(
        HexBytes(rpc.params[0])
    ).to_0x_hex()

    # unsign the tx
    del tx["v"]
    del tx["r"]
    del tx["s"]

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

    # wait for agents to emit warnings
    await asyncio.sleep(AGENTS_TIMEOUT)

    # if no warnings were generated, release the tx
    if tx_hash not in tx_warnings or not tx_warnings[tx_hash]:
        logger.info(f"NO WARNINGS FOR TX {tx_hash}, RELEASING.")
        return {"result": await release_tx(tx_hash), "id": rpc.id, "jsonrpc": "2.0"}

    # wait for client to decide on warnings
    await asyncio.sleep(CLIENT_TIMEOUT)

    return {"result": await release_tx(tx_hash), "id": rpc.id, "jsonrpc": "2.0"}
