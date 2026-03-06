# MongoDB Setup Guide

## ✅ What Has Been Implemented

Your backend has been successfully migrated from SQLite to MongoDB! Here's what was done:

### 1. **Updated Dependencies** (requirements.txt)
- Added `motor` - Async MongoDB driver for Python
- Added `pymongo` - MongoDB Python driver
- Added `pydantic-settings` - For settings management
- Added `python-dotenv` - For environment variable management
- Removed `sqlalchemy` (replaced with MongoDB)

### 2. **Created Environment Files**
- `.env` - Your actual environment variables (update this with your MongoDB connection string)
- `.env.example` - Template for others to use

### 3. **Updated Core Files**
- **database.py** - Now connects to MongoDB using Motor async driver
- **models.py** - Converted from SQLAlchemy to Pydantic models with MongoDB ObjectId support
- **schemas.py** - Updated to use string IDs instead of integer IDs
- **main.py** - Connects to MongoDB on startup and closes connection on shutdown
- **auth.py** - All authentication now uses MongoDB queries
- **routes/admin.py** - Admin routes now use async MongoDB operations
- **routes/warehouse.py** - Warehouse routes now use async MongoDB operations
- **routes/delivery.py** - Delivery routes now use async MongoDB operations

---

## 🚀 What You Need To Do

### Step 1: Install MongoDB

If you don't have MongoDB installed, choose one of these options:

#### Option A: MongoDB Atlas (Cloud - Recommended for beginners)
1. Go to [https://www.mongodb.com/cloud/atlas/register](https://www.mongodb.com/cloud/atlas/register)
2. Create a free account
3. Create a new cluster (Free tier is fine)
4. Click "Connect" and choose "Connect your application"
5. Copy the connection string (looks like: `mongodb+srv://username:password@cluster.mongodb.net/`)

#### Option B: Local MongoDB Installation
1. Download MongoDB Community Server from [https://www.mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)
2. Install and run MongoDB
3. Default connection string: `mongodb://localhost:27017`

### Step 2: Update Your .env File

Open `backend/.env` and update the MongoDB connection string:

```env
# For MongoDB Atlas (Cloud)
MONGODB_URL=mongodb+srv://your_username:your_password@your_cluster.mongodb.net/?retryWrites=true&w=majority

# OR for Local MongoDB
MONGODB_URL=mongodb://localhost:27017

# Database name (you can keep this or change it)
DATABASE_NAME=voice_logistics

# JWT Configuration (IMPORTANT: Change SECRET_KEY in production!)
SECRET_KEY=your-secret-key-here-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

**Important Notes:**
- Replace `your_username`, `your_password`, and `your_cluster` with your actual MongoDB credentials
- For production, generate a strong SECRET_KEY using: `openssl rand -hex 32`

### Step 3: Install Python Dependencies

Run this command in the backend directory:

```bash
cd backend
pip install -r requirements.txt
```

### Step 4: Start Your Backend Server

Run the FastAPI server:

```bash
cd backend
python main.py
```

Or with uvicorn directly:

```bash
uvicorn main:app --reload
```

You should see:
```
✅ Connected to MongoDB: voice_logistics
INFO:     Application startup complete
```

### Step 5: Test Your API

1. Open your browser and go to: `http://localhost:8000/docs`
2. You'll see the FastAPI Swagger UI
3. Try the following endpoints:
   - POST `/auth/register` - Create a new user
   - POST `/auth/login` - Login and get a token
   - GET `/admin/dashboard-data` - Get dashboard data

### Step 6: Create Indexes (Optional but Recommended)

For better performance, create indexes in MongoDB. You can do this through MongoDB Compass or CLI:

```javascript
// In MongoDB shell or Compass
db.users.createIndex({ email: 1 }, { unique: true })
db.products.createIndex({ order_id: 1 }, { unique: true })
db.products.createIndex({ status: 1 })
db.products.createIndex({ warehouse_assigned: 1 })
db.products.createIndex({ delivery_person_assigned: 1 })
```

---

## 📝 Key Changes to Note

### 1. All Route Functions Are Now Async
```python
# Old SQLAlchemy way
def get_products(db: Session = Depends(get_db)):
    return db.query(Product).all()

# New MongoDB way
async def get_products():
    db = get_database()
    products = await db.products.find().to_list(length=1000)
    return products
```

### 2. User Object is Now a Dictionary
```python
# Old way
current_user.name  # SQLAlchemy model attribute

# New way
current_user["name"]  # Dictionary access
```

### 3. MongoDB Collections
Your data is organized in collections:
- `users` - User accounts
- `products` - Product/order tracking

---

## 🔧 Troubleshooting

### Error: "Could not connect to MongoDB"
- Check if MongoDB is running (local) or if your connection string is correct (Atlas)
- Verify network access (for Atlas, add your IP to the whitelist)

### Error: "Authentication failed"
- Verify username and password in connection string
- Check if database user has proper permissions

### Error: "Module not found"
- Run `pip install -r requirements.txt` again
- Make sure you're in the correct virtual environment

### Check MongoDB Connection
Run this test script:
```python
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio

async def test_connection():
    client = AsyncIOMotorClient("your_mongodb_url_here")
    try:
        await client.admin.command('ping')
        print("✅ MongoDB connection successful!")
    except Exception as e:
        print(f"❌ Connection failed: {e}")
    finally:
        client.close()

asyncio.run(test_connection())
```

---

## 📚 Additional Resources

- [MongoDB Documentation](https://docs.mongodb.com/)
- [Motor Documentation](https://motor.readthedocs.io/)
- [FastAPI with MongoDB Tutorial](https://www.mongodb.com/developer/languages/python/python-quickstart-fastapi/)

---

## 🎯 Next Steps

1. ✅ Install MongoDB (Atlas or Local)
2. ✅ Update `.env` with your connection string
3. ✅ Install dependencies with `pip install -r requirements.txt`
4. ✅ Run the server with `python main.py`
5. ✅ Test the API at `http://localhost:8000/docs`
6. ✅ (Optional) Create indexes for better performance

---

**Need Help?** If you encounter any issues, check the logs when starting the server. The connection status will be clearly indicated.
