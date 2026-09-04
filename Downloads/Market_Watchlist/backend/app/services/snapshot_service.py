from datetime import datetime
from sqlalchemy.orm import Session
from app.models.snapshot import MarketSnapshot, BenchmarkSnapshot

def get_snapshot_at_or_before(db: Session, stock_id, dt: datetime) -> MarketSnapshot | None:
    return db.query(MarketSnapshot).filter(
        MarketSnapshot.stock_id == stock_id,
        MarketSnapshot.recorded_at <= dt
    ).order_by(MarketSnapshot.recorded_at.desc()).first()

def get_benchmark_at_or_before(db: Session, dt: datetime) -> BenchmarkSnapshot | None:
    return db.query(BenchmarkSnapshot).filter(
        BenchmarkSnapshot.recorded_at <= dt
    ).order_by(BenchmarkSnapshot.recorded_at.desc()).first()
