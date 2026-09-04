import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, ForeignKey, DateTime, Numeric, JSON, Text, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base

class UserBaseline(Base):
    __tablename__ = "user_baselines"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    last_visited_at = Column(DateTime(timezone=True), nullable=False)
    snapshot_json = Column(JSON)
    benchmark_val = Column(Numeric(12, 2), nullable=True)

    user = relationship("User")

class AttentionEvent(Base):
    __tablename__ = "attention_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    stock_id = Column(UUID(as_uuid=True), ForeignKey("stocks.id"), nullable=False)
    event_type = Column(String(50))
    severity = Column(String(20))
    price_at_baseline = Column(Numeric(12, 2))
    price_current = Column(Numeric(12, 2))
    stock_change_pct = Column(Numeric(8, 4))
    benchmark_change_pct = Column(Numeric(8, 4))
    relative_change_pct = Column(Numeric(8, 4))
    explanation = Column(Text)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    acknowledged = Column(Boolean, default=False)

    user = relationship("User")
    stock = relationship("Stock")
