from datetime import datetime, time
import pytz

IST = pytz.timezone("Asia/Kolkata")
MARKET_OPEN = time(9, 15)
MARKET_CLOSE = time(15, 30)

def is_market_open() -> bool:
    now_ist = datetime.now(IST)
    if now_ist.weekday() >= 5:  # Saturday=5, Sunday=6
        return False
    current_time = now_ist.time()
    return MARKET_OPEN <= current_time <= MARKET_CLOSE

def market_status() -> str:
    now_ist = datetime.now(IST)
    if now_ist.weekday() >= 5:
        return "closed"
    t = now_ist.time()
    if t < MARKET_OPEN:
        return "pre-market"
    if t > MARKET_CLOSE:
        return "closed"
    return "open"
