# app/routers/news.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.db import get_db
from app.models import NewsArticle
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


@router.get("/articles")
def list_articles(
    sentiment_status: str | None = Query(None, description="pending | processing | done | failed"),
    source: str | None = None,
    limit: int = Query(50, le=200),
    offset: int = 0,
    db: Session = Depends(get_db),
):
    """Paginated, filterable read for the dashboard. Kept lean deliberately
    (limit capped at 200) since this is what your phone-facing frontend hits."""
    q = db.query(NewsArticle)
    if sentiment_status:
        q = q.filter(NewsArticle.sentiment_status == sentiment_status)
    if source:
        q = q.filter(NewsArticle.source == source)

    total = q.count()
    rows = q.order_by(NewsArticle.published_date.desc()).offset(offset).limit(limit).all()

    return {
        "total": total,
        "articles": [
            {
                "id": a.id,
                "title": a.title,
                "url": a.url,
                "source": a.source,
                "province": a.province,
                "published_date": a.published_date,
                "sentiment_status": a.sentiment_status,
                "sentiment_label": a.sentiment_label,
                "sentiment_score": a.sentiment_score,
            }
            for a in rows
        ],
    }


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