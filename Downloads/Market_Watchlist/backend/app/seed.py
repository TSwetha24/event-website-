from app.database import SessionLocal, Base, engine
from app.models.stock import Stock

STOCKS = [
    ("RELIANCE",   "Reliance Industries Ltd",          "NSE"),
    ("TCS",        "Tata Consultancy Services Ltd",     "NSE"),
    ("INFY",       "Infosys Ltd",                       "NSE"),
    ("HDFCBANK",   "HDFC Bank Ltd",                     "NSE"),
    ("ZOMATO",     "Zomato Ltd",                        "NSE"),
    ("WIPRO",      "Wipro Ltd",                         "NSE"),
    ("ICICIBANK",  "ICICI Bank Ltd",                    "NSE"),
    ("SBIN",       "State Bank of India",               "NSE"),
    ("BAJFINANCE", "Bajaj Finance Ltd",                 "NSE"),
    ("MARUTI",     "Maruti Suzuki India Ltd",           "NSE"),
    ("ADANIENT",   "Adani Enterprises Ltd",             "NSE"),
    ("TATAMOTORS", "Tata Motors Ltd",                   "NSE"),
    ("SUNPHARMA",  "Sun Pharmaceutical Industries Ltd", "NSE"),
    ("AXISBANK",   "Axis Bank Ltd",                     "NSE"),
    ("LT",         "Larsen & Toubro Ltd",               "NSE"),
    ("KOTAKBANK",  "Kotak Mahindra Bank Ltd",           "NSE"),
    ("BHARTIARTL", "Bharti Airtel Ltd",                 "NSE"),
    ("ASIANPAINT", "Asian Paints Ltd",                  "NSE"),
    ("HINDUNILVR", "Hindustan Unilever Ltd",            "NSE"),
    ("NESTLEIND",  "Nestle India Ltd",                  "NSE"),
    ("POWERGRID",  "Power Grid Corporation of India",   "NSE"),
    ("NTPC",       "NTPC Ltd",                          "NSE"),
    ("ONGC",       "Oil & Natural Gas Corporation Ltd", "NSE"),
    ("COALINDIA",  "Coal India Ltd",                    "NSE"),
    ("TECHM",      "Tech Mahindra Ltd",                 "NSE"),
    ("HCLTECH",    "HCL Technologies Ltd",              "NSE"),
    ("ULTRACEMCO", "UltraTech Cement Ltd",              "NSE"),
    ("TITAN",      "Titan Company Ltd",                 "NSE"),
    ("BRITANNIA",  "Britannia Industries Ltd",          "NSE"),
    ("DRREDDY",    "Dr. Reddy's Laboratories Ltd",      "NSE"),
]


def seed_stocks():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        added = 0
        for symbol, name, exchange in STOCKS:
            existing = db.query(Stock).filter(Stock.symbol == symbol).first()
            if not existing:
                db.add(Stock(symbol=symbol, name=name, exchange=exchange))
                added += 1
        db.commit()
        print(f"Seeded {added} new stocks ({len(STOCKS) - added} already existed).")
    except Exception as e:
        db.rollback()
        print(f"Error seeding stocks: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_stocks()
