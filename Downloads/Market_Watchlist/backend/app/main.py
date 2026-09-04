from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app import models
from app.routers import auth, watchlist, pulse, market, events
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from scheduler.polling_job import start_scheduler
import atexit

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler = start_scheduler()
    yield
    scheduler.shutdown()

Base.metadata.create_all(bind=engine)

app = FastAPI(title="WatchPulse API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(watchlist.router, tags=["watchlist"])
app.include_router(pulse.router, tags=["pulse"])
app.include_router(market.router, prefix="/market", tags=["market"])
app.include_router(events.router, tags=["events"])

@app.get("/health")
def health():
    return {"status": "ok"}
