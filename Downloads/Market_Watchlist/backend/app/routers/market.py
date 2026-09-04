from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.utils.market_hours import market_status
from app.services.market_data_service import market_data_service

router = APIRouter()

@router.get("/status")
def get_market_status(db: Session = Depends(get_db)):
    bench = market_data_service.get_latest_benchmark(db)
    return {
        "market_status": market_status(),
        "last_updated": bench.recorded_at if bench else None
    }

@router.post("/simulate")
def simulate_market_movement(db: Session = Depends(get_db)):
    market_data_service.fetch_and_store_all(db)
    bench = market_data_service.get_latest_benchmark(db)
    return {
        "status": "Market snapshot updated",
        "benchmark_value": float(bench.value) if bench else None,
        "benchmark_change_pct": float(bench.change_pct) if bench else None
    }

@router.get("/snapshot/{symbol}")
def get_snapshot(symbol: str, db: Session = Depends(get_db)):
    snap = market_data_service.get_latest_snapshot(db, symbol.upper())
    if not snap:
        raise HTTPException(status_code=404, detail="Snapshot not found")
    return {
        "symbol": symbol,
        "price": float(snap.price),
        "change_pct": float(snap.change_pct) if snap.change_pct is not None else None,
        "recorded_at": snap.recorded_at,
        "freshness": snap.freshness
    }
