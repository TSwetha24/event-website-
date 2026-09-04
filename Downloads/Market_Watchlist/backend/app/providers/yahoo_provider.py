import yfinance as yf
from typing import Dict, Any, Optional
from app.providers.base_provider import MarketDataProvider

class YahooProvider(MarketDataProvider):
    def get_price(self, symbol: str) -> Optional[Dict[str, Any]]:
        try:
            ticker = yf.Ticker(f"{symbol}.NS")
            info = ticker.fast_info
            price = info.last_price
            prev_close = info.previous_close
            change_pct = ((price - prev_close) / prev_close * 100) if prev_close else 0.0
            
            return {
                "symbol": symbol,
                "price": price,
                "volume": info.last_volume,
                "change_pct": change_pct,
                "source": "yahoo"
            }
        except Exception:
            return None

    def get_benchmark(self, symbol: str = "NIFTY50") -> Optional[Dict[str, Any]]:
        try:
            ticker = yf.Ticker("^NSEI")
            info = ticker.fast_info
            value = info.last_price
            prev_close = info.previous_close
            change_pct = ((value - prev_close) / prev_close * 100) if prev_close else 0.0
            
            return {
                "symbol": symbol,
                "value": value,
                "change_pct": change_pct
            }
        except Exception:
            return None
