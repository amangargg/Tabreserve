from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.models import User
from app.schemas import schemas
from app.core import security

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/me", response_model=schemas.UserResponse)
def get_current_user_profile(current_user: User = Depends(security.get_current_active_user)):
    return current_user

@router.put("/me", response_model=schemas.UserResponse)
def update_profile(
    name: str,
    current_user: User = Depends(security.get_current_active_user),
    db: Session = Depends(get_db)
):
    current_user.name = name
    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/me/change-password")
def change_password(
    pwd_in: schemas.ChangePassword,
    current_user: User = Depends(security.get_current_active_user),
    db: Session = Depends(get_db)
):
    if not security.verify_password(pwd_in.old_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect old password."
        )
    current_user.password_hash = security.get_password_hash(pwd_in.new_password)
    db.commit()
    return {"message": "Password changed successfully."}
