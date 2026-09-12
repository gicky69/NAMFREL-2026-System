from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Incident
from app.schemas import IncidentCreate, IncidentOut, IncidentStatusUpdate
from app.services.sentiment import analyze_sentiment

router = APIRouter(prefix="/api/incidents", tags=["incidents"])


@router.get("", response_model=list[IncidentOut])
def list_incidents(
    limit: int = Query(default=100, le=500),
    status: list[str] | None = Query(default=None),
    db: Session = Depends(get_db)
):
    query = db.query(Incident)

    if status:
        query = query.filter(Incident.status.in_(status))

    return query.order_by(desc(Incident.created_at)).limit(limit).all()


# incident category list
@router.get("/categories", response_model=list[str])
def list_incident_categories(db: Session = Depends(get_db)):
    categories = (
        db.query(IncidentCategory)
        .order_by(IncidentCategory.created_at.desc())
        .all()
    )

    return [
        {
            "name": category.name,
            "description": category.description,
            "created_at": category.created_at
        }

        for category in categories
    ]


@router.post("", response_model=IncidentOut, status_code=201)
def create_incident(
    payload: IncidentCreate,
    db: Session = Depends(get_db)
):
    score, label = analyze_sentiment(payload.description)

    incident = Incident(
        **payload.model_dump(),
        sentiment_score=score,
        sentiment_label=label
    )

    db.add(incident)
    db.commit()
    db.refresh(incident)

    return incident


@router.patch("/{id}/status", response_model=IncidentOut)
def update_incident_status(
    id: str,
    payload: IncidentStatusUpdate,
    db: Session = Depends(get_db)
):
    incident = db.query(Incident).filter(Incident.id == id).first()

    if not incident:
        raise HTTPException(
            status_code=404,
            detail="Incident not found"
        )

    incident.status = payload.status

    db.commit()
    db.refresh(incident)

    return incident