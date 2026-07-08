import os
from typing import Optional
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Restaurant Booking Management System"
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "supersecretkeyforrestaurantbookingsystem1234567890")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Database
    # Default to sqlite locally if DATABASE_URL is not set
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./restaurant_booking.db")
    
    # Redis
    REDIS_URL: Optional[str] = os.getenv("REDIS_URL", None)
    
    # Razorpay (Optional, fallback to mock if empty)
    RAZORPAY_KEY_ID: str = os.getenv("RAZORPAY_KEY_ID", "rzp_test_mockkeyid12345")
    RAZORPAY_KEY_SECRET: str = os.getenv("RAZORPAY_KEY_SECRET", "mocksecretkey12345")
    IS_RAZORPAY_MOCK: bool = True  # Enabled if keys are test/mock
    
    # Cloudinary (Optional, fallback to local uploads folder if empty)
    CLOUDINARY_CLOUD_NAME: Optional[str] = os.getenv("CLOUDINARY_CLOUD_NAME", None)
    CLOUDINARY_API_KEY: Optional[str] = os.getenv("CLOUDINARY_API_KEY", None)
    CLOUDINARY_API_SECRET: Optional[str] = os.getenv("CLOUDINARY_API_SECRET", None)
    
    # SMTP Settings (Optional, logs to console if empty)
    SMTP_HOST: Optional[str] = os.getenv("SMTP_HOST", None)
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: Optional[str] = os.getenv("SMTP_USER", None)
    SMTP_PASSWORD: Optional[str] = os.getenv("SMTP_PASSWORD", None)
    SMTP_FROM_EMAIL: str = os.getenv("SMTP_FROM_EMAIL", "noreply@restaurantbooking.com")
    
    # Local uploads directory (if Cloudinary is not used)
    UPLOAD_DIR: str = "static/uploads"
    QR_DIR: str = "static/qrcodes"

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()

# Create upload and QR directories if they don't exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.QR_DIR, exist_ok=True)

# Auto-detect mock modes
if settings.RAZORPAY_KEY_ID != "rzp_test_mockkeyid12345" and settings.RAZORPAY_KEY_SECRET != "mocksecretkey12345":
    settings.IS_RAZORPAY_MOCK = False
