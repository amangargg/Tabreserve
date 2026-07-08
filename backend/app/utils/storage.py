import os
import uuid
import shutil
from fastapi import UploadFile
from app.core.config import settings

def save_image(file: UploadFile) -> str:
    # Check if Cloudinary is configured
    if settings.CLOUDINARY_CLOUD_NAME and settings.CLOUDINARY_API_KEY and settings.CLOUDINARY_API_SECRET:
        try:
            import cloudinary
            import cloudinary.uploader
            
            cloudinary.config(
                cloud_name=settings.CLOUDINARY_CLOUD_NAME,
                api_key=settings.CLOUDINARY_API_KEY,
                api_secret=settings.CLOUDINARY_API_SECRET
            )
            
            result = cloudinary.uploader.upload(file.file)
            return result.get("secure_url")
        except Exception as e:
            print(f"Cloudinary upload failed: {e}. Falling back to local upload.")
            
    # Fallback to local storage
    filename = f"{uuid.uuid4()}_{file.filename}"
    file_path = os.path.join(settings.UPLOAD_DIR, filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Return path relative to the server
    return f"/static/uploads/{filename}"
