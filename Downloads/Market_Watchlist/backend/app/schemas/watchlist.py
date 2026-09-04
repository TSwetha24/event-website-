from datetime import datetime
import uuid
from pydantic import BaseModel

class WatchlistItemOut(BaseModel):
    id: uuid.UUID
    symbol: str
    name: str
    exchange: str
    added_at: datetime

    class Config:
        from_attributes = True

class AddStockRequest(BaseModel):
    symbol: str

class StockSearchResult(BaseModel):
    symbol: str
    name: str
    exchange: str

    class Config:
        from_attributes = True
