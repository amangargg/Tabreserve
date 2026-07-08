import datetime
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from app.models.models import Booking, Table, Restaurant

def parse_time(time_str: str) -> datetime.time:
    """Parses a time string formatted as HH:MM into a datetime.time object."""
    if isinstance(time_str, datetime.time):
        return time_str
    try:
        parts = time_str.split(":")
        return datetime.time(int(parts[0]), int(parts[1]))
    except Exception:
        raise ValueError("Time must be in format HH:MM")

def get_overlap_range(b_time: datetime.time) -> Tuple[datetime.time, datetime.time]:
    """
    Computes the 2-hour window during which a new booking would overlap with an existing booking.
    For a booking at time T, any booking between (T - 2h) and (T + 2h) overlaps.
    """
    # Use dummy date for time math
    dummy_dt = datetime.datetime.combine(datetime.date.today(), b_time)
    
    start_dt = dummy_dt - datetime.timedelta(hours=1, minutes=59)
    end_dt = dummy_dt + datetime.timedelta(hours=1, minutes=59)
    
    return start_dt.time(), end_dt.time()

def find_available_table(
    db: Session,
    restaurant_id: int,
    booking_date: datetime.date,
    booking_time: datetime.time,
    guests: int,
    lock: bool = False
) -> Optional[Table]:
    """
    Finds the smallest available table (capacity >= guests) that is not booked
    during the 2-hour window of the requested booking.
    
    If lock=True, performs a SELECT ... FOR UPDATE on the table to lock it for concurrent transactions.
    """
    # 1. Calculate time overlap boundaries
    start_overlap, end_overlap = get_overlap_range(booking_time)
    
    # Handle overlap wrapping around midnight if needed, but standard opening hours are usually clean.
    # We'll check if the booking overlaps.
    
    # 2. Query bookings that overlap on that date
    # In SQLite, time comparisons work as strings, which SQLAlchemy converts appropriately.
    # To handle cross-day or simple interval:
    overlapping_bookings = db.query(Booking.table_id).filter(
        Booking.restaurant_id == restaurant_id,
        Booking.booking_date == booking_date,
        Booking.booking_status.in_(["confirmed", "pending"]),
        Booking.table_id.isnot(None)
    )
    
    if start_overlap < end_overlap:
        overlapping_bookings = overlapping_bookings.filter(
            and_(
                Booking.booking_time >= start_overlap,
                Booking.booking_time <= end_overlap
            )
        )
    else:
        # Wrap around midnight (unlikely for typical hours but safe)
        overlapping_bookings = overlapping_bookings.filter(
            or_(
                Booking.booking_time >= start_overlap,
                Booking.booking_time <= end_overlap
            )
        )
        
    booked_table_ids = [b[0] for b in overlapping_bookings.all()]
    
    # 3. Find candidate tables
    query = db.query(Table).filter(
        Table.restaurant_id == restaurant_id,
        Table.capacity >= guests,
        ~Table.id.in_(booked_table_ids) if booked_table_ids else True
    ).order_by(Table.capacity.asc())
    
    if lock:
        # Prevent race condition (SELECT FOR UPDATE)
        # Note: SQLite does not support FOR UPDATE, but standard transactions hold write locks.
        # We invoke with_for_update() which is ignored by SQLite but executed on PostgreSQL.
        query = query.with_for_update()
        
    return query.first()
