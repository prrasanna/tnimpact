"""Pydantic request and response schemas."""

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    """Schema to register a new user."""

    name: str
    email: EmailStr
    password: str
    role: Literal["admin", "warehouse", "delivery", "dispatcher"]


class UserOut(BaseModel):
    """Schema returned for user data."""

    id: Optional[str] = Field(default=None, alias="_id")
    name: str
    email: EmailStr
    role: str

    class Config:
        populate_by_name = True


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
    customer_name: str
    customer_phone: str
    customer_email: str = ""
    source_location: str = ""
    special_instructions: str = ""
    delivery_notes: str = ""


class ProductOut(BaseModel):
    """Schema returned for product entries."""

    id: Optional[str] = Field(default=None, alias="_id")
    order_id: str
    product_name: str
    destination: str
    warehouse_assigned: str
    delivery_person_assigned: str
    delivery_person_phone: str = ""
    customer_name: str = ""
    customer_phone: str = ""
    customer_email: str = ""
    source_location: str = ""
    delivery_start_location: str = ""
    delivery_started_at: Optional[datetime] = None
    status: Literal[
        "created",
        "picked",
        "packed",
        "out_for_delivery",
        "delivered",
        "cancelled",
        "returned",
        "failed",
    ]
    created_at: datetime
    updated_at: Optional[datetime] = None
    packed_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    delivery_notes: str = ""
    special_instructions: str = ""

    class Config:
        populate_by_name = True


class ProductAdminDetailsUpdate(BaseModel):
    """Schema for admin updates to order detail fields."""

    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    source_location: Optional[str] = None
    delivery_start_location: Optional[str] = None
    delivery_started_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    special_instructions: Optional[str] = None
    delivery_notes: Optional[str] = None


class VoiceCommandRequest(BaseModel):
    """Schema for processing free-form voice commands.
    
    Note: user_role and user_name are now obtained from JWT token,
    not from the request body.
    """

    command: str
    current_location: str = ""


class VoiceCommandResponse(BaseModel):
    """Schema returned for unified voice command processing."""

    response: str
    intent: str
    action_performed: bool
    order_id: Optional[str] = None


class SpeakRequest(BaseModel):
    """Schema for simple text-to-speech endpoint."""

    command: str
    language: str = "en"


class StatusUpdate(BaseModel):
    """Schema for updating order status."""

    status: Literal[
        "created",
        "picked",
        "packed",
        "out_for_delivery",
        "delivered",
        "cancelled",
        "returned",
        "failed",
    ]
    current_location: str = ""


class AdminStatsOut(BaseModel):
    """Summary stats for admin dashboard."""

    total_orders: int
    pending_deliveries: int
    active_drivers: int
    delivered_orders: int


class AdminDashboardOut(BaseModel):
    """Database-backed payload for admin dashboard."""

    stats: AdminStatsOut
    products: list[ProductOut]
