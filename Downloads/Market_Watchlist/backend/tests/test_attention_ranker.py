from app.services.attention_ranker import rank

def test_rank_attention_levels():
    changes = [
        {"symbol": "TCS", "severity": "NONE", "stock_change_pct": 0.2},
        {"symbol": "HDFCBANK", "severity": "MEDIUM", "stock_change_pct": 1.8},
        {"symbol": "ZOMATO", "severity": "HIGH", "stock_change_pct": -4.6},
        {"symbol": "RELIANCE", "severity": "HIGH", "stock_change_pct": 3.4},
        {"symbol": "INFY", "severity": "NONE", "stock_change_pct": -0.1},
    ]

    meaningful, quiet = rank(changes)

    assert len(meaningful) == 3
    assert len(quiet) == 2

    # HIGH severity should come first, then sorted by abs(stock_change_pct) descending
    assert meaningful[0]["symbol"] == "ZOMATO"
    assert meaningful[1]["symbol"] == "RELIANCE"
    assert meaningful[2]["symbol"] == "HDFCBANK"

    # Quiet stocks
    quiet_symbols = [q["symbol"] for q in quiet]
    assert "TCS" in quiet_symbols
    assert "INFY" in quiet_symbols
