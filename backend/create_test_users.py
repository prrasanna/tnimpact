"""
Script to create test users in MongoDB.
Run this to populate the users collection.
"""

import asyncio
import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
import bcrypt

# Load environment variables
load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "voice_logistics")


def hash_password(password: str) -> str:
    """Hash password using bcrypt."""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


async def create_test_users():
    """Create test users for all three roles."""
    
    print(f"\n🔗 Connecting to MongoDB...")
    print(f"📍 URL: {MONGODB_URL}")
    print(f"📦 Database: {DATABASE_NAME}\n")
    
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DATABASE_NAME]
    
    try:
        # Test connection
        await client.admin.command('ping')
        print("✅ Connected to MongoDB!\n")
        
        # Test users data
        test_users = [
            {
                "name": "Admin User",
                "email": "admin@example.com",
                "password": hash_password("admin123"),
                "role": "admin"
            },
            {
                "name": "Warehouse Manager",
                "email": "warehouse@example.com",
                "password": hash_password("warehouse123"),
                "role": "warehouse"
            },
            {
                "name": "Delivery Person",
                "email": "delivery@example.com",
                "password": hash_password("delivery123"),
                "role": "delivery"
            }
        ]
        
        print("👥 Creating test users...\n")
        
        for user in test_users:
            # Check if user already exists
            existing = await db.users.find_one({"email": user["email"]})
            
            if existing:
                print(f"⚠️  User {user['email']} already exists - skipping")
            else:
                result = await db.users.insert_one(user)
                print(f"✅ Created user: {user['email']} (role: {user['role']})")
                print(f"   Password: {user['email'].split('@')[0]}123")
        
        # Show all users
        print(f"\n📊 Total users in database:")
        users = await db.users.find().to_list(length=100)
        print(f"   Found {len(users)} users\n")
        
        for user in users:
            print(f"   • {user['name']} ({user['email']}) - Role: {user['role']}")
        
        # Show collections
        print(f"\n📂 Collections in {DATABASE_NAME}:")
        collections = await db.list_collection_names()
        for coll in collections:
            count = await db[coll].count_documents({})
            print(f"   • {coll}: {count} documents")
        
        print("\n✨ Setup complete! You can now:")
        print("   1. Start the backend server: uvicorn main:app --reload")
        print("   2. Login with any of the test accounts above")
        print("   3. Refresh MongoDB Compass to see the 'users' collection\n")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(create_test_users())
