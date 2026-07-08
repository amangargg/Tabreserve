import datetime
from sqlalchemy.orm import Session
from app.db.database import SessionLocal, Base, engine
from app.models import models
from app.core import security

def seed_database():
    db: Session = SessionLocal()
    
    # 1. Create tables if not exist
    Base.metadata.create_all(bind=engine)
    
    # Check if database is already seeded
    if db.query(models.User).count() > 0:
        print("Database already seeded.")
        db.close()
        return

    print("Seeding database...")

    # 2. Create Users
    admin_pwd = security.get_password_hash("admin123")
    owner_pwd = security.get_password_hash("owner123")
    cust_pwd = security.get_password_hash("customer123")

    admin = models.User(
        name="System Admin",
        email="admin@gmail.com",
        password_hash=admin_pwd,
        role="admin",
        is_verified=True
    )
    owner = models.User(
        name="Restaurant Owner",
        email="owner@gmail.com",
        password_hash=owner_pwd,
        role="owner",
        is_verified=True
    )
    customer = models.User(
        name="Diner Customer",
        email="customer@gmail.com",
        password_hash=cust_pwd,
        role="customer",
        is_verified=True
    )

    db.add_all([admin, owner, customer])
    db.commit()
    db.refresh(owner)

    # 3. Create Restaurants
    rest1 = models.Restaurant(
        owner_id=owner.id,
        name="Landour Bakery House",
        address="Mussoorie, Uttarakhand",
        cuisine="Bakery & Continental",
        opening_time=datetime.time(10, 0),
        closing_time=datetime.time(22, 0),
        rating=4.8,
        description="A heritage bakery serving warm cinnamon rolls, apple pies, artisanal coffee, and fresh pancakes with Mussoorie view.",
        image_url="https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=600"
    )
    
    rest2 = models.Restaurant(
        owner_id=owner.id,
        name="The Italian Trattoria",
        address="Connaught Place, Delhi",
        cuisine="Italian",
        opening_time=datetime.time(12, 0),
        closing_time=datetime.time(23, 0),
        rating=4.5,
        description="Authentic woodfired neapolitan pizzas, handmade pastas, and classic tiramisu in a cozy brick-wall ambiance.",
        image_url="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=600"
    )

    db.add_all([rest1, rest2])
    db.commit()
    db.refresh(rest1)
    db.refresh(rest2)

    # 4. Create Tables for Restaurants
    # For Restaurant 1
    tables_r1 = [
        models.Table(restaurant_id=rest1.id, table_number="101", capacity=2, type="indoor"),
        models.Table(restaurant_id=rest1.id, table_number="102", capacity=4, type="indoor"),
        models.Table(restaurant_id=rest1.id, table_number="103", capacity=6, type="outdoor"),
        models.Table(restaurant_id=rest1.id, table_number="104", capacity=2, type="outdoor"),
        models.Table(restaurant_id=rest1.id, table_number="VIP-1", capacity=4, type="vip"),
    ]
    
    # For Restaurant 2
    tables_r2 = [
        models.Table(restaurant_id=rest2.id, table_number="201", capacity=2, type="indoor"),
        models.Table(restaurant_id=rest2.id, table_number="202", capacity=4, type="indoor"),
        models.Table(restaurant_id=rest2.id, table_number="203", capacity=4, type="indoor"),
        models.Table(restaurant_id=rest2.id, table_number="204", capacity=8, type="outdoor"),
        models.Table(restaurant_id=rest2.id, table_number="VIP-2", capacity=6, type="vip"),
    ]

    db.add_all(tables_r1 + tables_r2)
    db.commit()
    
    print("Database seeding completed successfully!")
    print("\nDefault logins:")
    print("  Customer: customer@gmail.com  (pass: customer123)")
    print("  Owner:    owner@gmail.com     (pass: owner123)")
    print("  Admin:    admin@gmail.com     (pass: admin123)")
    
    db.close()

if __name__ == "__main__":
    seed_database()
