"""Check all users in database."""
import asyncio
import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "voice_logistics")

async def check_users():
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DATABASE_NAME]
    
    users = await db.users.find().to_list(length=100)
    
    print(f"\n📊 All users in {DATABASE_NAME} database:\n")
    for user in users:
        print(f"  Name: {user.get('name')}")
        print(f"  Email: {user.get('email')}")
        print(f"  Role: {user.get('role')}")
        print(f"  ID: {user.get('_id')}")
        print("-" * 50)
    
    print(f"\nTotal: {len(users)} users\n")
    client.close()

asyncio.run(check_users())
