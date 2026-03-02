"""Delivery routes for assigned deliveries."""

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from auth import require_role
from database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/delivery", tags=["Delivery"])


@router.get("/my-orders", response_model=list[schemas.ProductOut])
def get_my_orders(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("delivery")),
):
    """Get orders assigned to logged-in delivery person."""
    return (
        db.query(models.Product)
        .filter(models.Product.delivery_person_assigned == current_user.name)
        .order_by(models.Product.created_at.asc())
        .all()
    )


@router.put("/mark-delivered/{order_id}", response_model=schemas.ProductOut)
def mark_order_delivered(
    order_id: str,
    db: Session = Depends(get_db),
    _current_user: models.User = Depends(require_role("delivery")),
):
    """Mark order as delivered by order ID."""
    product = db.query(models.Product).filter(models.Product.order_id == order_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Order not found")

    if product.status == "delivered":
        raise HTTPException(status_code=400, detail="Order already delivered")

    product.status = "delivered"
    db.commit()
    db.refresh(product)

    logger.info("Delivery marked order %s as delivered", order_id)
    return product
