from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.core.config import settings
from app.db.database import Base, engine
from app.models import models  # Registers all models with Base.metadata

# Create the database tables on startup (no setup required)
Base.metadata.create_all(bind=engine)

# Initialize FastAPI App
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend service for Restaurant Booking Management System",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Policy configuration
# In production, set BACKEND_CORS_ORIGINS env to your Vercel URL, e.g. ["https://tabreserve.vercel.app"]
CORS_ORIGINS = os.getenv("BACKEND_CORS_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure directories exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.QR_DIR, exist_ok=True)

# Mount Static Files (for image uploads and QR codes)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Import routers
from app.api import auth, users, restaurants, tables, bookings, payments, reviews, waitlist, notifications, admin

# Register API Routers
api_router = FastAPI()  # Using sub-router grouping
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(users.router, prefix=settings.API_V1_STR)
app.include_router(restaurants.router, prefix=settings.API_V1_STR)
app.include_router(tables.router, prefix=settings.API_V1_STR)
app.include_router(bookings.router, prefix=settings.API_V1_STR)
app.include_router(payments.router, prefix=settings.API_V1_STR)
app.include_router(reviews.router, prefix=settings.API_V1_STR)
app.include_router(waitlist.router, prefix=settings.API_V1_STR)
app.include_router(notifications.router, prefix=settings.API_V1_STR)
app.include_router(admin.router, prefix=settings.API_V1_STR)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": f"Welcome to the {settings.PROJECT_NAME} API. Visit /docs for Swagger UI documentation.",
        "is_payment_mock": settings.IS_RAZORPAY_MOCK,
    }
