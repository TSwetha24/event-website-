from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.models.event import AttentionEvent
from app.models.stock import Stock

def store_events(db: Session, user_id, meaningful_changes: list[dict]):
    for change in meaningful_changes:
        event = AttentionEvent(
            user_id=user_id,
            stock_id=change["stock_id"],
            event_type=change["event_type"],
            severity=change["severity"],
            price_at_baseline=change["price_baseline"],
            price_current=change["price_current"],
            stock_change_pct=change["stock_change_pct"],
            benchmark_change_pct=change["benchmark_change_pct"],
            relative_change_pct=change["relative_change_pct"],
            explanation=change["explanation"]
        )
        db.add(event)
    db.commit()

def get_user_events(db: Session, user_id, days=7) -> list:
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    return db.query(AttentionEvent).join(Stock).filter(
        AttentionEvent.user_id == user_id,
        AttentionEvent.created_at >= cutoff
    ).order_by(AttentionEvent.created_at.desc()).all()

def acknowledge_event(db: Session, user_id, event_id):
    event = db.query(AttentionEvent).filter(
        AttentionEvent.id == event_id,
        AttentionEvent.user_id == user_id
    ).first()
    if event:
        event.acknowledged = True
        db.commit()
        return True
    return False
