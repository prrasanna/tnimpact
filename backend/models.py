"""SQLAlchemy ORM models."""

from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String

from database import Base


class User(Base):
    """Application user model with role-based access."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, index=True)


class Product(Base):
    """Product/order model tracked through logistics lifecycle."""

    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(String(100), unique=True, nullable=False, index=True)
    product_name = Column(String(255), nullable=False)
    destination = Column(String(255), nullable=False)
    warehouse_assigned = Column(String(255), nullable=False)
    delivery_person_assigned = Column(String(255), nullable=False)
    delivery_person_phone = Column(String(50), nullable=False, default="")
    status = Column(String(50), nullable=False, default="created", index=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
