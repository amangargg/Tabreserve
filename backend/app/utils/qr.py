import os
import qrcode
from app.core.config import settings

def generate_booking_qr(booking_id: int, details_text: str) -> str:
    """
    Generates a QR code PNG image for a booking, saving it to static/qrcodes/.
    Returns the relative URL path to the generated file.
    """
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(f"Booking ID: {booking_id}\n{details_text}")
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    
    filename = f"booking_qr_{booking_id}.png"
    file_path = os.path.join(settings.QR_DIR, filename)
    
    img.save(file_path)
    
    return f"/static/qrcodes/{filename}"
