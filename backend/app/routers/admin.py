from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.db import get_db
from app.models import Profile
from app.services.firebase import verify_firebase_token


router = APIRouter(
    prefix="/admin",
    tags=["Users"]
)


class ChangeRoleRequest(BaseModel):
    role: str


@router.patch("/profiles/{user_id}/role")
def change_role(
    user_id: str,
    payload: ChangeRoleRequest,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db)
):

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Unauthorized"
        )

    token = authorization.replace("Bearer ", "", 1)

    try:
        decoded_token = verify_firebase_token(token)
    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid Firebase token"
        )

    firebase_uid = decoded_token["uid"]

    # Find the logged-in user (requester)
    requester = (
        db.query(Profile)
        .filter(Profile.firebase_uid == firebase_uid)
        .first()
    )

    if not requester:
        raise HTTPException(
            status_code=403,
            detail="Profile not found"
        )

    # Only admin can change roles
    if requester.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="You are not authorized to change roles"
        )

    # Find the user selected in User Management
    user = (
        db.query(Profile)
        .filter(Profile.id == user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    # Change the selected user's role
    user.role = payload.role

    db.commit()
    db.refresh(user)

    return {
        "message": "Role updated successfully",
        "id": str(user.id),
        "role": user.role
    }


from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Profile
from app.services.firebase import verify_firebase_token


router = APIRouter(
    prefix="/admin",
    tags=["Users"]
)


@router.get("/profiles")
def get_users(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db)
):

    # Check Authorization header
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Unauthorized"
        )

    token = authorization.replace("Bearer ", "", 1)

    # Verify Firebase token
    try:
        decoded_token = verify_firebase_token(token)
    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired Firebase token"
        )

    firebase_uid = decoded_token["uid"]

    # Find requester
    requester = (
        db.query(Profile)
        .filter(Profile.firebase_uid == firebase_uid)
        .first()
    )

    if not requester:
        raise HTTPException(
            status_code=403,
            detail="Profile not found"
        )

    # Only admins can access the user list
    if requester.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="You are not authorized to view users"
        )

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