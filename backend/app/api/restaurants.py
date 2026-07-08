import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.models import Restaurant, User, Table
from app.schemas import schemas
from app.core import security
from app.utils.storage import save_image
from app.services.booking_service import find_available_table, parse_time

router = APIRouter(prefix="/restaurants", tags=["Restaurants"])

@router.post("", response_model=schemas.RestaurantResponse)
def create_restaurant(
    restaurant_in: schemas.RestaurantCreate,
    current_user: User = Depends(security.get_current_owner),
    db: Session = Depends(get_db)
):
    # Verify opening/closing times format
    try:
        open_t = parse_time(restaurant_in.opening_time)
        close_t = parse_time(restaurant_in.closing_time)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    restaurant = Restaurant(
        owner_id=current_user.id,
        name=restaurant_in.name,
        address=restaurant_in.address,
        cuisine=restaurant_in.cuisine,
        opening_time=open_t,
        closing_time=close_t,
        description=restaurant_in.description,
        image_url=restaurant_in.image_url
    )
    db.add(restaurant)
    db.commit()
    db.refresh(restaurant)
    return restaurant

@router.get("", response_model=List[schemas.RestaurantResponse])
def list_restaurants(
    search: Optional[str] = None,
    city: Optional[str] = None,
    cuisine: Optional[str] = None,
    min_rating: Optional[float] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Restaurant)
    
    if search:
        query = query.filter(
            (Restaurant.name.ilike(f"%{search}%")) |
            (Restaurant.cuisine.ilike(f"%{search}%")) |
            (Restaurant.address.ilike(f"%{search}%"))
        )
    if city:
        query = query.filter(Restaurant.address.ilike(f"%{city}%"))
    if cuisine:
        query = query.filter(Restaurant.cuisine.ilike(f"%{cuisine}%"))
    if min_rating is not None:
        query = query.filter(Restaurant.rating >= min_rating)
        
    return query.all()

@router.get("/{restaurant_id}", response_model=schemas.RestaurantResponse)
def get_restaurant(restaurant_id: int, db: Session = Depends(get_db)):
    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found.")
    return restaurant

@router.post("/{restaurant_id}/image")
def upload_restaurant_image(
    restaurant_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(security.get_current_owner),
    db: Session = Depends(get_db)
):
    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found.")
        
    if restaurant.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to edit this restaurant.")
        
    image_url = save_image(file)
    restaurant.image_url = image_url
    db.commit()
    
    return {"image_url": image_url, "message": "Image uploaded successfully."}

@router.post("/check-availability", response_model=schemas.AvailabilityResponse)
def check_availability(
    check: schemas.AvailabilityCheck,
    db: Session = Depends(get_db)
):
    restaurant = db.query(Restaurant).filter(Restaurant.id == check.restaurant_id).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found.")
        
    try:
        booking_time = parse_time(check.booking_time)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    # Check if within opening hours
    if not (restaurant.opening_time <= booking_time <= restaurant.closing_time):
        return {
            "available": False,
            "reason": f"Restaurant is closed at {check.booking_time}. Operating hours: {restaurant.opening_time.strftime('%H:%M')} - {restaurant.closing_time.strftime('%H:%M')}"
        }
        
    table = find_available_table(
        db=db,
        restaurant_id=check.restaurant_id,
        booking_date=check.booking_date,
        booking_time=booking_time,
        guests=check.guests
    )
    
    if table:
        return {
            "available": True,
            "table_id": table.id
        }
    else:
        # Check waitlist count for this slot to present it to user
        from app.models.models import Waitlist
        wl_count = db.query(Waitlist).filter(
            Waitlist.restaurant_id == check.restaurant_id,
            Waitlist.date == check.booking_date,
            Waitlist.time == booking_time,
            Waitlist.status == "waiting"
        ).count()
        
        return {
            "available": False,
            "reason": "No tables available matching guest capacity for this time slot.",
            "waitlist_count": wl_count
        }

@router.get("/{restaurant_id}/slots")
def get_available_slots(
    restaurant_id: int,
    date_str: str,  # Format YYYY-MM-DD
    guests: int,
    db: Session = Depends(get_db)
):
    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found.")
        
    try:
        booking_date = datetime.datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Date must be in format YYYY-MM-DD")
        
    # Generate 1-hour interval slots between opening and closing time
    slots = []
    current_dt = datetime.datetime.combine(booking_date, restaurant.opening_time)
    end_dt = datetime.datetime.combine(booking_date, restaurant.closing_time)
    
    # Check slots up to 2 hours before closing so guests have time to dine
    while current_dt <= end_dt - datetime.timedelta(hours=1):
        slot_time = current_dt.time()
        table = find_available_table(
            db=db,
            restaurant_id=restaurant_id,
            booking_date=booking_date,
            booking_time=slot_time,
            guests=guests
        )
        slots.append({
            "time": slot_time.strftime("%H:%M"),
            "available": table is not None
        })
        current_dt += datetime.timedelta(hours=1)
        
    return slots
