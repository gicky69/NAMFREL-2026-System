from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.db import get_db
from app.models import Profile, IncidentCategory
from app.services.firebase import verify_firebase_token


# 1. Define the router EXACTLY ONCE at the top
router = APIRouter(
    prefix="/admin",
    tags=["Users"]
)

class ChangeRoleRequest(BaseModel):
    role: str

class AddCategoryRequest(BaseModel):
    name: str

# patch role endpoint
@router.patch("/profiles/{user_id}/role")
def change_role(
    user_id: str,
    payload: ChangeRoleRequest,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db)
    ):
    
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")

    token = authorization.replace("Bearer ", "", 1)

    try:
        decoded_token = verify_firebase_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid Firebase token")

    firebase_uid = decoded_token["uid"]

    # Find the logged-in user (requester)
    requester = (
        db.query(Profile)
        .filter(Profile.firebase_uid == firebase_uid)
        .first()
    )

    if not requester:
        raise HTTPException(status_code=403, detail="Profile not found")

    # Only admin can change roles
    if requester.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="You are not authorized to change roles")

    # Find the user selected in User Management
    user = (
        db.query(Profile)
        .filter(Profile.id == user_id)
        .first()
    )

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Change the selected user's role
    user.role = payload.role

    db.commit()
    db.refresh(user)

    return {
        "message": "Role updated successfully",
        "id": str(user.id),
        "role": user.role
    }

# get users endpoint
@router.get("/profiles")
def get_users(

    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db)
    ):
    # Check Authorization header
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")

    token = authorization.replace("Bearer ", "", 1)

    # Verify Firebase token
    try:
        decoded_token = verify_firebase_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired Firebase token")

    firebase_uid = decoded_token["uid"]

    # Find requester
    requester = (
        db.query(Profile)
        .filter(Profile.firebase_uid == firebase_uid)
        .first()
    )

    if not requester:
        raise HTTPException(status_code=403, detail="Profile not found")

    # Only admins can access the user list
    if requester.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="You are not authorized to view users")

    # Get all users
    users = (
        db.query(Profile)
        .order_by(Profile.created_at.desc())
        .all()
    )

    return [
        {
            "id": str(user.id),
            "firebase_uid": user.firebase_uid,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "is_verified": user.is_verified,
            "created_at": user.created_at
        }
        for user in users
    ]

######  categories endpoint ######
@router.get("/categories")
def get_categories(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db)
): 
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    token = authorization.replace("Bearer ", "", 1) 

    try: 
        decoded_token = verify_firebase_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid Firebase token")
    
    # find requester
    requester = (
        db.query(Profile)
        .filter(Profile.firebase_uid == decoded_token["uid"])
        .first()
    
    )

    if requester.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="You are not authorized to obtain categories")

    # Get all categories
    categories = (
        db.query(IncidentCategory)
        .order_by(IncidentCategory.created_at.desc())
        .all()
    )

    return [
        {
            "name": category.name,
            "created_at": category.created_at
        }
        
        for category in categories
    ]


@router.post("/categories")
def add_category(
    payload: AddCategoryRequest,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db)
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    token = authorization.replace("Bearer ", "", 1) 

    try: 
        decoded_token = verify_firebase_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid Firebase token")
    
    # find requester
    requester = (
        db.query(Profile)
        .filter(Profile.firebase_uid == decoded_token["uid"])
        .first()
    
    )

    if not requester or requester.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="You are not authorized to add categories")
    
    # check if category already exists
    existing_category = (
        db.query(IncidentCategory)
        .filter(IncidentCategory.name == payload.name)
        .first()
    )

    if (existing_category):
        raise HTTPException(status_code=400, detail="Category already exists")

    # create new category
    new_category = IncidentCategory(name=payload.name)
    db.add(new_category)
    db.commit()
    db.refresh(new_category)

    return {
        "message": "Category added successfully",
        "name": new_category.name,
    }

@router.delete("/categories/{category_name}")
def delete_category(
    category_name: str,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db)
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    token = authorization.replace("Bearer ", "", 1) 

    try: 
        decoded_token = verify_firebase_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid Firebase token")
    
    # find requester
    requester = (
        db.query(Profile)
        .filter(Profile.firebase_uid == decoded_token["uid"])
        .first()
    
    )

    if not requester or requester.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="You are not authorized to add categories")
    
    category = (
        db.query(IncidentCategory)
        .filter(IncidentCategory.name == category_name)
        .first()
    )

    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    db.delete(category)
    db.commit()
    return {
        "message": "Category deleted successfully",
    }

@router.get("/reports/pending")
def get_pending_reports(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db)
):
    """Fetch all unverified incidents for admin review."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    token = authorization.replace("Bearer ", "", 1) 

    try: 
        decoded_token = verify_firebase_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid Firebase token")
    
    requester = db.query(Profile).filter(Profile.firebase_uid == decoded_token["uid"]).first()

    if not requester or requester.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Not authorized to view reports")

    # Fetch incidents currently marked as 'reported'
    reports = (
        db.query(Incident)
        .filter(Incident.status == "reported")
        .order_by(Incident.created_at.desc())
        .all()
    )

    return [
        {
            "id": str(report.id),
            "title": report.title,
            "description": report.description,
            "incident_type": report.incident_type,
            "severity": report.severity,
            "province": report.province,
            "municipality": report.municipality,
            "incident_date": str(report.incident_date) if report.incident_date else None,
            "incident_time": str(report.incident_time) if report.incident_time else None,
            "organization": report.organization,
            "contact_info": report.contact_info,
            "status": report.status,
            # NEW: Verification Context Fields
            "reported_by": report.reported_by,
            "reporter_latitude": report.reporter_latitude,
            "reporter_longitude": report.reporter_longitude,
            "reporter_location_accuracy": report.reporter_location_accuracy,
            "reporter_ip": report.reporter_ip,
            "sentiment_label": report.sentiment_label,
            "sentiment_score": report.sentiment_score
        }
        for report in reports
    ]