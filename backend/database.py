"""Database configuration for Voice-Enabled Logistics Assistant backend."""

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# SQLite database URL.
DATABASE_URL = "sqlite:///./voice_logistics.db"

# SQLite engine with thread check disabled for FastAPI compatibility.
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

# Session factory for dependency injection.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Declarative base for ORM models.
Base = declarative_base()


def get_db():
    """Provide a transactional database session for each request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
