from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.models import Notification, User
from app.schemas import schemas
from app.core import security

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("", response_model=List[schemas.NotificationResponse])
def get_my_notifications(
    current_user: User = Depends(security.get_current_active_user),
    db: Session = Depends(get_db)
):
    return db.query(Notification).filter(Notification.user_id == current_user.id).order_by(Notification.created_at.desc()).all()

@router.put("/{notification_id}/read")
def mark_notification_as_read(
    notification_id: int,
    current_user: User = Depends(security.get_current_active_user),
    db: Session = Depends(get_db)
):
    notification = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found.")
        
    if notification.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized.")
        
    notification.is_read = True
    db.commit()
    return {"message": "Notification marked as read."}

@router.put("/read-all")
def mark_all_notifications_as_read(
    current_user: User = Depends(security.get_current_active_user),
    db: Session = Depends(get_db)
):
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).update({Notification.is_read: True}, synchronize_session=False)
    db.commit()
    return {"message": "All notifications marked as read."}
