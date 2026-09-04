from datetime import datetime
import uuid
from pydantic import BaseModel
from typing import Optional, List

class PulseStockChange(BaseModel):
    symbol: str
    name: str
    severity: str
    event_type: str
    price_baseline: float
    price_current: float
    stock_change_pct: float
    benchmark_change_pct: float
    relative_change_pct: float
    explanation: str
    freshness: str
    data_age_seconds: int

class QuietStock(BaseModel):
    symbol: str
    price_current: float
    stock_change_pct: float
    freshness: str

class BenchmarkInfo(BaseModel):
    symbol: str
    change_pct: Optional[float] = None

class PulseResponse(BaseModel):
    since: Optional[datetime] = None
    now: datetime
    market_status: str
    benchmark: BenchmarkInfo
    meaningful_changes: List[PulseStockChange]
    quiet_stocks: List[QuietStock]
    data_warning: Optional[str] = None
    first_visit: bool = False

class AttentionEventOut(BaseModel):
    id: uuid.UUID
    symbol: str
    name: Optional[str] = None
    severity: str
    event_type: str
    price_at_baseline: Optional[float] = None
    price_current: Optional[float] = None
    stock_change_pct: float
    benchmark_change_pct: Optional[float] = None
    relative_change_pct: Optional[float] = None
    explanation: str
    created_at: datetime
    acknowledged: bool

    class Config:
        from_attributes = True
