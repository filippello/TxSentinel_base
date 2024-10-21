import time
import json
import asyncio
import logging

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from hexbytes import HexBytes
from eth_typing import HexStr
from eth_account import Account
from eth_account.typed_transactions.typed_transaction import TypedTransaction

from models import RPC, TxWarning, ClientMessage, TxAllow, TxWarningAccept, TxDone, AgentMessage, AgentWarning, ClaimRewards, TxInfo, TxMessage, WalletTrack, _Warning, WalletBalance, AgentSubscribe
from w3_client import w3c

logger = logging.getLogger(__name__)

rpc_router = APIRouter()
agent_websocket = APIRouter()
client_websocket = APIRouter()

RELEASED_TX = 1
ACCEPTED_WARNING = 2

PAYOUT = 0.01
CHAIN_ID = 31337
AGENTS_TIMEOUT = 5
CLIENT_TIMEOUT = 20
CONTRACT_ACCOUNT = "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720"
CONTRACT_PK = "0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6"

txs: dict[str, TxInfo] = {}
agents: dict[str, list[WebSocket]] = {}
clients: dict[str, list[WebSocket]] = {}
warnings: dict[str, _Warning] = {}
balances: dict[str, float] = {
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266": PAYOUT * 1000,
    "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f": PAYOUT * 1000,
    "0x976EA74026E726554dB657fA54763abd0C3a0aa9": PAYOUT * 1000,
    "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc": PAYOUT * 1000,
}

class JSONEnc(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, HexBytes):
            return o.hex()
        return super().default(o)

@agent_websocket.websocket("/")
async def handle_agent(ws: WebSocket) -> None:
    await ws.accept()
    am = AgentMessage.from_json_str(await ws.receive_text())
    if type(am) != AgentSubscribe:
        raise HTTPException(
            status_code=400,
            detail="Subscription required."
        )
    agent_account = am.account
    if not agent_account in agents:
        agents[agent_account] = []
    agents[agent_account].append(ws)

    try:
        while True:
            msg = await ws.receive_text()
            try:
                am = AgentMessage.from_json_str(msg)
            except Exception as e:
                logger.warning(f"ERROR PARSING MESSAGE {msg}: {e}")
                continue
            if type(am) == AgentWarning:
                warning_hash = w3c.keccak(
                    text=am.tx_hash + agent_account + am.message
                ).to_0x_hex()

                # store warning
                _wrn = _Warning(
                    warning_hash=warning_hash,
                    tx_hash=am.tx_hash,
                    agent_address=agent_account,
                    message=am.message,
                )
                warnings[warning_hash] = _wrn
                txs[am.tx_hash].warnings.append(_wrn)

                # send warning to clients
                tx_wrn = TxWarning(
                    agent_address=agent_account,
                    tx_hash=am.tx_hash,
                    message=am.message,
                    warning_hash=warning_hash
                )
                for ws in clients.get(txs[am.tx_hash].from_account, []):
                    await ws.send_text(tx_wrn.model_dump_json(by_alias=True))

            elif type(am) == ClaimRewards:
                withdraw_balance(agent_account, am.amount)
            else:
                raise
    except WebSocketDisconnect:
        logger.warning("Websocket disconnected")
        agents[agent_account].remove(ws)
    except Exception as e:
        logger.error(f"ERROR HANDLING AGENT: {e}")


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
            'value': int(amount * 10**18),
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

def reward_agent(from_account: str, agent_account: str) -> float:
    balances[from_account] -= PAYOUT
    if agent_account not in balances:
        balances[agent_account] = 0
    balances[agent_account] += PAYOUT
    return balances[from_account]

async def accept_warning(tx_hash: str, warning_hash: str) -> None:
    new_balance = reward_agent(
        txs[tx_hash].from_account,
        warnings[warning_hash].agent_address
    )

    for ws in clients[txs[tx_hash].from_account]:
        await ws.send_text(
            WalletBalance(
                amount_eth=new_balance
            ).model_dump_json(by_alias=True)
        )
        await ws.send_text(
            TxDone(
                tx_hash=tx_hash,
            ).model_dump_json(by_alias=True)
        )

    del txs[tx_hash]
    del warnings[warning_hash]

