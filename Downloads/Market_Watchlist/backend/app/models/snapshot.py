import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, ForeignKey, DateTime, Numeric, BigInteger
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base

class MarketSnapshot(Base):
    __tablename__ = "market_snapshots"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    stock_id = Column(UUID(as_uuid=True), ForeignKey("stocks.id"), nullable=False)
    price = Column(Numeric(12, 2), nullable=False)
    volume = Column(BigInteger, nullable=True)
    change_pct = Column(Numeric(8, 4), nullable=True)
    source = Column(String(50))
    recorded_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    freshness = Column(String(20))

    stock = relationship("Stock")

class BenchmarkSnapshot(Base):
    __tablename__ = "benchmark_snapshots"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    symbol = Column(String(20), nullable=False)
    value = Column(Numeric(12, 2), nullable=False)
    change_pct = Column(Numeric(8, 4), nullable=True)
    recorded_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
