import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Date, Time, Text
from sqlalchemy.orm import relationship
from app.db.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default="customer")  # customer, owner, admin
    is_verified = Column(Boolean, default=False)
    otp = Column(String(6), nullable=True)
    otp_expiry = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    restaurants = relationship("Restaurant", back_populates="owner", cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="user", cascade="all, delete-orphan")
    waitlists = relationship("Waitlist", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")

class Restaurant(Base):
    __tablename__ = "restaurants"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), index=True, nullable=False)
    address = Column(String(255), nullable=False)
    cuisine = Column(String(100), index=True, nullable=False)
    opening_time = Column(Time, nullable=False)
    closing_time = Column(Time, nullable=False)
    rating = Column(Float, default=0.0)
    description = Column(Text, nullable=True)
    image_url = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    owner = relationship("User", back_populates="restaurants")
    tables = relationship("Table", back_populates="restaurant", cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="restaurant", cascade="all, delete-orphan")
    waitlists = relationship("Waitlist", back_populates="restaurant", cascade="all, delete-orphan")

class Table(Base):
    __tablename__ = "tables"

    id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id", ondelete="CASCADE"), nullable=False)
    table_number = Column(String(50), nullable=False)
    capacity = Column(Integer, nullable=False)
    status = Column(String(20), default="available")  # available, occupied, reserved
    type = Column(String(20), default="indoor")  # indoor, outdoor, VIP

    # Relationships
    restaurant = relationship("Restaurant", back_populates="tables")
    bookings = relationship("Booking", back_populates="table")

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id", ondelete="CASCADE"), nullable=False)
    table_id = Column(Integer, ForeignKey("tables.id", ondelete="CASCADE"), nullable=True) # can be null if join waitlist initially
    booking_date = Column(Date, nullable=False)
    booking_time = Column(Time, nullable=False)
    guests = Column(Integer, nullable=False)
    payment_status = Column(String(20), default="pending")  # pending, paid, partially_paid, refunded, failed
    booking_status = Column(String(20), default="pending")  # pending, confirmed, cancelled, completed
    qr_code = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="bookings")
    restaurant = relationship("Restaurant", back_populates="bookings")
    table = relationship("Table", back_populates="bookings")
    payments = relationship("Payment", back_populates="booking", cascade="all, delete-orphan")
    review = relationship("Review", uselist=False, back_populates="booking", cascade="all, delete-orphan")

class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False)
    razorpay_order_id = Column(String(100), index=True, nullable=False)
    razorpay_payment_id = Column(String(100), unique=True, index=True, nullable=True)
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="INR")
    status = Column(String(20), default="created")  # created, captured, failed, refunded
    signature = Column(String(255), nullable=True)
    method = Column(String(50), nullable=True)  # card, netbanking, upi, wallet
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    booking = relationship("Booking", back_populates="payments")

class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False, unique=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    rating = Column(Integer, nullable=False)  # 1 to 5
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    booking = relationship("Booking", back_populates="review")

class Waitlist(Base):
    __tablename__ = "waitlists"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    time = Column(Time, nullable=False)
    guests = Column(Integer, nullable=False)
    status = Column(String(20), default="waiting")  # waiting, notified, booked, cancelled
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="waitlists")
    restaurant = relationship("Restaurant")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(30), nullable=False)  # booking_confirmation, booking_reminder, waitlist_promotion, etc.
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="notifications")
