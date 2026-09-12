from fastapi import APIRouter, Header, HTTPException, Depends
from sqlalchemy.orm import Session

from app.services.firebase import verify_firebase_token
from app.db import get_db # get_db function from db.py
from app.models import Profile # Profile class from models.py

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


@router.post("/login")
async def login(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db)    
):

    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Authorization header is missing"
        )

    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Invalid authorization format"
        )

    token = authorization.replace("Bearer ", "", 1)

    # verification of firebase token
    try:
        decoded_token = verify_firebase_token(token)
    except Exception as e:
        print("Firebase verification error:", e)

        raise HTTPException(
            status_code=401,
            detail="Invalid or expired Firebase token"
        )

    # verified firebase information
    firebase_uid = decoded_token["uid"]
    email = decoded_token.get("email")
    name = decoded_token.get("name")

    profile = (
        db.query(Profile)
        .filter(Profile.firebase_uid == firebase_uid)
        .first()
    )

    # create a new profile if it doesn't exist
    if not profile:
        profile = Profile(
            firebase_uid=firebase_uid,
            email=email,
            full_name=name
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)

        print("New profile created:", email)
    else:
        print("Existing profile found:", email)

    return {
        "message": "Login successful",
        "firebase_uid": firebase_uid,
        "email": profile.email,
        "full_name": profile.full_name,
        "role": profile.role,
        "is_verified": profile.is_verified
    }
    

def get_current_profile(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> Profile:
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header is missing")
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization format")
    
    token = authorization.replace("Bearer ", "", 1)
    try:
        decoded_token = verify_firebase_token(token)
    except Exception as e:
        print("Firebase verification error:", e)
        raise HTTPException(status_code=401, detail="Invalid or Expired Firebase Token")

    profile = (
        db.query(Profile)
        .filter(Profile.firebase_uid == decoded_token["uid"])
        .first()
    )
    if not profile:
        raise HTTPException(status_code=401, detail="No profile found for this account")
    return profile

def require_roles(*allowed_roles: str):
    def checker(profile: Profile = Depends(get_current_profile)) -> Profile:
        if profile.role not in allowed_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return profile
    return checker

def require_admin(profile: Profile = Depends(get_current_profile)) -> Profile:
    if profile.role != "admin" and profile.role != "super_admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return profile
