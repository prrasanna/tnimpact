"""Database configuration for Voice-Enabled Logistics Assistant backend."""

import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# MongoDB configuration
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "voice_logistics")

# MongoDB client instance (will be initialized in main.py)
mongodb_client: AsyncIOMotorClient = None
database = None


async def connect_to_mongodb():
    """Initialize MongoDB connection."""
    global mongodb_client, database
    try:
        mongodb_client = AsyncIOMotorClient(MONGODB_URL)
        database = mongodb_client[DATABASE_NAME]
        # Test connection
        await mongodb_client.admin.command('ping')
        print(f"✅ Connected to MongoDB: {DATABASE_NAME}")
    except Exception as e:
        print(f"❌ Failed to connect to MongoDB: {e}")
        raise


async def close_mongodb_connection():
    """Close MongoDB connection."""
    global mongodb_client
    if mongodb_client:
        mongodb_client.close()
        print("🔌 Closed MongoDB connection")


def get_database():
    """Get database instance for dependency injection."""
    return database
