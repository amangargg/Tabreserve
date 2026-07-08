from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.models import Table, Restaurant, User
from app.schemas import schemas
from app.core import security

router = APIRouter(prefix="/tables", tags=["Tables"])

@router.post("", response_model=schemas.TableResponse)
def create_table(
    restaurant_id: int,
    table_in: schemas.TableCreate,
    current_user: User = Depends(security.get_current_owner),
    db: Session = Depends(get_db)
):
    # Verify owner owns the restaurant
    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found.")
        
    if restaurant.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to add tables to this restaurant.")
        
    table = Table(
        restaurant_id=restaurant_id,
        table_number=table_in.table_number,
        capacity=table_in.capacity,
        type=table_in.type.lower(),
        status="available"
    )
    db.add(table)
    db.commit()
    db.refresh(table)
    return table

@router.get("", response_model=List[schemas.TableResponse])
def list_tables(restaurant_id: int, db: Session = Depends(get_db)):
    return db.query(Table).filter(Table.restaurant_id == restaurant_id).all()

@router.delete("/{table_id}")
def delete_table(
    table_id: int,
    current_user: User = Depends(security.get_current_owner),
    db: Session = Depends(get_db)
):
    table = db.query(Table).filter(Table.id == table_id).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found.")
        
    restaurant = db.query(Restaurant).filter(Restaurant.id == table.restaurant_id).first()
    if restaurant.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to delete tables from this restaurant.")
        
    db.delete(table)
    db.commit()
    return {"message": "Table deleted successfully."}
