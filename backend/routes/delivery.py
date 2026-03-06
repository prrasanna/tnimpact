"""Delivery routes for assigned deliveries."""

import logging

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
    products = await db.products.find({
        "delivery_person_assigned": current_user["name"]
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

    # Update status
    await db.products.update_one(
        {"order_id": order_id},
        {"$set": {"status": "delivered"}}
    )
    
    # Fetch updated product
    product = await db.products.find_one({"order_id": order_id})
    product["_id"] = str(product["_id"])

    logger.info("Delivery marked order %s as delivered", order_id)
    return schemas.ProductOut(**product)
