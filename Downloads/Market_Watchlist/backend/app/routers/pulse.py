from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.config import settings
from app.services.auth_service import get_current_user
from app.models.user import User
from app.models.event import UserBaseline
from app.models.watchlist import WatchlistItem
from app.schemas.event import PulseResponse, BenchmarkInfo
from app.utils.market_hours import market_status
from app.services.market_data_service import market_data_service
from app.services.change_engine import compute_changes
from app.services.attention_ranker import rank
from app.services.event_service import store_events

router = APIRouter()

@router.get("/pulse", response_model=PulseResponse)
def get_pulse(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    m_status = market_status()
    
    # 1. Get user's watchlist stocks
    watchlist_items = db.query(WatchlistItem).filter(WatchlistItem.user_id == current_user.id).all()
    if not watchlist_items:
        return PulseResponse(
            now=now, market_status=m_status, benchmark=BenchmarkInfo(symbol="NIFTY50"),
            meaningful_changes=[], quiet_stocks=[], data_warning="Add stocks to get started"
        )
    
    # 3. Get or create user_baseline (with lock for update)
    baseline = db.query(UserBaseline).filter(UserBaseline.user_id == current_user.id).with_for_update().first()
    
    current_snapshots = {item.stock.symbol: market_data_service.get_latest_snapshot(db, item.stock.symbol) for item in watchlist_items}
    latest_benchmark = market_data_service.get_latest_benchmark(db)
    current_bench_val = float(latest_benchmark.value) if latest_benchmark else 0.0
    bench_change_pct = float(latest_benchmark.change_pct) if latest_benchmark else 0.0

    first_visit = False
    if not baseline:
        first_visit = True
        baseline = UserBaseline(
            user_id=current_user.id,
            last_visited_at=now,
            snapshot_json={sym: float(snap.price) for sym, snap in current_snapshots.items() if snap},
            benchmark_val=current_bench_val
        )
        db.add(baseline)
        db.commit()
        db.refresh(baseline)
        
    # Prepare data for change engine
    stock_data_for_engine = []
    data_warning = None
    
    for item in watchlist_items:
        snap = current_snapshots.get(item.stock.symbol)
        if snap:
            if snap.freshness in ["delayed", "unavailable"]:
                data_warning = "Some market data may be delayed or unavailable."
            base_price = baseline.snapshot_json.get(item.stock.symbol, 0.0)
            stock_data_for_engine.append((item.stock, snap, base_price))
            
    # Compute changes
    changes = compute_changes(
        db, stock_data_for_engine, current_bench_val,
        baseline.benchmark_val or current_bench_val, settings
    )
    
    # Rank
    meaningful, quiet = rank(changes)
    
    # Output structures
    from app.schemas.event import PulseStockChange, QuietStock
    meaningful_out = [PulseStockChange(**c) for c in meaningful]
    quiet_out = [QuietStock(symbol=c["symbol"], price_current=c["price_current"], stock_change_pct=c["stock_change_pct"], freshness=c["freshness"]) for c in quiet]
    
    # Capture previous visit time BEFORE updating baseline
    previous_visited_at = baseline.last_visited_at if not first_visit else None

    # Store events and update baseline
    store_events(db, current_user.id, meaningful)

    baseline.last_visited_at = now
    baseline.snapshot_json = {sym: float(snap.price) for sym, snap in current_snapshots.items() if snap}
    baseline.benchmark_val = current_bench_val
    db.commit()

    return PulseResponse(
        since=previous_visited_at,
        now=now,
        market_status=m_status,
        benchmark=BenchmarkInfo(symbol="NIFTY50", change_pct=bench_change_pct),
        meaningful_changes=meaningful_out,
        quiet_stocks=quiet_out,
        data_warning=data_warning,
        first_visit=first_visit
    )
