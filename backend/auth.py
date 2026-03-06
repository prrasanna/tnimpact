"""Authentication utilities and auth endpoints."""

import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
import bcrypt
from dotenv import load_dotenv

import schemas
from database import get_database

load_dotenv()

logger = logging.getLogger(__name__)

# Security configuration.
SECRET_KEY = os.getenv("SECRET_KEY", "change-this-secret-in-production")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

router = APIRouter(prefix="/auth", tags=["Authentication"])


def hash_password(password: str) -> str:
    """Hash plain text password using bcrypt."""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify user-provided password against hash."""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT token with expiration."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


@router.post("/register", response_model=schemas.UserOut)
async def register_user(payload: schemas.UserCreate):
    """Register a user with a role."""
    db = get_database()
    
    # Check if email already exists
    existing = await db.users.find_one({"email": payload.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create new user document
    user_data = {
        "name": payload.name,
        "email": payload.email,
        "password": hash_password(payload.password),
        "role": payload.role,
    }
    
    result = await db.users.insert_one(user_data)
    user_data["_id"] = str(result.inserted_id)
    
    logger.info("Registered user %s with role %s", payload.email, payload.role)
    return schemas.UserOut(**user_data)


@router.post("/login", response_model=schemas.Token)
async def login(payload: schemas.LoginRequest):
    """Authenticate user and return JWT token."""
    db = get_database()
    
    # Find user by email
    user = await db.users.find_one({"email": payload.email})

    if not user or not verify_password(payload.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    access_token = create_access_token({"sub": user["email"], "role": user["role"]})
    return {"access_token": access_token, "token_type": "bearer"}


async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """Resolve authenticated user from JWT token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: Optional[str] = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError as exc:
        logger.warning("JWT decode failed: %s", exc)
        raise credentials_exception from exc

    db = get_database()
    user = await db.users.find_one({"email": email})
    if user is None:
        raise credentials_exception
    return user


def require_role(*allowed_roles: str):
    """Dependency factory for role-based access control."""

    async def role_checker(current_user: dict = Depends(get_current_user)):
        if current_user["role"] not in allowed_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user

    return role_checker
