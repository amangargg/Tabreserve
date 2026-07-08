import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings

def send_email(to_email: str, subject: str, body: str):
    # Check if SMTP details are configured
    if not settings.SMTP_HOST or not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        print("\n" + "="*80)
        print(f"MOCK EMAIL SENT TO: {to_email}")
        print(f"SUBJECT: {subject}")
        print(f"BODY:\n{body}")
        print("="*80 + "\n")
        return True
    
    try:
        msg = MIMEMultipart()
        msg['From'] = settings.SMTP_FROM_EMAIL
        msg['To'] = to_email
        msg['Subject'] = subject
        
        msg.attach(MIMEText(body, 'html'))
        
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_FROM_EMAIL, to_email, msg.as_string())
        return True
    except Exception as e:
        print(f"Error sending SMTP email: {e}")
        # Log mock fallback anyway so development is not blocked
        print("\n" + "="*80)
        print(f"FALLBACK MOCK EMAIL (SMTP FAILED) TO: {to_email}")
        print(f"SUBJECT: {subject}")
        print(f"BODY:\n{body}")
        print("="*80 + "\n")
        return False

def send_otp_email(to_email: str, otp: str):
    subject = "Verify Your Account - Restaurant Booking System"
    body = f"""
    <html>
        <body>
            <h2>Welcome to Restaurant Booking System!</h2>
            <p>Your One-Time Password (OTP) for account verification is:</p>
            <h1 style="font-size: 32px; letter-spacing: 5px; color: #4F46E5;">{otp}</h1>
            <p>This OTP is valid for 10 minutes. If you did not request this, please ignore this email.</p>
        </body>
    </html>
    """
    return send_email(to_email, subject, body)

def send_booking_email(to_email: str, booking_details: str, qr_code_url: str = None):
    subject = "Booking Confirmed! - Restaurant Booking System"
    qr_img_html = f'<p><img src="{qr_code_url}" alt="Booking QR Code" style="max-width: 200px;"/></p>' if qr_code_url else ""
    body = f"""
    <html>
        <body>
            <h2>Your Booking is Confirmed!</h2>
            <p>Thank you for booking with us. Here are your booking details:</p>
            <div style="background-color: #F3F4F6; padding: 15px; border-radius: 8px; margin: 15px 0;">
                {booking_details}
            </div>
            {qr_img_html}
            <p>Please show this confirmation email or QR code at the restaurant.</p>
        </body>
    </html>
    """
    return send_email(to_email, subject, body)
