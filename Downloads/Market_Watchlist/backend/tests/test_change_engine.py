import pytest
from unittest.mock import MagicMock
from datetime import datetime, timezone
from app.services.change_engine import compute_changes
from app.config import Settings

@pytest.fixture
def dummy_settings():
    return Settings(
        DATABASE_URL="sqlite:///:memory:",
        SECRET_KEY="test",
        PRICE_MOVE_HIGH_THRESHOLD=3.0,
        PRICE_MOVE_MEDIUM_THRESHOLD=1.5,
        RELATIVE_MOVE_HIGH_THRESHOLD=2.0,
        RELATIVE_MOVE_MEDIUM_THRESHOLD=1.0,
    )

def test_compute_changes_outperform(dummy_settings):
    stock = MagicMock()
    stock.id = "s1"
    stock.symbol = "RELIANCE"
    stock.name = "Reliance Industries Ltd"

    snapshot = MagicMock()
    snapshot.price = 1468.0  # +3.38%
    snapshot.recorded_at = datetime.now(timezone.utc)

    baseline_price = 1420.0
    current_benchmark = 24120.0  # +0.50%
    baseline_benchmark = 24000.0

    watchlist_stocks = [(stock, snapshot, baseline_price)]

    results = compute_changes(
        db=None,
        user_watchlist_stocks=watchlist_stocks,
        current_benchmark_val=current_benchmark,
        baseline_benchmark_val=baseline_benchmark,
        settings=dummy_settings
    )

    assert len(results) == 1
    res = results[0]
    assert res["symbol"] == "RELIANCE"
    assert res["severity"] == "HIGH"
    assert res["event_type"] == "outperform"
    assert round(res["relative_change_pct"], 2) == 2.88

def test_compute_changes_quiet_stock(dummy_settings):
    stock = MagicMock()
    stock.id = "s2"
    stock.symbol = "TCS"
    stock.name = "Tata Consultancy Services Ltd"

    snapshot = MagicMock()
    snapshot.price = 3210.0  # +0.31%
    snapshot.recorded_at = datetime.now(timezone.utc)

    baseline_price = 3200.0
    current_benchmark = 24050.0  # +0.21%
    baseline_benchmark = 24000.0

    watchlist_stocks = [(stock, snapshot, baseline_price)]

    results = compute_changes(
        db=None,
        user_watchlist_stocks=watchlist_stocks,
        current_benchmark_val=current_benchmark,
        baseline_benchmark_val=baseline_benchmark,
        settings=dummy_settings
    )

    assert len(results) == 1
    res = results[0]
    assert res["symbol"] == "TCS"
    assert res["severity"] == "NONE"
