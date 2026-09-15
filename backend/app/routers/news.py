# app/routers/news.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.db import get_db, engine
from app.models import NewsArticle
from app.schemas import NewsArticleOut
from app.services.scraper import scrape_all_sources
from app.routers.auth import require_roles

router = APIRouter(prefix="/api/news", tags=["news"])


@router.post("/scrape")
def trigger_scrape(db: Session = Depends(require_roles("admin", "super_admin"))):
    """Trigger a news scrape with a global PostgreSQL lock."""

    # Dedicated connection keeps the advisory lock alive
    lock_conn = engine.connect()

    got_lock = lock_conn.execute(
        text("SELECT pg_try_advisory_lock(42)")
    ).scalar()

    if not got_lock:
        lock_conn.close()
        raise HTTPException(
            status_code=409,
            detail="A scrape is already in progress."
        )

    try:
        # Set global scraping status
        db.execute(
            text("""
                UPDATE scrape_status
                SET is_scraping = TRUE,
                    updated_at = NOW()
                WHERE id = 1
            """)
        )
        db.commit()

        # Run scraper
        scraped, skipped, errors = scrape_all_sources(db)

        db.execute(text("NOTIFY new_articles"))
        db.commit()

        return {
            "scraped": scraped,
            "skipped": skipped,
            "errors": errors,
        }

    except Exception:
        db.rollback()
        raise

    finally:
        # Always reset global status
        try:
            db.execute(
                text("""
                    UPDATE scrape_status
                    SET is_scraping = FALSE,
                        updated_at = NOW()
                    WHERE id = 1
                """)
            )
            db.commit()
        finally:
            # Release PostgreSQL advisory lock
            lock_conn.execute(
                text("SELECT pg_advisory_unlock(42)")
            )
            lock_conn.close()

@router.get("/scrape-status")
def get_scrape_status(db: Session = Depends(get_db)):
    result = db.execute(
        text("""
            SELECT is_scraping
            FROM scrape_status
            WHERE id = 1
        """)
    ).mappings().first()

    return {
        "is_scraping": result["is_scraping"] if result else False
    }

@router.get("/articles", response_model=list[NewsArticleOut])
def list_articles(
    election_only: bool = False,
    limit: int = Query(500, ge=1, le=500),
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