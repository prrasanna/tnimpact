"""Admin routes for product management."""

import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException

import schemas
from auth import require_role
from database import get_database

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["Admin"])


async def _create_product(payload: schemas.ProductCreate) -> dict:
    db = get_database()
    
    # Check if order_id already exists
    existing = await db.products.find_one({"order_id": payload.order_id})
    if existing:
        raise HTTPException(status_code=400, detail="Order ID already exists")

    product_data = {
        "order_id": payload.order_id,
        "product_name": payload.product_name,
        "destination": payload.destination,
        "warehouse_assigned": payload.warehouse_assigned,
        "delivery_person_assigned": payload.delivery_person_assigned,
        "delivery_person_phone": payload.delivery_person_phone,
        "status": "created",
        "created_at": datetime.utcnow(),
        "packed_at": None,
        "delivered_at": None,
        "delivery_notes": payload.delivery_notes,
        "special_instructions": payload.special_instructions,
    }

    result = await db.products.insert_one(product_data)
    product_data["_id"] = str(result.inserted_id)

    logger.info("Admin added product %s", product_data["order_id"])

    return product_data


def _get_dashboard_stats(products: list[dict]) -> schemas.AdminStatsOut:
    pending = [product for product in products if product["status"] != "delivered"]
    active_drivers = {
        product["delivery_person_assigned"].strip()
        for product in pending
        if product.get("delivery_person_assigned") and product["delivery_person_assigned"].strip()
    }
    return schemas.AdminStatsOut(
        total_orders=len(products),
        pending_deliveries=len(pending),
        active_drivers=len(active_drivers),
    )


@router.post("/add-product", response_model=schemas.ProductOut)
async def add_product(
    payload: schemas.ProductCreate,
    _current_user: dict = Depends(require_role("admin")),
):
    """Add product/order."""
    product = await _create_product(payload=payload)
    return schemas.ProductOut(**product)


@router.get("/all-products", response_model=list[schemas.ProductOut])
async def get_all_products(
    _current_user: dict = Depends(require_role("admin")),
):
    """Fetch all products/orders."""
    db = get_database()
    products = await db.products.find().sort("created_at", -1).to_list(length=1000)
    
    # Convert ObjectId to string
    for product in products:
        product["_id"] = str(product["_id"])
    
    return [schemas.ProductOut(**product) for product in products]


@router.get("/dashboard-data", response_model=schemas.AdminDashboardOut)
async def get_dashboard_data():
    """Fetch real-time dashboard stats and orders from database."""
    db = get_database()
    products = await db.products.find().sort("created_at", -1).to_list(length=1000)
    
    # Convert ObjectId to string
    for product in products:
        product["_id"] = str(product["_id"])
    
    return schemas.AdminDashboardOut(
        stats=_get_dashboard_stats(products),
        products=[schemas.ProductOut(**product) for product in products],
    )


@router.post("/dashboard/add-product", response_model=schemas.ProductOut)
async def add_dashboard_product(payload: schemas.ProductCreate):
    """Add product for admin dashboard flow without auth token dependency."""
    product = await _create_product(payload=payload)
    return schemas.ProductOut(**product)
