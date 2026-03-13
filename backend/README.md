# Voice-Enabled Logistics Assistant Backend

FastAPI backend with JWT auth, role-based logistics workflows, MongoDB persistence, and voice input/output.

## Tech Stack

- Python 3.11+
- FastAPI
- MongoDB (Motor async driver)
- JWT Authentication (`python-jose`)
- Password hashing (`passlib[bcrypt]`)
- SpeechRecognition (voice input)
- pyttsx3 (offline English output)
- gTTS (Tamil output)

## Project Structure

```
backend/
├── main.py
├── database.py
├── models.py
├── schemas.py
├── auth.py
├── voice.py
├── routes/
│   ├── admin.py
│   ├── warehouse.py
│   └── delivery.py
├── requirements.txt
├── .env
├── .env.example
├── MONGODB_SETUP.md
├── CONNECTION_STRINGS.md
└── test_mongodb.py
```

## Quick Start

### 1. Install Dependencies

```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
# source .venv/bin/activate

pip install --upgrade pip
pip install -r requirements.txt
```

### 2. Setup MongoDB

**Option A: MongoDB Atlas (Cloud - Recommended)**
1. Create free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Create a cluster
3. Get connection string

**Option B: Local MongoDB**
1. Install MongoDB Community Server
2. Start MongoDB service
3. Use connection string: `mongodb://localhost:27017`

See [MONGODB_SETUP.md](MONGODB_SETUP.md) for detailed instructions.

### 3. Configure Environment Variables

Copy `.env.example` to `.env` and update with your MongoDB connection string:

```env
MONGODB_URL=mongodb://localhost:27017
# OR for MongoDB Atlas:
# MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/

DATABASE_NAME=voice_logistics

SECRET_KEY=your-secret-key-here-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Email notifications (optional)
SMTP_ENABLED=false
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_FROM_EMAIL=
SMTP_FROM_NAME=Logistics Assistant
SMTP_USE_TLS=true
SMTP_USE_SSL=false
```

Set `SMTP_ENABLED=true` after filling valid SMTP credentials to send delivery-person emails on order created, packed, and delivered events.

### 4. Test MongoDB Connection

```bash
python test_mongodb.py
```

You should see: `✅ Successfully connected to MongoDB!`

### 5. Run Server

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Open docs:

- Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`

## Authentication Flow

### 1) Register users

```bash
curl -X POST http://127.0.0.1:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Admin One",
    "email":"admin@example.com",
    "password":"admin123",
    "role":"admin"
  }'
```

```bash
curl -X POST http://127.0.0.1:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Warehouse One",
    "email":"warehouse@example.com",
    "password":"warehouse123",
    "role":"warehouse"
  }'
```

```bash
curl -X POST http://127.0.0.1:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Delivery One",
    "email":"delivery@example.com",
    "password":"delivery123",
    "role":"delivery"
  }'
```

### 2) Login and get JWT

```bash
curl -X POST http://127.0.0.1:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'
```

Copy `access_token` and pass in header:

```bash
-H "Authorization: Bearer <TOKEN>"
```

## Admin Routes

### Add product

```bash
curl -X POST http://127.0.0.1:8000/admin/add-product \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -d '{
    "order_id":"ORD-101",
    "product_name":"Medical Kit",
    "destination":"Chennai",
    "warehouse_assigned":"Warehouse One",
    "delivery_person_assigned":"Delivery One"
  }'
```

### Get all products

```bash
curl -X GET http://127.0.0.1:8000/admin/all-products \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

## Warehouse Routes

### Pending assigned orders

```bash
curl -X GET http://127.0.0.1:8000/warehouse/pending \
  -H "Authorization: Bearer <WAREHOUSE_TOKEN>"
```

### Mark packed

```bash
curl -X PUT http://127.0.0.1:8000/warehouse/mark-packed/ORD-101 \
  -H "Authorization: Bearer <WAREHOUSE_TOKEN>"
```

## Delivery Routes

### Get my assigned orders

```bash
curl -X GET http://127.0.0.1:8000/delivery/my-orders \
  -H "Authorization: Bearer <DELIVERY_TOKEN>"
```

### Mark delivered

```bash
curl -X PUT http://127.0.0.1:8000/delivery/mark-delivered/ORD-101 \
  -H "Authorization: Bearer <DELIVERY_TOKEN>"
```

## Voice Endpoints

### Capture mic input

```bash
curl -X POST http://127.0.0.1:8000/voice/listen
```

### Process voice command (authenticated)

```bash
curl -X POST http://127.0.0.1:8000/voice/process \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <DELIVERY_TOKEN>" \
  -d '{"command":"What is my next delivery"}'
```

### Speak text manually

```bash
curl -X POST http://127.0.0.1:8000/voice/speak \
  -H "Content-Type: application/json" \
  -d '{"command":"New delivery assigned. Order ID 101. Deliver to Chennai."}'
```

## Sample Voice Commands

- `What is my next delivery`
- `Mark order 123 delivered`
- `Show pending orders`
- `Track order 456`
- `புதிய ஆர்டர் என்ன?` (Tamil-style query)

## Tamil Voice Example

Use Tamil output via `speak_text("Puthiya order assign pannapattathu. Order ID 101. Chennai ku deliver pannavum.", language="ta")`.

## Notes

- `pyaudio` installation may require OS-specific build tools.
- For production, move secrets to environment variables and lock CORS origins.
