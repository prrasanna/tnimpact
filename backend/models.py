"""MongoDB document models using Pydantic."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from bson import ObjectId


class PyObjectId(ObjectId):
    """Custom ObjectId type for Pydantic."""
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, field_schema):
        field_schema.update(type="string")


class User(BaseModel):
    """Application user model with role-based access."""
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    name: str = Field(..., max_length=100)
    email: EmailStr = Field(..., unique=True)
    password: str = Field(..., max_length=255)
    role: str = Field(..., max_length=50)

    class Config:
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
        populate_by_name = True


class Product(BaseModel):
    """Product/order model tracked through logistics lifecycle."""
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    order_id: str = Field(..., max_length=100, unique=True)
    product_name: str = Field(..., max_length=255)
    destination: str = Field(..., max_length=255)
    warehouse_assigned: str = Field(..., max_length=255)
    delivery_person_assigned: str = Field(..., max_length=255)
    delivery_person_phone: str = Field(default="", max_length=50)
    status: str = Field(default="created", max_length=50)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
        populate_by_name = True
