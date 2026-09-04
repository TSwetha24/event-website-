import random
from typing import Dict, Any, Optional
from app.providers.base_provider import MarketDataProvider

class MockProvider(MarketDataProvider):
    def __init__(self):
        self.BASE_PRICES = {
            "RELIANCE": 1420.0, "TCS": 3200.0, "INFY": 1540.0,
            "HDFCBANK": 1680.0, "ZOMATO": 280.0, "WIPRO": 480.0,
            "ICICIBANK": 1120.0, "SBIN": 820.0, "BAJFINANCE": 7200.0,
            "MARUTI": 12500.0, "ADANIENT": 2800.0, "TATAMOTORS": 980.0,
            "SUNPHARMA": 1650.0, "AXISBANK": 1180.0, "LT": 3600.0,
            "KOTAKBANK": 1780.0, "BHARTIARTL": 1380.0, "ASIANPAINT": 2900.0,
            "HINDUNILVR": 2600.0, "NESTLEIND": 24000.0, "POWERGRID": 340.0,
            "NTPC": 380.0, "ONGC": 280.0, "COALINDIA": 460.0,
            "TECHM": 1620.0, "HCLTECH": 1480.0, "ULTRACEMCO": 9800.0,
            "TITAN": 3400.0, "BRITANNIA": 5600.0, "DRREDDY": 6800.0
        }
        self.BENCHMARK_BASE = 24000.0
        self.state = {k: v for k, v in self.BASE_PRICES.items()}
        self.benchmark_state = self.BENCHMARK_BASE

    def get_price(self, symbol: str) -> Optional[Dict[str, Any]]:
        if symbol not in self.state:
            return None
        
        # Apply a random walk (0.5% std dev)
        self.state[symbol] *= (1 + random.gauss(0, 0.005))
        
        change_pct = ((self.state[symbol] - self.BASE_PRICES[symbol]) / self.BASE_PRICES[symbol]) * 100
        
        return {
            "symbol": symbol,
            "price": self.state[symbol],
            "volume": random.randint(1_000_000, 30_000_000),
            "change_pct": change_pct,
            "source": "mock"
        }

    def get_benchmark(self, symbol: str = "NIFTY50") -> Optional[Dict[str, Any]]:
        # Apply a smaller random walk (0.2% std dev)
        self.benchmark_state *= (1 + random.gauss(0, 0.002))
        
        change_pct = ((self.benchmark_state - self.BENCHMARK_BASE) / self.BENCHMARK_BASE) * 100
        
        return {
            "symbol": symbol,
            "value": self.benchmark_state,
            "change_pct": change_pct
        }
