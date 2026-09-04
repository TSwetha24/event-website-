from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.watchlist import WatchlistItem
from app.models.stock import Stock

def get_user_watchlist(db: Session, user_id):
    items = db.query(WatchlistItem).filter(WatchlistItem.user_id == user_id).all()
    # Eager loading or simple extraction
    return [{"id": item.id, "symbol": item.stock.symbol, "name": item.stock.name, "exchange": item.stock.exchange, "added_at": item.added_at} for item in items]

def add_stock(db: Session, user_id, symbol: str):
    stock = db.query(Stock).filter(Stock.symbol == symbol.upper()).first()
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")
        
    existing = db.query(WatchlistItem).filter(WatchlistItem.user_id == user_id, WatchlistItem.stock_id == stock.id).first()
    if existing:
        raise HTTPException(status_code=409, detail="Stock already in watchlist")
        
    item = WatchlistItem(user_id=user_id, stock_id=stock.id)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

def remove_stock(db: Session, user_id, symbol: str) -> bool:
    stock = db.query(Stock).filter(Stock.symbol == symbol.upper()).first()
    if not stock:
        return False
        
    item = db.query(WatchlistItem).filter(WatchlistItem.user_id == user_id, WatchlistItem.stock_id == stock.id).first()
    if not item:
        return False
        
    db.delete(item)
    db.commit()
    return True

def search_stocks(db: Session, q: str):
    search_term = f"%{q}%"
    return db.query(Stock).filter(
        (Stock.symbol.ilike(search_term)) | (Stock.name.ilike(search_term))
    ).limit(10).all()
