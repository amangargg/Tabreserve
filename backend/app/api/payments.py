import hmac
import hashlib
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import razorpay
from app.db.database import get_db
from app.models.models import Booking, Payment, User, Notification, Restaurant
from app.schemas import schemas
from app.core import security
from app.core.config import settings
from app.utils.qr import generate_booking_qr
from app.utils.mail import send_booking_email

router = APIRouter(prefix="/payments", tags=["Payments"])

def get_razorpay_client():
    if settings.IS_RAZORPAY_MOCK:
        return None
    try:
        return razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
    except Exception as e:
        print(f"Failed to initialize Razorpay client: {e}. Defaulting to mock mode.")
        settings.IS_RAZORPAY_MOCK = True
        return None

@router.post("/order", response_model=schemas.PaymentResponse)
def create_payment_order(
    payment_in: schemas.PaymentCreate,
    current_user: User = Depends(security.get_current_active_user),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.id == payment_in.booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found.")
        
    if booking.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to pay for this booking.")
        
    amount_paise = int(payment_in.amount * 100)  # Razorpay expects amount in paise
    
    client = get_razorpay_client()
    if settings.IS_RAZORPAY_MOCK or not client:
        # Mock order generation
        import uuid
        order_id = f"order_mock_{uuid.uuid4().hex[:14]}"
    else:
        try:
            order_data = {
                "amount": amount_paise,
                "currency": "INR",
                "receipt": f"receipt_booking_{booking.id}",
                "payment_capture": 1
            }
            razorpay_order = client.order.create(data=order_data)
            order_id = razorpay_order.get("id")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Razorpay order creation failed: {e}")
            
    payment = Payment(
        booking_id=booking.id,
        razorpay_order_id=order_id,
        amount=payment_in.amount,
        currency="INR",
        status="created"
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)
    
    payment.key_id = settings.RAZORPAY_KEY_ID
    return payment

@router.post("/verify")
def verify_payment(
    verify_in: schemas.PaymentVerify,
    current_user: User = Depends(security.get_current_active_user),
    db: Session = Depends(get_db)
):
    # Verify the signature
    client = get_razorpay_client()
    verified = False
    
    if settings.IS_RAZORPAY_MOCK or not client:
        # Calculate signature locally using mock keys to simulate Razorpay
        msg = f"{verify_in.razorpay_order_id}|{verify_in.razorpay_payment_id}"
        expected_sig = hmac.new(
            key=settings.RAZORPAY_KEY_SECRET.encode(),
            msg=msg.encode(),
            digestmod=hashlib.sha256
        ).hexdigest()
        
        # We also allow any signature starting with 'mock_sig_' for simple client validation
        if verify_in.razorpay_signature.startswith("mock_sig_") or hmac.compare_digest(expected_sig, verify_in.razorpay_signature):
            verified = True
    else:
        try:
            params_dict = {
                'razorpay_order_id': verify_in.razorpay_order_id,
                'razorpay_payment_id': verify_in.razorpay_payment_id,
                'razorpay_signature': verify_in.razorpay_signature
            }
            client.utility.verify_payment_signature(params_dict)
            verified = True
        except Exception as e:
            print(f"Razorpay signature verification failed: {e}")
            verified = False
            
    if not verified:
        # Find payment and mark as failed
        payment = db.query(Payment).filter(Payment.razorpay_order_id == verify_in.razorpay_order_id).first()
        if payment:
            payment.status = "failed"
            db.commit()
        raise HTTPException(status_code=400, detail="Payment signature verification failed.")
        
    # Update payment & booking status
    payment = db.query(Payment).filter(Payment.razorpay_order_id == verify_in.razorpay_order_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found for this order ID.")
        
    payment.razorpay_payment_id = verify_in.razorpay_payment_id
    payment.signature = verify_in.razorpay_signature
    payment.status = "captured"
    
    booking = db.query(Booking).filter(Booking.id == payment.booking_id).first()
    booking.payment_status = "paid"
    booking.booking_status = "confirmed"
    
    # Generate QR Code
    restaurant = db.query(Restaurant).filter(Restaurant.id == booking.restaurant_id).first()
    qr_text = f"Restaurant: {restaurant.name}\nDate: {booking.booking_date}\nTime: {booking.booking_time.strftime('%H:%M')}\nGuests: {booking.guests}"
    qr_url = generate_booking_qr(booking.id, qr_text)
    booking.qr_code = qr_url
    
    # Save Notification
    notif = Notification(
        user_id=booking.user_id,
        message=f"Payment of Rs. {payment.amount} successful! Your booking at {restaurant.name} is confirmed.",
        type="payment_success"
    )
    db.add(notif)
    db.commit()
    
    # Send Email Confirmation
    details_html = f"""
    <strong>Restaurant:</strong> {restaurant.name}<br/>
    <strong>Address:</strong> {restaurant.address}<br/>
    <strong>Date:</strong> {booking.booking_date}<br/>
    <strong>Time:</strong> {booking.booking_time.strftime('%H:%M')}<br/>
    <strong>Guests:</strong> {booking.guests}<br/>
    <strong>Amount Paid:</strong> Rs. {payment.amount}<br/>
    <strong>Booking ID:</strong> {booking.id}
    """
    
    # Construct base QR URL for email display (e.g. host domain)
    # Since we run locally, we can pass the relative URL or host URL
    full_qr_url = f"http://localhost:8000{qr_url}"
    send_booking_email(current_user.email, details_html, full_qr_url)
    
    return {"message": "Payment verified and booking confirmed.", "booking": booking}
