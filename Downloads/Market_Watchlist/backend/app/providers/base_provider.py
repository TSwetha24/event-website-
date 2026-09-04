from abc import ABC, abstractmethod
from typing import Dict, Any, Optional

class MarketDataProvider(ABC):
    @abstractmethod
    def get_price(self, symbol: str) -> Optional[Dict[str, Any]]:
        pass

    @abstractmethod
    def get_benchmark(self, symbol: str = "NIFTY50") -> Optional[Dict[str, Any]]:
        pass
