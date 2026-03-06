"""Pydantic request and response schemas."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    """Schema to register a new user."""

    name: str
    email: EmailStr
    password: str
    role: Literal["admin", "warehouse", "delivery"]


class UserOut(BaseModel):
    """Schema returned for user data."""

    id: int
    name: str
    email: EmailStr
    role: str

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    """Schema for JSON-based login payload."""

    email: EmailStr
    password: str


class Token(BaseModel):
    """JWT token response schema."""

    access_token: str
    token_type: str


class ProductCreate(BaseModel):
    """Schema for admin product creation."""

    order_id: str
    product_name: str
    destination: str
    warehouse_assigned: str
    delivery_person_assigned: str
    delivery_person_phone: str


class ProductOut(BaseModel):
    """Schema returned for product entries."""

    id: int
    order_id: str
    product_name: str
    destination: str
    warehouse_assigned: str
    delivery_person_assigned: str
    delivery_person_phone: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class VoiceCommandRequest(BaseModel):
    """Schema for processing free-form voice commands."""

    command: str


class AdminStatsOut(BaseModel):
    """Summary stats for admin dashboard."""

    total_orders: int
    pending_deliveries: int
    active_drivers: int


class AdminDashboardOut(BaseModel):
    """Database-backed payload for admin dashboard."""

    stats: AdminStatsOut
    products: list[ProductOut]
