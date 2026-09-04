from apscheduler.schedulers.background import BackgroundScheduler
from app.services.market_data_service import market_data_service
from app.database import SessionLocal
from app.utils.market_hours import is_market_open
from app.config import settings

def poll_market_data():
    db = SessionLocal()
    try:
        market_data_service.fetch_and_store_all(db)
    finally:
        db.close()

def start_scheduler():
    scheduler = BackgroundScheduler()
    scheduler.add_job(poll_market_data, 'interval', seconds=settings.POLL_INTERVAL_SECONDS)
    scheduler.start()
    return scheduler
