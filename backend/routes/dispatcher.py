"""Dispatcher routes for monitoring all shipments."""

import logging

from fastapi import APIRouter, Depends

import schemas
from auth import require_role
from database import get_database

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/dispatcher", tags=["Dispatcher"])


@router.get("/orders", response_model=list[schemas.ProductOut])
async def get_all_orders(
    current_user: dict = Depends(require_role("dispatcher")),
):
    """Get all orders for monitoring (read-only access)."""
    db = get_database()

    # Fetch all products, sorted by creation date (newest first)
    products = await db.products.find({}).sort("created_at", -1).to_list(length=1000)
    
    # Convert ObjectId to string
    for product in products:
        product["_id"] = str(product["_id"])
    
    return [schemas.ProductOut(**product) for product in products]


@router.get("/dashboard-data")
async def get_dispatcher_dashboard_data(
    current_user: dict = Depends(require_role("dispatcher")),
):
    """Get dashboard statistics and alerts for dispatcher."""
    db = get_database()
    
    # Count orders by status
    total_orders = await db.products.count_documents({})
    created = await db.products.count_documents({"status": "created"})
    picked = await db.products.count_documents({"status": "picked"})
    packed = await db.products.count_documents({"status": "packed"})
    out_for_delivery = await db.products.count_documents({"status": "out_for_delivery"})
    delivered = await db.products.count_documents({"status": "delivered"})
    
    # For now, alerts are placeholder - these would be based on business logic
    # Such as: orders created more than 24h ago, delivery time exceeded, etc.
    alerts = {
        "delivery_delayed": 0,  # Could be calculated based on created_at timestamps
        "package_damaged": 0,   # Would require additional tracking fields
        "customer_not_available": 0,  # Would require delivery attempt tracking
    }
    
    return {
        "total_orders": total_orders,
        "status_breakdown": {
            "created": created,
            "picked": picked,
            "packed": packed,
            "out_for_delivery": out_for_delivery,
            "delivered": delivered,
        },
        "alerts": alerts,
    }
