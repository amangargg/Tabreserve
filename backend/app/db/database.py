import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings

def get_engine_and_db():
    db_url = settings.DATABASE_URL
    is_sqlite = db_url.startswith("sqlite")
    connect_args = {"check_same_thread": False} if is_sqlite else {}
    
    # Try standard engine creation
    test_engine = create_engine(db_url, connect_args=connect_args, pool_pre_ping=True)
    
    if not is_sqlite:
        try:
            # Test connection immediately
            conn = test_engine.connect()
            conn.close()
            return test_engine
        except Exception as e:
            print(f"\n[WARNING] Database connection to {db_url} failed: {e}")
            print("[INFO] Falling back to local SQLite database: sqlite:///./restaurant_booking.db\n")
            fallback_url = "sqlite:///./restaurant_booking.db"
            return create_engine(fallback_url, connect_args={"check_same_thread": False}, pool_pre_ping=True)
            
    return test_engine

engine = get_engine_and_db()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# FastAPI Dependency
def get_db():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
