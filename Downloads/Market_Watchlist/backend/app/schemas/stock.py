import uuid
from pydantic import BaseModel

class StockOut(BaseModel):
    id: uuid.UUID
    symbol: str
    name: str
    exchange: str
    is_active: bool

    class Config:
        from_attributes = True
