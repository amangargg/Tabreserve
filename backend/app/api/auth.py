import random
import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.models import User
from app.schemas import schemas
from app.core import security
from app.utils.mail import send_otp_email

router = APIRouter(prefix="/auth", tags=["Authentication"])

def generate_otp() -> str:
    return f"{random.randint(100000, 999999)}"

@router.post("/register", response_model=schemas.UserResponse)
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user_in.email).first()
    if db_user:
        raise HTTPException(
            status_code=400,
            detail="A user with this email address already exists."
        )
    
    otp = generate_otp()
    otp_expiry = datetime.datetime.utcnow() + datetime.timedelta(minutes=10)
    
    password_hash = security.get_password_hash(user_in.password)
    user = User(
        name=user_in.name,
        email=user_in.email,
        password_hash=password_hash,
        role=user_in.role,
        is_verified=False,
        otp=otp,
        otp_expiry=otp_expiry
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Send verification email
    send_otp_email(user.email, otp)
    
    return user

@router.post("/verify-otp", response_model=schemas.Token)
def verify_otp(verify_in: schemas.UserVerify, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == verify_in.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    
    if user.is_verified:
        raise HTTPException(status_code=400, detail="User is already verified.")
        
    if user.otp != verify_in.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP.")
        
    if user.otp_expiry and user.otp_expiry < datetime.datetime.utcnow():
        raise HTTPException(status_code=400, detail="OTP has expired.")
        
    user.is_verified = True
    user.otp = None
    user.otp_expiry = None
    db.commit()
    db.refresh(user)
    
    # Generate tokens
    access_token = security.create_access_token(subject=user.email, role=user.role)
    refresh_token = security.create_refresh_token(subject=user.email, role=user.role)
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/resend-otp")
def resend_otp(verify_in: schemas.ForgotPassword, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == verify_in.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    
    if user.is_verified:
        raise HTTPException(status_code=400, detail="User is already verified.")
        
    otp = generate_otp()
    user.otp = otp
    user.otp_expiry = datetime.datetime.utcnow() + datetime.timedelta(minutes=10)
    db.commit()
    
    send_otp_email(user.email, otp)
    return {"message": "OTP resent successfully."}

@router.post("/login", response_model=schemas.Token)
def login(login_in: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_in.email).first()
    if not user or not security.verify_password(login_in.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )
    
    if not user.is_verified:
        # User registered but not verified
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account email is not verified. Please verify your OTP."
        )
        
    access_token = security.create_access_token(subject=user.email, role=user.role)
    refresh_token = security.create_refresh_token(subject=user.email, role=user.role)
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/refresh", response_model=schemas.Token)
def refresh_token(refresh_in: schemas.TokenRefreshRequest, db: Session = Depends(get_db)):
    payload = security.decode_token(refresh_in.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token.")
        
    email = payload.get("sub")
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
        
    access_token = security.create_access_token(subject=user.email, role=user.role)
    refresh_token = security.create_refresh_token(subject=user.email, role=user.role)
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/forgot-password")
def forgot_password(forgot_in: schemas.ForgotPassword, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == forgot_in.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
        
    otp = generate_otp()
    user.otp = otp
    user.otp_expiry = datetime.datetime.utcnow() + datetime.timedelta(minutes=10)
    db.commit()
    
    send_otp_email(user.email, otp)
    return {"message": "OTP sent to your email."}

@router.post("/reset-password")
def reset_password(reset_in: schemas.ResetPassword, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == reset_in.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
        
    if user.otp != reset_in.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP.")
        
    if user.otp_expiry and user.otp_expiry < datetime.datetime.utcnow():
        raise HTTPException(status_code=400, detail="OTP has expired.")
        
    user.password_hash = security.get_password_hash(reset_in.new_password)
    user.otp = None
    user.otp_expiry = None
    db.commit()
    
    return {"message": "Password reset successfully."}
