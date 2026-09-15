from uuid import UUID
from fastapi import APIRouter, Depends, Query, HTTPException, Request
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Incident, IncidentCategory, Profile
from app.schemas import IncidentCreate, IncidentUpdate, IncidentOut, IncidentStatusUpdate, IncidentCategoryOut
from app.routers.auth import require_roles, get_current_profile
from app.services.sentiment import analyze_sentiment

router = APIRouter(prefix="/api/incidents", tags=["incidents"])

def get_client_ip(request: Request):
    forwarded_for = request.headers.get("X-Forwarded-For")

    if forwarded_for:
        return forwarded_for.split(",")[0].strip()

    return request.client.host if request.client else None

# endpoint for admin only to list all incidents with optional status filter
@router.get("", response_model=list[IncidentOut])
def list_incidents(
    status: list[str] | None = Query(default=None),
    db: Session = Depends(get_db),
    Profile = Depends(require_roles("admin", "super_admin"))
):

    if not Profile:
        raise HTTPException(
            status_code=403,
            detail="You must be logged in as an admin to view incidents"
        )
    query = db.query(Incident)

    if status:
        query = query.filter(Incident.status.in_(status))

    return query.order_by(desc(Incident.created_at)).all()

# endpoint for public to list no. of verified, unverified, severity by type
@router.get("/summary")
def incidents_summary_stats(
    db: Session = Depends(get_db),
):
    verified_incidents = (
        db.query(Incident)
        .filter(Incident.status == "verified")
        .all()
    )

    pending_incidents = (
        db.query(Incident)
        .filter(Incident.status == "reported")
        .all()
    )

    # Severity counts for verified incidents
    severity = {
        "low": 0,
        "medium": 0,
        "high": 0,
        "critical": 0,
    }

    for incident in verified_incidents:
        value = incident.severity.lower()

        if value in severity:
            severity[value] += 1

    # Incident type counts
    incident_type = {}

    for incident in verified_incidents:
        category = incident.incident_type

        if category:
            incident_type[category] = (
                incident_type.get(category, 0) + 1
            )

    # Province counts
    provinces = {}

    for incident in verified_incidents:
        province = incident.province

        if province:
            provinces[province] = (
                provinces.get(province, 0) + 1
            )

    # Pending severity counts
    pending_severity = {
        "low": 0,
        "medium": 0,
        "high": 0,
        "critical": 0,
    }

    for incident in pending_incidents:
        value = incident.severity.lower()

        if value in pending_severity:
            pending_severity[value] += 1

    return {
        "verified": {
            "total": len(verified_incidents),
            "critical": severity["critical"],
            "severity": severity,
            "incident_type": incident_type,
            "provinces": provinces,
        },
        "unverified": {
            "total": len(pending_incidents),
            "critical": pending_severity["critical"],
            "severity": pending_severity,
        },
    }


# incident category list
@router.get("/categories", response_model=list[IncidentCategoryOut])
def list_incident_categories(db: Session = Depends(get_db)):
    return db.query(IncidentCategory).order_by(IncidentCategory.created_at.desc()).all()

@router.post("", response_model=IncidentOut, status_code=201)
def create_incident(
    payload: IncidentCreate,
    request: Request,
    Profile: Profile = Depends(require_roles("admin", "personnel", "super_admin")),
    db: Session = Depends(get_db)
):

    if not Profile:
        raise HTTPException(
            status_code=403,
            detail="You must be logged in to report an incident"
        )
    
    score, label = analyze_sentiment(payload.description)

    incident = Incident(
        **payload.model_dump(),
        reporter_ip=get_client_ip(request),
        sentiment_score=score,
        sentiment_label=label
    )

    db.add(incident)
    db.commit()
    db.refresh(incident)

    return incident

@router.get("/incident-types", response_model=list[IncidentCategoryOut])
def list_incident_types(
    db: Session = Depends(get_db),
):
    return db.query(IncidentCategory).all()


@router.patch("/{id}/status", response_model=IncidentOut)
def update_incident_status(
    id: str,
    payload: IncidentStatusUpdate,
    db: Session = Depends(get_db),
    Profile = Depends(require_roles("admin", "super_admin"))
):
    if not Profile:
        raise HTTPException(
            status_code=403,
            detail="You must be logged in as an admin to update an incident"
        )
    
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

@router.patch("/{incident_id}")
def update_incident(
    incident_id: str,
    incident_data: IncidentUpdate,
    db: Session = Depends(get_db),
    Profile = Depends(require_roles("admin", "super_admin"))
):

    if not Profile:
        raise HTTPException(
            status_code=403,
            detail="You must be logged in as an admin to update an incident"
        )

    incident = (
        db.query(Incident)
        .filter(Incident.id == incident_id)
        .first()
    )

    if not incident:
        raise HTTPException(
            status_code=404,
            detail="Incident not found"
        )

    update_data = incident_data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(incident, field, value)

    db.commit()
    db.refresh(incident)

    return incident
