from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Profile

router = APIRouter(
    prefix="/api/users",
    tags=["Users"]
)
