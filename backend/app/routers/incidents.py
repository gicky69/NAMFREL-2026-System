from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.db import get_db          # <- this import is the connection
from app.models import Incident
from app.schemas import IncidentCreate, IncidentOut
from app.services.sentiment import analyze_sentiment

router = APIRouter(prefix="/api/incidents", tags=["incidents"])

@router.get("", response_model=list[IncidentOut])
def list_incidents(
    limit: int = Query(default=100, le=500),
    db: Session = Depends(get_db)
):
    return (
        db.query(Incident)
        .order_by(desc(Incident.created_at))
        .limit(limit)
        .all()
    )

@router.post("", response_model=IncidentOut, status_code=201)
def create_incident(payload: IncidentCreate, db: Session = Depends(get_db)):
    score, label = analyze_sentiment(payload.description)
    incident = Incident(**payload.model_dump(), sentiment_score=score, sentiment_label=label)
    db.add(incident)
    db.commit()
    db.refresh(incident)
    return incident