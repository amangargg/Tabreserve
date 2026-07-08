from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.database import get_db
from app.models.models import Review, Booking, Restaurant, User
from app.schemas import schemas
from app.core import security

router = APIRouter(prefix="/reviews", tags=["Reviews"])

@router.post("", response_model=schemas.ReviewResponse)
def create_review(
    review_in: schemas.ReviewCreate,
    current_user: User = Depends(security.get_current_active_user),
    db: Session = Depends(get_db)
):
    # Verify booking exists and belongs to user
    booking = db.query(Booking).filter(Booking.id == review_in.booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found.")
        
    if booking.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to review this booking.")
        
    # Check if review already exists for this booking
    existing_review = db.query(Review).filter(Review.booking_id == booking.id).first()
    if existing_review:
        raise HTTPException(status_code=400, detail="You have already reviewed this booking.")
        
    review = Review(
        booking_id=booking.id,
        user_id=current_user.id,
        rating=review_in.rating,
        comment=review_in.comment
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    
    # Recalculate restaurant rating
    # Query all booking ids for the restaurant
    booking_ids = db.query(Booking.id).filter(Booking.restaurant_id == booking.restaurant_id).all()
    b_ids = [b[0] for b in booking_ids]
    
    avg_rating = db.query(func.avg(Review.rating)).filter(Review.booking_id.in_(b_ids)).scalar()
    
    restaurant = db.query(Restaurant).filter(Restaurant.id == booking.restaurant_id).first()
    if restaurant and avg_rating is not None:
        restaurant.rating = round(float(avg_rating), 1)
        db.commit()
        
    # Build response with username
    return {
        "id": review.id,
        "booking_id": review.booking_id,
        "user_id": review.user_id,
        "rating": review.rating,
        "comment": review.comment,
        "created_at": review.created_at,
        "user_name": current_user.name
    }

@router.get("/restaurant/{restaurant_id}", response_model=List[schemas.ReviewResponse])
def get_restaurant_reviews(restaurant_id: int, db: Session = Depends(get_db)):
    bookings = db.query(Booking.id).filter(Booking.restaurant_id == restaurant_id).all()
    b_ids = [b[0] for b in bookings]
    
    reviews = db.query(Review, User.name).join(User, Review.user_id == User.id).filter(Review.booking_id.in_(b_ids)).order_by(Review.created_at.desc()).all()
    
    result = []
    for r, username in reviews:
        result.append({
            "id": r.id,
            "booking_id": r.booking_id,
            "user_id": r.user_id,
            "rating": r.rating,
            "comment": r.comment,
            "created_at": r.created_at,
            "user_name": username
        })
        
    return result
