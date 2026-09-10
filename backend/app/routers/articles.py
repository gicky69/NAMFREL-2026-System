from fastapi import Query, APIRouter, Depends
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import NewsArticle
from app.schemas import NewsArticleOut

router = APIRouter(prefix="/api/articles", tags=["articles"])

@router.get("", response_model=list[NewsArticleOut])
def list_articles(
    limit: int = Query(default=100, le=500),
    db: Session = Depends(get_db)
):
    return(
        db.query(NewsArticle)
        .order_by(desc(NewsArticle.published_date))
        .limit(limit)
        .all()
    )
    