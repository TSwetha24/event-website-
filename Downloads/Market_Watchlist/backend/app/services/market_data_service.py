from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.config import settings
from app.providers.mock_provider import MockProvider
from app.providers.yahoo_provider import YahooProvider
from app.models.stock import Stock
from app.models.watchlist import WatchlistItem
from app.models.snapshot import MarketSnapshot, BenchmarkSnapshot
from app.utils.freshness import classify_freshness

class MarketDataService:
    def __init__(self):
        if settings.DATA_PROVIDER == "mock":
            self.provider = MockProvider()
        else:
            self.provider = YahooProvider()

    def fetch_and_store_all(self, db: Session):
        active_stocks = db.query(Stock).join(WatchlistItem).filter(Stock.is_active == True).distinct().all()
        now = datetime.now(timezone.utc)
        
        # Fetch Benchmark
        bench_data = self.provider.get_benchmark()
        if bench_data:
            bench_snap = BenchmarkSnapshot(
                symbol=bench_data["symbol"],
                value=bench_data["value"],
                change_pct=bench_data["change_pct"],
                recorded_at=now
            )
            db.add(bench_snap)

        # Fetch Stocks
        for stock in active_stocks:
            price_data = self.provider.get_price(stock.symbol)
            if price_data:
                freshness_label, _ = classify_freshness(now)
                snap = MarketSnapshot(
                    stock_id=stock.id,
                    price=price_data["price"],
                    volume=price_data.get("volume"),
                    change_pct=price_data.get("change_pct"),
                    source=price_data.get("source"),
                    recorded_at=now,
                    freshness=freshness_label
                )
                db.add(snap)
        
        db.commit()

    def get_latest_snapshot(self, db: Session, symbol: str) -> MarketSnapshot | None:
        return db.query(MarketSnapshot).join(Stock).filter(Stock.symbol == symbol).order_by(MarketSnapshot.recorded_at.desc()).first()

    def get_latest_benchmark(self, db: Session) -> BenchmarkSnapshot | None:
        return db.query(BenchmarkSnapshot).order_by(BenchmarkSnapshot.recorded_at.desc()).first()

market_data_service = MarketDataService()
