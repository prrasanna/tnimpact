"""
Test script to verify MongoDB connection.

Run this before starting the main application to ensure
your MongoDB connection is properly configured.
"""

import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

async def test_mongodb_connection():
    """Test MongoDB connection and basic operations."""
    
    mongodb_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    database_name = os.getenv("DATABASE_NAME", "voice_logistics")
    
    print(f"\n🔍 Testing MongoDB connection...")
    print(f"📍 URL: {mongodb_url}")
    print(f"📦 Database: {database_name}\n")
    
    try:
        # Create client
        client = AsyncIOMotorClient(mongodb_url)
        
        # Test connection with ping
        await client.admin.command('ping')
        print("✅ Successfully connected to MongoDB!")
        
        # Get database
        db = client[database_name]
        
        # List collections
        collections = await db.list_collection_names()
        print(f"\n📂 Existing collections: {collections if collections else 'None (fresh database)'}")
        
        # Test write operation
        test_collection = db.test_connection
        test_doc = {"test": "connection", "timestamp": "now"}
        await test_collection.insert_one(test_doc)
        print("✅ Write operation successful!")
        
        # Test read operation
        found = await test_collection.find_one({"test": "connection"})
        if found:
            print("✅ Read operation successful!")
        
        # Cleanup test document
        await test_collection.delete_many({"test": "connection"})
        print("✅ Cleanup successful!")
        
        print("\n✨ All tests passed! Your MongoDB setup is ready to use.\n")
        
    except Exception as e:
        print(f"\n❌ Connection failed: {e}")
        print("\n💡 Tips:")
        print("   1. Check if MongoDB is running (for local installation)")
        print("   2. Verify your MONGODB_URL in .env file")
        print("   3. For MongoDB Atlas, check:")
        print("      - Network Access (whitelist your IP)")
        print("      - Database Access (user permissions)")
        print("      - Connection string format")
        print("\n")
        return False
    
    finally:
        client.close()
    
    return True


if __name__ == "__main__":
    asyncio.run(test_mongodb_connection())
