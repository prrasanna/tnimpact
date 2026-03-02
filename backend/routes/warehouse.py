"""Warehouse routes for packing operations."""

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from auth import get_current_user, require_role
from database import get_db
from voice import speak_text

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/warehouse", tags=["Warehouse"])


@router.get("/pending", response_model=list[schemas.ProductOut])
def get_pending_products(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("warehouse")),
):
    """Get pending products assigned to logged-in warehouse staff."""
    return (
        db.query(models.Product)
        .filter(
            models.Product.warehouse_assigned == current_user.name,
            models.Product.status == "created",
        )
        .order_by(models.Product.created_at.asc())
        .all()
    )


@router.put("/mark-packed/{order_id}", response_model=schemas.ProductOut)
def mark_order_packed(
    order_id: str,
    db: Session = Depends(get_db),
    _current_user: models.User = Depends(require_role("warehouse")),
):
    """Mark assigned order as packed and notify delivery workflow."""
    product = db.query(models.Product).filter(models.Product.order_id == order_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Order not found")

    if product.status in {"packed", "out_for_delivery", "delivered"}:
        raise HTTPException(status_code=400, detail=f"Order already in status {product.status}")

    product.status = "packed"
    db.commit()
    db.refresh(product)

    logger.info("Warehouse marked order %s as packed", order_id)

    speak_text(
        f"Order {product.order_id} is packed and ready for delivery.",
        language="en",
    )

    return product
