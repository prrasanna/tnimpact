"""Admin routes for product management."""

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from auth import require_role
from database import get_db
from voice import speak_text

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.post("/add-product", response_model=schemas.ProductOut)
def add_product(
    payload: schemas.ProductCreate,
    db: Session = Depends(get_db),
    _current_user: models.User = Depends(require_role("admin")),
):
    """Add product/order and trigger assignment voice notification."""
    existing = db.query(models.Product).filter(models.Product.order_id == payload.order_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Order ID already exists")

    product = models.Product(
        order_id=payload.order_id,
        product_name=payload.product_name,
        destination=payload.destination,
        warehouse_assigned=payload.warehouse_assigned,
        delivery_person_assigned=payload.delivery_person_assigned,
        status="created",
    )

    db.add(product)
    db.commit()
    db.refresh(product)

    logger.info("Admin added product %s", product.order_id)

    speak_text(
        (
            f"New delivery assigned. Order ID {product.order_id}. "
            f"Deliver to {product.destination}."
        ),
        language="en",
    )

    return product


@router.get("/all-products", response_model=list[schemas.ProductOut])
def get_all_products(
    db: Session = Depends(get_db),
    _current_user: models.User = Depends(require_role("admin")),
):
    """Fetch all products/orders."""
    return db.query(models.Product).order_by(models.Product.created_at.desc()).all()
