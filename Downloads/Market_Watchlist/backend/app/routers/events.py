from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.auth_service import get_current_user
from app.models.user import User
from app.schemas.event import AttentionEventOut
from app.services import event_service

router = APIRouter()

@router.get("/events", response_model=List[AttentionEventOut])
def get_events(days: int = 7, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    events = event_service.get_user_events(db, current_user.id, days)
    return [{
        "id": e.id,
        "symbol": e.stock.symbol,
        "name": e.stock.name,
        "severity": e.severity,
        "event_type": e.event_type,
        "price_at_baseline": float(e.price_at_baseline) if e.price_at_baseline is not None else None,
        "price_current": float(e.price_current) if e.price_current is not None else None,
        "stock_change_pct": float(e.stock_change_pct) if e.stock_change_pct is not None else 0.0,
        "benchmark_change_pct": float(e.benchmark_change_pct) if e.benchmark_change_pct is not None else None,
        "relative_change_pct": float(e.relative_change_pct) if e.relative_change_pct is not None else None,
        "explanation": e.explanation,
        "created_at": e.created_at,
        "acknowledged": e.acknowledged
    } for e in events]

@router.patch("/events/{event_id}/acknowledge")
def acknowledge_event(event_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    success = event_service.acknowledge_event(db, current_user.id, event_id)
    if not success:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"status": "success"}
