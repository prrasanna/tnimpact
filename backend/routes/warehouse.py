"""Warehouse routes for packing operations."""

import logging

from fastapi import APIRouter, Depends, HTTPException

import schemas
from auth import require_role
from database import get_database
from voice import speak_text

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/warehouse", tags=["Warehouse"])


@router.get("/pending", response_model=list[schemas.ProductOut])
async def get_pending_products(
    current_user: dict = Depends(require_role("warehouse")),
):
    """Get pending products assigned to logged-in warehouse staff."""
    db = get_database()
    products = await db.products.find({
        "warehouse_assigned": current_user["name"],
        "status": "created"
    }).sort("created_at", 1).to_list(length=1000)
    
    # Convert ObjectId to string
    for product in products:
        product["_id"] = str(product["_id"])
    
    return [schemas.ProductOut(**product) for product in products]


@router.put("/mark-packed/{order_id}", response_model=schemas.ProductOut)
async def mark_order_packed(
    order_id: str,
    _current_user: dict = Depends(require_role("warehouse")),
):
    """Mark assigned order as packed and notify delivery workflow."""
    db = get_database()
    product = await db.products.find_one({"order_id": order_id})
    if not product:
        raise HTTPException(status_code=404, detail="Order not found")

    if product["status"] in {"packed", "out_for_delivery", "delivered"}:
        raise HTTPException(status_code=400, detail=f"Order already in status {product['status']}")

    # Update status
    await db.products.update_one(
        {"order_id": order_id},
        {"$set": {"status": "packed"}}
    )
    
    # Fetch updated product
    product = await db.products.find_one({"order_id": order_id})
    product["_id"] = str(product["_id"])

    logger.info("Warehouse marked order %s as packed", order_id)

    speak_text(
        f"Order {product['order_id']} is packed and ready for delivery.",
        language="en",
    )

    return schemas.ProductOut(**product)
