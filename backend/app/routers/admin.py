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
    description: str | None = None

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
    if requester.role != "admin":
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
    if requester.role != "admin":
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

    if not requester or requester.role != "admin":
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

    if not requester or requester.role != "admin":
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
    new_category = IncidentCategory(name=payload.name, description=payload.description)
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

    if not requester or requester.role != "admin":
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