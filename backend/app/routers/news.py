from fastapi import APIRouter, Depends
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import NewsArticle
from app.schemas import NewsArticleOut, ScrapeResult
from app.services.scraper import scrape_all_sources

router = APIRouter(prefix="/api/news", tags=["news"])

@router.get("", response_model=list[NewsArticleOut])
def list_articles(limit: int = 100, db: Session = Depends(get_db)):
    return db.query(NewsArticle).order_by(desc(NewsArticle.published_date)).limit(limit).all()

@router.post("/scrape", response_model=ScrapeResult)
def scrape_news(db: Session = Depends(get_db)):
    scraped, skipped, errors = scrape_all_sources(db)
    return ScrapeResult(scraped=scraped, skipped=skipped, errors=errors)