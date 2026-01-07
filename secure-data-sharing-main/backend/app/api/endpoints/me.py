# app/api/endpoints/me.py

from fastapi import APIRouter, Depends
from app.dependencies import get_current_user # ✅ Use the centralized dependency

router = APIRouter()

@router.get("/me")
def read_users_me(current_user = Depends(get_current_user)):
    """
    Get profile information for the currently logged-in user.
    """
    return {
        "id": current_user.id,
        "username": current_user.username
    }