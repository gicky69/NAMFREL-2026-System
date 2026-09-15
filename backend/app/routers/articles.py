import datetime
from fastapi import Query, APIRouter, Depends, HTTPException
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import NewsArticle
from app.schemas import NewsArticleOut, ArticleStatusUpdate

router = APIRouter(prefix="/api/articles", tags=["articles"])

@router.get("", response_model=list[NewsArticleOut])
def list_articles(
    status = Query(default="verified"),
    db: Session = Depends(get_db)
):
    return(
        db.query(NewsArticle)
        .order_by(desc(NewsArticle.published_date))
        .filter(NewsArticle.status == status)
        .all()
    )
    
@router.patch("/{article_id}/status", response_model=NewsArticleOut)
def update_article_status(
    article_id: str,
    payload: ArticleStatusUpdate,
    db: Session = Depends(get_db),
):
    article = db.query(NewsArticle).filter(NewsArticle.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    article.status = payload.status
    article.verified_at = datetime.datetime.now(datetime.timezone.utc)
    db.commit()
    db.refresh(article)
    return article

@router.delete("/{article_id}", status_code=204)
def delete_article(article_id: str, db: Session=Depends(get_db)):
    article = db.query(NewsArticle).filter(NewsArticle.id == article_id).first()
    if not article:
        raise HTTPException(status_code=204, detail="Article not found")
    
    db.delete(article)
    db.commit()
    return None