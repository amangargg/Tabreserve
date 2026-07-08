from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.models import Waitlist, Restaurant, User
from app.schemas import schemas
from app.core import security
from app.services.booking_service import parse_time

router = APIRouter(prefix="/waitlist", tags=["Waitlist"])

@router.post("", response_model=schemas.WaitlistResponse)
def join_waitlist(
    waitlist_in: schemas.WaitlistCreate,
    current_user: User = Depends(security.get_current_active_user),
    db: Session = Depends(get_db)
):
    restaurant = db.query(Restaurant).filter(Restaurant.id == waitlist_in.restaurant_id).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found.")
        
    try:
        w_time = parse_time(waitlist_in.time)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    # Create waitlist entry
    waitlist_entry = Waitlist(
        user_id=current_user.id,
        restaurant_id=waitlist_in.restaurant_id,
        date=waitlist_in.date,
        time=w_time,
        guests=waitlist_in.guests,
        status="waiting"
    )
    db.add(waitlist_entry)
    db.commit()
    db.refresh(waitlist_entry)
    
    return waitlist_entry

@router.get("", response_model=List[schemas.WaitlistResponse])
def get_my_waitlist(
    current_user: User = Depends(security.get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role == "owner":
        # See all waitlist entries for owner's restaurants
        restaurants = db.query(Restaurant.id).filter(Restaurant.owner_id == current_user.id).all()
        restaurant_ids = [r[0] for r in restaurants]
        return db.query(Waitlist).filter(Waitlist.restaurant_id.in_(restaurant_ids)).order_by(Waitlist.created_at.desc()).all()
    elif current_user.role == "admin":
        return db.query(Waitlist).order_by(Waitlist.created_at.desc()).all()
    else:
        return db.query(Waitlist).filter(Waitlist.user_id == current_user.id).order_by(Waitlist.created_at.desc()).all()

@router.get("/restaurant/{restaurant_id}", response_model=List[schemas.WaitlistResponse])
def get_restaurant_waitlist(
    restaurant_id: int,
    current_user: User = Depends(security.get_current_owner),
    db: Session = Depends(get_db)
):
    # Verify ownership
    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found.")
        
    if restaurant.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized.")
        
    return db.query(Waitlist).filter(
        Waitlist.restaurant_id == restaurant_id,
        Waitlist.status == "waiting"
    ).order_by(Waitlist.created_at.asc()).all()

@router.delete("/{waitlist_id}")
def cancel_waitlist_entry(
    waitlist_id: int,
    current_user: User = Depends(security.get_current_active_user),
    db: Session = Depends(get_db)
):
    entry = db.query(Waitlist).filter(Waitlist.id == waitlist_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Waitlist entry not found.")
        
    if entry.user_id != current_user.id and current_user.role not in ["owner", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized.")
        
    entry.status = "cancelled"
    db.commit()
    return {"message": "Waitlist entry cancelled."}
