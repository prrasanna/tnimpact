"""Warehouse routes for packing operations."""

import logging
import re
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException

import schemas
from auth import require_role
from database import get_database

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/warehouse", tags=["Warehouse"])


@router.get("/pending", response_model=list[schemas.ProductOut])
async def get_pending_products(
    current_user: dict = Depends(require_role("warehouse")),
):
    """Get pending products assigned to logged-in warehouse staff."""
    db = get_database()

    # Support both person-based and location-based warehouse assignment values.
    user_name = (current_user.get("name") or "").strip()
    user_email = (current_user.get("email") or "").strip().lower()
    email_local = user_email.split("@", 1)[0] if "@" in user_email else user_email

    assignment_filters = []
    if user_name:
        assignment_filters.append(
            {
                "warehouse_assigned": {
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
                    "warehouse_assigned": {
                        "$regex": f"^{re.escape(readable_local)}$",
                        "$options": "i",
                    }
                }
            )

    # Many seed datasets store labels like "Warehouse A" instead of person names.
    assignment_filters.append(
        {
            "warehouse_assigned": {
                "$regex": r"^warehouse\b",
                "$options": "i",
            }
        }
    )

    products = await db.products.find(
        {
            "status": {"$in": ["created", "picked", "packed"]},
            "$or": assignment_filters,
        }
    ).sort("created_at", 1).to_list(length=1000)
    
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

    if product["status"] not in {"created", "picked"}:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot mark packed from status {product['status']}",
        )

    # Update status
    await db.products.update_one(
        {"order_id": order_id},
        {
            "$set": {
                "status": "packed",
                "packed_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
            }
        }
    )
    
    # Fetch updated product
    product = await db.products.find_one({"order_id": order_id})
    product["_id"] = str(product["_id"])

    logger.info("Warehouse marked order %s as packed", order_id)

    return schemas.ProductOut(**product)


@router.put("/mark-picked/{order_id}", response_model=schemas.ProductOut)
async def mark_order_picked(
    order_id: str,
    _current_user: dict = Depends(require_role("warehouse")),
):
    """Mark assigned order as picked (first step in warehouse workflow)."""
    db = get_database()
    product = await db.products.find_one({"order_id": order_id})
    if not product:
        raise HTTPException(status_code=404, detail="Order not found")

    if product["status"] != "created":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot mark picked from status {product['status']}",
        )

    # Update status
    await db.products.update_one(
        {"order_id": order_id},
        {
            "$set": {
                "status": "picked",
                "updated_at": datetime.utcnow(),
            }
        }
    )
    
    # Fetch updated product
    product = await db.products.find_one({"order_id": order_id})
    product["_id"] = str(product["_id"])

    logger.info("Warehouse marked order %s as picked", order_id)

    return schemas.ProductOut(**product)
