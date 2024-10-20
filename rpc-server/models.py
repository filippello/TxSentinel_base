import json
from datetime import datetime
from dataclasses import dataclass, field

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

@dataclass
class _Warning:
    warning_hash: str
    tx_hash: str
    agent_address: str
    message: str

@dataclass
class TxInfo:
    tx_hash: str
    signed_raw_tx: str
    from_account: str
    allowed: bool = False
    warnings: list[_Warning] = field(default_factory=list)
    accepted_warning: str = ""

class CamelCaseModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

class RPC(CamelCaseModel):
    method: str
    params: list
    id: int | str
    jsonrpc: str

class TxMessage(CamelCaseModel):
    tx_hash: str
    unsigned_tx: dict

class AgentMessage(CamelCaseModel):
    @staticmethod
    def from_json_str(msg: str):
        data = json.loads(msg)
        if data["type"] == "AgentSubscribe":
            return AgentSubscribe(**data)
        if data["type"] == "Warning":
            return AgentWarning(**data)
        if data["type"] == "Claim":
            return ClaimRewards(**data)
        raise ValueError(f"Unknown message type: {data['type']}")

class AgentSubscribe(AgentMessage):
    type: str = "AgentSubscribe"
    account: str

class AgentWarning(AgentMessage):
    type: str = "Warning"
    tx_hash: str
    message: str

class ClaimRewards(AgentMessage):
    type: str = "ClaimRewards"
    amount: int

class ServerMessage(CamelCaseModel):
    pass

class TxWarning(ServerMessage):
    type: str = "TxWarning"
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())
    tx_hash: str
    agent_address: str
    warning_hash: str
    message: str

class TxDone(ServerMessage):
    type: str = "TxDone"
    tx_hash: str

class WalletBalance(ServerMessage):
    type: str = "WalletBalance"
    amount_eth: float

class ClientMessage(CamelCaseModel):
    @staticmethod
    def from_json_str(msg: str):
        data = json.loads(msg)
        if data["type"] == "WalletTrack":
            return WalletTrack(**data)
        if data["type"] == "TxAllow":
            return TxAllow(**data)
        if data["type"] == "TxWarningAccept":
            return TxWarningAccept(**data)
        raise ValueError(f"Unknown message type: {data['type']}")

class WalletTrack(ClientMessage):
    type: str = "WalletTrack"
    address: str

class TxAllow(ClientMessage):
    type: str = "TxAllow"
    tx_hash: str

class TxWarningAccept(ClientMessage):
    type: str = "TxWarningAccept"
    warning_hash: str