async def release_tx(tx_hash: str) -> str:
    tx_info = txs[tx_hash]
    signed_raw_tx = HexStr(tx_info.signed_raw_tx)

    # inform agents tx was released
    # for warning in tx_info.warnings:
    #     for ws in agents[warning.agent_address]:
    #         try:
    #             await ws.send_text(
    #                 TxDone(
    #                     tx_hash=tx_hash,
    #                 ).model_dump_json(by_alias=True)
    #             )
    #         except Exception as e:
    #             logger.warning(f"ERROR SENDING TX DONE TO AGENT: {e}")

    # inform client tx was released
    for ws in clients[tx_info.from_account]:
        await ws.send_text(
            TxDone(
                tx_hash=tx_hash,
            ).model_dump_json(by_alias=True)
        )

    # send tx to blockchain
    actual_hash = HexBytes(w3c.eth.send_raw_transaction(signed_raw_tx)).to_0x_hex()

    txs.pop(tx_hash, None)

    return actual_hash

@client_websocket.websocket("/")
async def handle_client(ws: WebSocket) -> None:
    await ws.accept()
    wt = ClientMessage.from_json_str(await ws.receive_text())
    assert type(wt) == WalletTrack
    if not wt.address in balances:
        balances[wt.address] = PAYOUT * 1000
    await ws.send_text(
        WalletBalance(
            amount_eth=balances[wt.address]
        ).model_dump_json(by_alias=True)
    )

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

            # if type(cm) == WalletTrack:
            #     account = cm.address
            #     if not account in clients:
            #         clients[account] = []
            #     clients[account].append(ws)

            if type(cm) == TxAllow:
                txs[cm.tx_hash].allowed = True

            elif type(cm) == TxWarningAccept:
                txs[warnings[cm.warning_hash].tx_hash].accepted_warning = cm.warning_hash

            else:
                raise
    except WebSocketDisconnect:
        logger.warning("Websocket disconnected")
        clients[account].remove(ws)
    except Exception as e:
        logger.error(f"ERROR HANDLING CLIENT: {e}")


async def process_tx(tx_hash: str, broadcast_time: float) -> tuple[int, str]:
    tx_info = txs[tx_hash]

    while True:
        if tx_info.allowed:
            logger.info(f"TX {tx_hash} ALLOWED, RELEASING.")
            return (RELEASED_TX, await release_tx(tx_hash))

        elapsed = time.time() - broadcast_time

        if (warning_hash := tx_info.accepted_warning):
            logger.info(f"WARNING {warning_hash} ACCEPTED FOR TX {tx_hash}, CANCELING.")
            await accept_warning(tx_hash, warning_hash)
            return (ACCEPTED_WARNING, warning_hash)

        if not tx_info.warnings:
            if elapsed > AGENTS_TIMEOUT:
                logger.info(f"NO WARNINGS FOR TX {tx_hash}, RELEASING.")
                return (RELEASED_TX, await release_tx(tx_hash))

        if elapsed > CLIENT_TIMEOUT:
            logger.info(f"CLIENT TIMEOUT FOR TX {tx_hash}, RELEASING.")
            return (RELEASED_TX, await release_tx(tx_hash))

        await asyncio.sleep(0.1)

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

    txs[tx_hash] = TxInfo(
        tx_hash=tx_hash,
        signed_raw_tx=rpc.params[0],
        from_account=from_account,
    )

    try:
        t, s = await process_tx(tx_hash, broadcast_time=time.time())
    except Exception as e:
        logger.error(f"ERROR PROCESSING TX: {e}")
        raise HTTPException(
            status_code=500,
            detail="Error processing transaction."
        )

    if t == RELEASED_TX:
        return {"result": s, "id": rpc.id, "jsonrpc": "2.0"}
    elif t == ACCEPTED_WARNING:
        raise HTTPException(
            status_code=410,
            detail=f"WARNING ACCEPTED: {s}"
        )
    raise
