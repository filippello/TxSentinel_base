from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

class CamelCaseModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

class TxMessage(CamelCaseModel):
    type: str = "TxMessage"
    tx_hash: str
    unsigned_tx: dict

