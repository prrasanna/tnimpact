"""Delivery routes for assigned deliveries."""

import logging
import re
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException

import schemas
from auth import require_role
from database import get_database

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/delivery", tags=["Delivery"])


@router.get("/my-orders", response_model=list[schemas.ProductOut])
async def get_my_orders(
    current_user: dict = Depends(require_role("delivery")),
):
    """Get orders assigned to logged-in delivery person."""
    db = get_database()

    user_name = (current_user.get("name") or "").strip()
    user_email = (current_user.get("email") or "").strip().lower()
    email_local = user_email.split("@", 1)[0] if "@" in user_email else user_email

    assignment_filters = []
    if user_name:
        assignment_filters.append(
            {
                "delivery_person_assigned": {
                    "$regex": f"^{re.escape(user_name)}$",
                    "$options": "i",
                }
            }
        )

    if email_local:
        readable_local = re.sub(r"[._-]+", " ", email_local).strip()
        if readable_local:
            assignment_filters.append(
                {
                    "delivery_person_assigned": {
                        "$regex": f"^{re.escape(readable_local)}$",
                        "$options": "i",
                    }
                }
            )

    if not assignment_filters:
        return []

    products = await db.products.find({
        "$or": assignment_filters
    }).sort("created_at", 1).to_list(length=1000)
    
    # Convert ObjectId to string
    for product in products:
        product["_id"] = str(product["_id"])
    
    return [schemas.ProductOut(**product) for product in products]


@router.put("/mark-delivered/{order_id}", response_model=schemas.ProductOut)
async def mark_order_delivered(
    order_id: str,
    _current_user: dict = Depends(require_role("delivery")),
):
    """Mark order as delivered by order ID."""
    db = get_database()
    product = await db.products.find_one({"order_id": order_id})
    if not product:
        raise HTTPException(status_code=404, detail="Order not found")

    if product["status"] == "delivered":
        raise HTTPException(status_code=400, detail="Order already delivered")

    if product["status"] not in {"packed", "out_for_delivery"}:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot mark delivered from status {product['status']}",
        )

    # Update status
    await db.products.update_one(
        {"order_id": order_id},
        {
            "$set": {
                "status": "delivered",
                "delivered_at": datetime.utcnow(),
            }
        }
    )
    
    # Fetch updated product
    product = await db.products.find_one({"order_id": order_id})
    product["_id"] = str(product["_id"])

    logger.info("Delivery marked order %s as delivered", order_id)
    return schemas.ProductOut(**product)
