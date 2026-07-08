import datetime
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List

# User Schemas
class UserCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: str = "customer"  # customer, owner

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserVerify(BaseModel):
    email: EmailStr
    otp: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: str
    is_verified: bool
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse

class TokenRefreshRequest(BaseModel):
    refresh_token: str

class ForgotPassword(BaseModel):
    email: EmailStr

class ResetPassword(BaseModel):
    email: EmailStr
    otp: str
    new_password: str = Field(..., min_length=6)

class ChangePassword(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=6)

# Restaurant Schemas
class RestaurantCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    address: str = Field(...)
    cuisine: str = Field(...)
    opening_time: str  # Format: "HH:MM"
    closing_time: str  # Format: "HH:MM"
    description: Optional[str] = None
    image_url: Optional[str] = None

class RestaurantResponse(BaseModel):
    id: int
    owner_id: int
    name: str
    address: str
    cuisine: str
    opening_time: datetime.time
    closing_time: datetime.time
    rating: float
    description: Optional[str]
    image_url: Optional[str]
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# Table Schemas
class TableCreate(BaseModel):
    table_number: str = Field(...)
    capacity: int = Field(..., gt=0)
    type: str = "indoor"  # indoor, outdoor, VIP

class TableResponse(BaseModel):
    id: int
    restaurant_id: int
    table_number: str
    capacity: int
    status: str
    type: str

    class Config:
        from_attributes = True

# Booking Schemas
class BookingCreate(BaseModel):
    restaurant_id: int
    booking_date: datetime.date
    booking_time: str  # Format: "HH:MM"
    guests: int = Field(..., gt=0)

class BookingResponse(BaseModel):
    id: int
    user_id: int
    restaurant_id: int
    table_id: Optional[int]
    booking_date: datetime.date
    booking_time: datetime.time
    guests: int
    payment_status: str
    booking_status: str
    qr_code: Optional[str]
    created_at: datetime.datetime
    restaurant: Optional[RestaurantResponse] = None

    class Config:
        from_attributes = True

class AvailabilityCheck(BaseModel):
    restaurant_id: int
    booking_date: datetime.date
    booking_time: str
    guests: int

class AvailabilityResponse(BaseModel):
    available: bool
    reason: Optional[str] = None
    table_id: Optional[int] = None
    waitlist_count: Optional[int] = 0

# Payment Schemas
class PaymentCreate(BaseModel):
    booking_id: int
    amount: float

class PaymentVerify(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

class PaymentResponse(BaseModel):
    id: int
    booking_id: int
    razorpay_order_id: str
    razorpay_payment_id: Optional[str]
    amount: float
    currency: str
    status: str
    method: Optional[str]
    created_at: datetime.datetime
    key_id: Optional[str] = None

    class Config:
        from_attributes = True

# Review Schemas
class ReviewCreate(BaseModel):
    booking_id: int
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None

class ReviewResponse(BaseModel):
    id: int
    booking_id: int
    user_id: int
    rating: int
    comment: Optional[str]
    created_at: datetime.datetime
    user_name: Optional[str] = None

    class Config:
        from_attributes = True

# Waitlist Schemas
class WaitlistCreate(BaseModel):
    restaurant_id: int
    date: datetime.date
    time: str  # Format: "HH:MM"
    guests: int = Field(..., gt=0)

class WaitlistResponse(BaseModel):
    id: int
    user_id: int
    restaurant_id: int
    date: datetime.date
    time: datetime.time
    guests: int
    status: str
    created_at: datetime.datetime
    restaurant: Optional[RestaurantResponse] = None

    class Config:
        from_attributes = True

# Notification Schemas
class NotificationResponse(BaseModel):
    id: int
    user_id: int
    message: str
    type: str
    is_read: bool
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# Stats / Analytics Schemas
class OwnerAnalytics(BaseModel):
    today_bookings: int
    revenue: float
    occupancy_rate: float  # Percentage
    popular_time: Optional[str]
    average_rating: float
    monthly_earnings: List[float]  # last 6 months
    monthly_labels: List[str]      # last 6 months names
    cancellation_rate: float  # Percentage

class AdminStats(BaseModel):
    total_users: int
    total_restaurants: int
    total_bookings: int
    total_payments: int
    total_revenue: float
    recent_bookings: List[BookingResponse]
