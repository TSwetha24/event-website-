from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.auth_service import get_current_user
from app.models.user import User
from app.schemas.watchlist import WatchlistItemOut, AddStockRequest, StockSearchResult
from app.services import watchlist_service

router = APIRouter()

@router.get("/watchlist", response_model=List[WatchlistItemOut])
def get_watchlist(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return watchlist_service.get_user_watchlist(db, current_user.id)

@router.post("/watchlist/stocks", response_model=WatchlistItemOut)
def add_watchlist_stock(req: AddStockRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = watchlist_service.add_stock(db, current_user.id, req.symbol)
    return {"id": item.id, "symbol": item.stock.symbol, "name": item.stock.name, "exchange": item.stock.exchange, "added_at": item.added_at}

@router.delete("/watchlist/stocks/{symbol}", status_code=204)
def remove_watchlist_stock(symbol: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    success = watchlist_service.remove_stock(db, current_user.id, symbol)
    if not success:
        raise HTTPException(status_code=404, detail="Stock not found in watchlist")

@router.get("/stocks/search", response_model=List[StockSearchResult])
def search_stocks(q: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return watchlist_service.search_stocks(db, q)
