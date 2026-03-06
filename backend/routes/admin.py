"""Admin routes for product management."""

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from auth import require_role
from database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["Admin"])


def _create_product(payload: schemas.ProductCreate, db: Session) -> models.Product:
    existing = db.query(models.Product).filter(models.Product.order_id == payload.order_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Order ID already exists")

    product = models.Product(
        order_id=payload.order_id,
        product_name=payload.product_name,
        destination=payload.destination,
        warehouse_assigned=payload.warehouse_assigned,
        delivery_person_assigned=payload.delivery_person_assigned,
        delivery_person_phone=payload.delivery_person_phone,
        status="created",
    )

    db.add(product)
    db.commit()
    db.refresh(product)

    logger.info("Admin added product %s", product.order_id)

    return product


def _get_dashboard_stats(products: list[models.Product]) -> schemas.AdminStatsOut:
    pending = [product for product in products if product.status != "delivered"]
    active_drivers = {
        product.delivery_person_assigned.strip()
        for product in pending
        if product.delivery_person_assigned and product.delivery_person_assigned.strip()
    }
    return schemas.AdminStatsOut(
        total_orders=len(products),
        pending_deliveries=len(pending),
        active_drivers=len(active_drivers),
    )


@router.post("/add-product", response_model=schemas.ProductOut)
def add_product(
    payload: schemas.ProductCreate,
    db: Session = Depends(get_db),
    _current_user: models.User = Depends(require_role("admin")),
):
    """Add product/order."""
    return _create_product(payload=payload, db=db)


@router.get("/all-products", response_model=list[schemas.ProductOut])
def get_all_products(
    db: Session = Depends(get_db),
    _current_user: models.User = Depends(require_role("admin")),
):
    """Fetch all products/orders."""
    return db.query(models.Product).order_by(models.Product.created_at.desc()).all()


@router.get("/dashboard-data", response_model=schemas.AdminDashboardOut)
def get_dashboard_data(db: Session = Depends(get_db)):
    """Fetch real-time dashboard stats and orders from database."""
    products = db.query(models.Product).order_by(models.Product.created_at.desc()).all()
    return schemas.AdminDashboardOut(
        stats=_get_dashboard_stats(products),
        products=products,
    )


@router.post("/dashboard/add-product", response_model=schemas.ProductOut)
def add_dashboard_product(payload: schemas.ProductCreate, db: Session = Depends(get_db)):
    """Add product for admin dashboard flow without auth token dependency."""
    return _create_product(payload=payload, db=db)
