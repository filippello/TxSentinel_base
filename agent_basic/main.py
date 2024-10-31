import os
import json
import asyncio
import logging

import websockets
from dotenv import load_dotenv

from models import TxMessage

load_dotenv(override=True)

logging.basicConfig(level=os.environ["LOGGING_LEVEL"])

logger = logging.getLogger(__name__)

FORBIDDEN_ACCOUNTS = ["0x1111111111111111111111111111111111111111"]

AGENT_ACCOUNT = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"

TX_SENTINEL_URI = "wss://securerpc.filicodelab.xyz/agent/"

async def main():
    tx_sentinel_ws = await websockets.connect(TX_SENTINEL_URI)
    await tx_sentinel_ws.send(json.dumps({"type": "AgentSubscribe", "account": AGENT_ACCOUNT}))

    try:
        while True:
            message = await tx_sentinel_ws.recv()
            logger.info(f"RECEIVED: {message}")
            tx_msg = TxMessage(**json.loads(message))
            # if tx_msg.unsigned_tx["to"] in FORBIDDEN_ACCOUNTS:
            if True:
                logger.info(f"FORBIDDEN: {message}")
                await tx_sentinel_ws.send(
                    json.dumps(
                        {
                            "type": "Warning",
                            "tx_hash": tx_msg.tx_hash,
                            "message": "Transaction to a forbidden account",
                        }
                    )
                )

    except websockets.exceptions.ConnectionClosed:
        logger.error("Connection closed")

if __name__ == "__main__":
    asyncio.run(main())
