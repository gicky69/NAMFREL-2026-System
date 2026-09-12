# app/routers/news.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.db import get_db
from app.models import NewsArticle
from app.schemas import NewsArticleOut
from app.services.scraper import scrape_all_sources

router = APIRouter(prefix="/api/news", tags=["news"])


@router.post("/scrape")
def trigger_scrape(db: Session = Depends(get_db)):
    """The button's endpoint. Uses a Postgres advisory lock so a
    double-click (or two people clicking at once) can't launch two
    overlapping scrapes against the same news sites."""
    got_lock = db.execute(
        text("SELECT pg_try_advisory_lock(42)")
    ).scalar()

    if not got_lock:
        raise HTTPException(409, "A scrape is already in progress.")

    try:
        scraped, skipped, errors = scrape_all_sources(db)
        db.execute(text("NOTIFY new_articles"))
        db.commit()
    finally:
        db.execute(text("SELECT pg_advisory_unlock(42)"))

    return {"scraped": scraped, "skipped": skipped, "errors": errors}


@router.get("/articles", response_model=list[NewsArticleOut])
def list_articles(
    limit: int = 100,
    election_only: bool = False,
    db: Session = Depends(get_db),
):
    q = db.query(NewsArticle)
    if election_only:
        q = q.filter(NewsArticle.is_election_related.is_(True))
    return q.order_by(NewsArticle.published_date.desc()).limit(limit).all()


@router.get("/sentiment-status")
def sentiment_status_summary(db: Session = Depends(get_db)):
    """Health-check endpoint -- surfaces exactly the 'PC worker might be
    down' scenario flagged earlier. Dashboard can poll this to show a
    banner if pending articles are piling up."""
    counts = dict(
        db.query(NewsArticle.sentiment_status, text("count(*)"))
        .group_by(NewsArticle.sentiment_status)
        .all()
    )

    oldest_pending = (
        db.query(NewsArticle.published_date)
        .filter(NewsArticle.sentiment_status == "pending")
        .order_by(NewsArticle.published_date.asc())
        .first()
    )

    stale = False
    if oldest_pending and oldest_pending[0]:
        stale = datetime.utcnow() - oldest_pending[0] > timedelta(hours=1)

    return {"counts": counts, "oldest_pending_stale": stale}