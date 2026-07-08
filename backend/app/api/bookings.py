import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.models import Booking, Table, Restaurant, User, Notification
from app.schemas import schemas
from app.core import security
from app.services.booking_service import find_available_table, parse_time


router = APIRouter(prefix="/bookings", tags=["Bookings"])

@router.post("", response_model=schemas.BookingResponse)
def create_booking(
    booking_in: schemas.BookingCreate,
    current_user: User = Depends(security.get_current_active_user),
    db: Session = Depends(get_db)
):
    try:
        b_time = parse_time(booking_in.booking_time)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    # Start database transaction for concurrency handling
    # lock=True invokes SQLAlchemy's with_for_update() to prevent race conditions (double bookings)
    table = find_available_table(
        db=db,
        restaurant_id=booking_in.restaurant_id,
        booking_date=booking_in.booking_date,
        booking_time=b_time,
        guests=booking_in.guests,
        lock=True
    )
    
    if not table:
        raise HTTPException(
            status_code=400,
            detail="The restaurant is fully booked for this time slot. Please join the waitlist instead."
        )
        
    booking = Booking(
        user_id=current_user.id,
        restaurant_id=booking_in.restaurant_id,
        table_id=table.id,
        booking_date=booking_in.booking_date,
        booking_time=b_time,
        guests=booking_in.guests,
        booking_status="pending",
        payment_status="pending"
    )
    
    db.add(booking)
    db.commit()
    db.refresh(booking)
    
    # Notify user in-app
    notification = Notification(
        user_id=current_user.id,
        message=f"Booking created for {booking.booking_date} at {booking.booking_time.strftime('%H:%M')}. Complete payment to confirm.",
        type="booking_created"
    )
    db.add(notification)
    db.commit()
    
    return booking

@router.get("", response_model=List[schemas.BookingResponse])
def list_my_bookings(
    current_user: User = Depends(security.get_current_active_user),
    db: Session = Depends(get_db)
):
    # Check roles. Owner should see all bookings for their restaurants
    if current_user.role == "owner":
        restaurants = db.query(Restaurant.id).filter(Restaurant.owner_id == current_user.id).all()
        restaurant_ids = [r[0] for r in restaurants]
        bookings = db.query(Booking).filter(Booking.restaurant_id.in_(restaurant_ids)).order_by(Booking.booking_date.desc(), Booking.booking_time.desc()).all()
    elif current_user.role == "admin":
        bookings = db.query(Booking).order_by(Booking.booking_date.desc(), Booking.booking_time.desc()).all()
    else:
        bookings = db.query(Booking).filter(Booking.user_id == current_user.id).order_by(Booking.booking_date.desc(), Booking.booking_time.desc()).all()
        
    return bookings

@router.get("/{booking_id}", response_model=schemas.BookingResponse)
def get_booking_details(
    booking_id: int,
    current_user: User = Depends(security.get_current_active_user),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found.")
        
    # Check permissions
    if booking.user_id != current_user.id and current_user.role not in ["admin", "owner"]:
        # If owner, check if booking is at their restaurant
        if current_user.role == "owner":
            restaurant = db.query(Restaurant).filter(Restaurant.id == booking.restaurant_id).first()
            if restaurant.owner_id != current_user.id:
                raise HTTPException(status_code=403, detail="Not authorized.")
        else:
            raise HTTPException(status_code=403, detail="Not authorized.")
            
    return booking

@router.put("/{booking_id}/cancel")
def cancel_booking(
    booking_id: int,
    current_user: User = Depends(security.get_current_active_user),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found.")
        
    # Check permissions
    is_owner = False
    if current_user.role == "owner":
        restaurant = db.query(Restaurant).filter(Restaurant.id == booking.restaurant_id).first()
        is_owner = (restaurant.owner_id == current_user.id)
        
    if booking.user_id != current_user.id and not is_owner and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to cancel this booking.")
        
    if booking.booking_status == "cancelled":
        raise HTTPException(status_code=400, detail="Booking is already cancelled.")
        
    # Process Refund if paid
    refund_processed = False
    if booking.payment_status in ["paid", "partially_paid"]:
        # Find payments
        from app.models.models import Payment
        payments = db.query(Payment).filter(Payment.booking_id == booking.id, Payment.status == "captured").all()
        for payment in payments:
            payment.status = "refunded"
        booking.payment_status = "refunded"
        refund_processed = True
        
    booking.booking_status = "cancelled"
    
    # Notify user in-app
    notification = Notification(
        user_id=booking.user_id,
        message=f"Your booking for {booking.booking_date} has been cancelled.{' Refund will be processed.' if refund_processed else ''}",
        type="booking_cancelled"
    )
    db.add(notification)
    db.commit()
    
    # Waitlist Promotion check
    promote_waitlist_user(db, booking.restaurant_id, booking.booking_date, booking.booking_time)
    
    return {"message": "Booking cancelled successfully.", "refund_processed": refund_processed}

@router.put("/{booking_id}/status")
def update_booking_status(
    booking_id: int,
    booking_status: str,  # confirmed, cancelled, completed
    current_user: User = Depends(security.get_current_owner),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found.")
        
    restaurant = db.query(Restaurant).filter(Restaurant.id == booking.restaurant_id).first()
    if restaurant.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized.")
        
    if booking_status not in ["confirmed", "cancelled", "completed"]:
        raise HTTPException(status_code=400, detail="Invalid status value.")
        
    booking.booking_status = booking_status
    
    # Notify user
    notification = Notification(
        user_id=booking.user_id,
        message=f"Your booking status has been updated to '{booking_status}' for {booking.booking_date}.",
        type=f"booking_{booking_status}"
    )
    db.add(notification)
    db.commit()
    
    if booking_status == "cancelled":
        promote_waitlist_user(db, booking.restaurant_id, booking.booking_date, booking.booking_time)
        
    return {"message": f"Booking status updated to {booking_status}."}

def promote_waitlist_user(db: Session, restaurant_id: int, date: datetime.date, time: datetime.time):
    """Checks the waitlist for the freed slot and promotes the first candidate who fits available capacity."""
    from app.models.models import Waitlist, Notification
    from app.utils.mail import send_email
    
    # Query waitlists sorted by created_at asc
    waitlist_entries = db.query(Waitlist).filter(
        Waitlist.restaurant_id == restaurant_id,
        Waitlist.date == date,
        Waitlist.time == time,
        Waitlist.status == "waiting"
    ).order_by(Waitlist.created_at.asc()).all()
    
    for entry in waitlist_entries:
        # Check if table fits the waitlisted guest capacity now
        table = find_available_table(
            db=db,
            restaurant_id=restaurant_id,
            booking_date=date,
            booking_time=time,
            guests=entry.guests
        )
        if table:
            # Promote this user!
            entry.status = "notified"
            
            # Send Notification
            notif = Notification(
                user_id=entry.user_id,
                message=f"Great news! A table is now available at your selected restaurant for {date} at {time.strftime('%H:%M')}. Book now!",
                type="waitlist_promotion"
            )
            db.add(notif)
            db.commit()
            
            # Send Email
            user = db.query(User).filter(User.id == entry.user_id).first()
            if user:
                send_email(
                    user.email,
                    "Waitlist Promotion - Restaurant Booking System",
                    f"<h2>Your Waitlist Table is Available!</h2><p>Hi {user.name}, a table has freed up at your waitlisted slot on {date} at {time.strftime('%H:%M')}. Open the website dashboard to book now!</p>"
                )
            break # promote only one user per cancellation
