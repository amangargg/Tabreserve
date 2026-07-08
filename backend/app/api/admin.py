import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.database import get_db
from app.models.models import Booking, Payment, Restaurant, User, Table, Review
from app.schemas import schemas
from app.core import security

router = APIRouter(prefix="/admin", tags=["Admin & Analytics"])

@router.get("/owner/analytics", response_model=schemas.OwnerAnalytics)
def get_owner_analytics(
    restaurant_id: int,
    current_user: User = Depends(security.get_current_owner),
    db: Session = Depends(get_db)
):
    # Verify owner owns the restaurant
    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found.")
        
    if restaurant.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to view analytics for this restaurant.")
        
    today = datetime.date.today()
    
    # 1. Today's Bookings
    today_bookings = db.query(Booking).filter(
        Booking.restaurant_id == restaurant_id,
        Booking.booking_date == today,
        Booking.booking_status.in_(["confirmed", "completed"])
    ).count()
    
    # 2. Total Revenue
    # Join Booking with Payments
    revenue = db.query(func.sum(Payment.amount)).join(Booking, Payment.booking_id == Booking.id).filter(
        Booking.restaurant_id == restaurant_id,
        Payment.status == "captured"
    ).scalar() or 0.0
    
    # 3. Occupancy Rate
    total_tables = db.query(Table).filter(Table.restaurant_id == restaurant_id).count()
    booked_tables = db.query(Booking.table_id).filter(
        Booking.restaurant_id == restaurant_id,
        Booking.booking_date == today,
        Booking.booking_status.in_(["confirmed", "completed"]),
        Booking.table_id.isnot(None)
    ).distinct().count()
    
    occupancy_rate = (booked_tables / total_tables * 100) if total_tables > 0 else 0.0
    
    # 4. Most Popular Time
    popular_time_query = db.query(Booking.booking_time, func.count(Booking.id).label("cnt")).filter(
        Booking.restaurant_id == restaurant_id,
        Booking.booking_status.in_(["confirmed", "completed"])
    ).group_by(Booking.booking_time).order_by(func.count(Booking.id).desc()).first()
    
    popular_time = popular_time_query[0].strftime("%H:%M") if popular_time_query else "N/A"
    
    # 5. Cancellation Rate
    total_bookings = db.query(Booking).filter(Booking.restaurant_id == restaurant_id).count()
    cancelled_bookings = db.query(Booking).filter(
        Booking.restaurant_id == restaurant_id,
        Booking.booking_status == "cancelled"
    ).count()
    cancellation_rate = (cancelled_bookings / total_bookings * 100) if total_bookings > 0 else 0.0
    
    # 6. Monthly Earnings (last 6 months)
    monthly_earnings = []
    monthly_labels = []
    
    # Generate labels & calculate values
    for i in range(5, -1, -1):
        target_date = today - datetime.timedelta(days=i*30)
        year = target_date.year
        month = target_date.month
        month_name = target_date.strftime("%b")
        
        # Calculate sum for this month
        start_date = datetime.date(year, month, 1)
        if month == 12:
            end_date = datetime.date(year + 1, 1, 1)
        else:
            end_date = datetime.date(year, month + 1, 1)
            
        m_earnings = db.query(func.sum(Payment.amount)).join(Booking, Payment.booking_id == Booking.id).filter(
            Booking.restaurant_id == restaurant_id,
            Payment.status == "captured",
            Payment.created_at >= start_date,
            Payment.created_at < end_date
        ).scalar() or 0.0
        
        monthly_earnings.append(float(m_earnings))
        monthly_labels.append(month_name)
        
    return {
        "today_bookings": today_bookings,
        "revenue": float(revenue),
        "occupancy_rate": round(occupancy_rate, 1),
        "popular_time": popular_time,
        "average_rating": restaurant.rating,
        "monthly_earnings": monthly_earnings,
        "monthly_labels": monthly_labels,
        "cancellation_rate": round(cancellation_rate, 1)
    }

@router.get("/stats", response_model=schemas.AdminStats)
def get_global_admin_stats(
    current_user: User = Depends(security.get_current_admin),
    db: Session = Depends(get_db)
):
    total_users = db.query(User).count()
    total_restaurants = db.query(Restaurant).count()
    total_bookings = db.query(Booking).count()
    total_payments = db.query(Payment).filter(Payment.status == "captured").count()
    
    total_revenue = db.query(func.sum(Payment.amount)).filter(Payment.status == "captured").scalar() or 0.0
    
    recent_bookings = db.query(Booking).order_by(Booking.created_at.desc()).limit(5).all()
    
    return {
        "total_users": total_users,
        "total_restaurants": total_restaurants,
        "total_bookings": total_bookings,
        "total_payments": total_payments,
        "total_revenue": float(total_revenue),
        "recent_bookings": recent_bookings
    }
