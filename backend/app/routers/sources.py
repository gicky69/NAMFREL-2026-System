import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import NewsSource, Profile
from app.schemas import NewsSourceCreate, NewsSourceOut
from app.routers.auth import require_admin

router = APIRouter(prefix="/api/sources", tags=["sources"])

@router.get("", response_model=list[NewsSourceOut])
def list_sources(db: Session = Depends(get_db)):
    return db.query(NewsSource).order_by(NewsSource.name).all()

@router.post("", response_model=NewsSourceOut, status_code=201)
def add_source (
    payload: NewsSourceCreate,
    db: Session = Depends(get_db),
    _admin: Profile = Depends(require_admin),
):
    source = NewsSource(name=payload.name, url=payload.url)
    db.add(source)
    db.commit()
    db.refresh(source)
    return source

@router.delete("/{source_id}", status_code=204)
def delete_source(
    source_id: uuid.UUID,
    db: Session = Depends(get_db),
    _admin: Profile = Depends(require_admin),
):
    source = db.query(NewsSource).filter(NewsSource.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    db.delete(source)
    db.commit()