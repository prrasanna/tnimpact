# Phase 2 Implementation - Quick Reference

## 🎯 What Was Implemented

### Backend Features
✅ **Context Management System**
- Redis-based conversation context storage
- Anaphoric reference resolution ("it", "that", "the customer")
- Automatic context expiry (5 minutes TTL)
- In-memory fallback when Redis unavailable

✅ **New API Endpoints**
- `GET /context/{user_id}` - Retrieve user context
- `POST /context/{user_id}` - Update user context
- `DELETE /context/{user_id}` - Clear user context
- `GET /context/{user_id}/summary` - Get context summary

✅ **Enhanced Voice Processing**
- Context-aware command resolution
- Entity extraction (order_id, phone, location)
- Context updates after successful commands

### Frontend Features
✅ **Wake Word Detection (Porcupine)**
- Custom React hook for wake word activation
- Configurable sensitivity
- Error handling and fallback

✅ **Noise Filtering**
- WebRTC-based audio processing
- Echo cancellation, noise suppression
- Automatic gain control
- Voice activity detection

---

## 📁 Files Created/Modified

### Backend
```
backend/
├── context_manager.py          # NEW - Redis context management
├── requirements.txt            # UPDATED - Added redis, vosk, etc.
├── .env                       # UPDATED - Added Redis config
├── .env.example               # NEW - Environment template
├── main.py                    # UPDATED - Added context endpoints
└── voice.py                   # UPDATED - Integrated context manager
```

### Frontend
```
frontend/
├── .env                                   # UPDATED - Added Porcupine config
├── .env.example                           # UPDATED - Environment template
├── package.json                           # UPDATED - Added dependencies
├── src/
│   ├── hooks/
│   │   └── useWakeWord.js                 # NEW - Wake word detection
│   └── utils/
│       └── audioProcessing.js             # NEW - Noise filtering
```

### Documentation
```
├── PHASE2_VOICE_IMPLEMENTATION_GUIDE.md   # Implementation strategy
├── PHASE2_SETUP_TESTING_GUIDE.md         # Setup & testing guide
└── PHASE2_QUICK_REFERENCE.md             # This file
```

---

## 🔧 Environment Variables Required

### Backend (.env)

```env
# ==========================================
# EXISTING (from Phase 1)
# ==========================================
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=voice_logistics
SECRET_KEY=gsjgeu265634
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# ==========================================
# NEW FOR PHASE 2
# ==========================================

# Redis Configuration (REQUIRED for context management)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
VOICE_CONTEXT_TTL=300

# Vosk STT (OPTIONAL - for future offline speech-to-text)
VOSK_MODEL_PATH=./models/vosk
VOSK_SAMPLE_RATE=16000
ENABLE_VOSK=true

# Azure Speech (OPTIONAL - cloud fallback)
AZURE_SPEECH_KEY=
AZURE_SPEECH_REGION=
ENABLE_AZURE_FALLBACK=false
```

### Frontend (.env)

```env
# ==========================================
# EXISTING (from Phase 1)
# ==========================================
VITE_API_URL=http://127.0.0.1:8000

# ==========================================
# NEW FOR PHASE 2
# ==========================================

# Porcupine Wake Word (Get key from: https://console.picovoice.ai/)
VITE_PORCUPINE_ACCESS_KEY=your-porcupine-access-key-here

# Wake Word Configuration
VITE_WAKE_WORD_ENABLED=false  # Set true to enable hands-free
VITE_WAKE_WORD_SENSITIVITY=0.5  # 0.0-1.0 range
```

---

## 🚀 Quick Start Commands

### 1. Install Redis (Windows)

**Option A: Direct Install**
```powershell
# Download from: https://github.com/microsoftarchive/redis/releases
# Extract and run redis-server.exe
```

**Option B: Docker**
```powershell
docker run -d -p 6379:6379 --name redis redis:latest
```

### 2. Install Backend Dependencies

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
pip install redis vosk webrtcvad numpy soundfile
```

### 3. Install Frontend Dependencies

```powershell
cd frontend
npm install @picovoice/porcupine-react @picovoice/web-voice-processor
```

### 4. Start Services

**Terminal 1: Redis**
```powershell
redis-server
# OR if using Docker:
docker start redis
```

**Terminal 2: Backend**
```powershell
cd backend
uvicorn main:app --reload
```

**Terminal 3: Frontend**
```powershell
cd frontend
npm run dev
```

---

## 🧪 Quick Test

### Test Context Management

```powershell
# 1. Login
$login = Invoke-RestMethod -Uri "http://localhost:8000/auth/login" -Method POST -Body (@{email="delivery@example.com"; password="password123"} | ConvertTo-Json) -ContentType "application/json"
$token = $login.access_token

# 2. Test anaphoric reference
# First command: "track order 1003"
$cmd1 = @{command = "track order 1003"} | ConvertTo-Json
$r1 = Invoke-RestMethod -Uri "http://localhost:8000/voice/command" -Method POST -Body $cmd1 -Headers @{Authorization="Bearer $token"; "Content-Type"="application/json"}
Write-Output $r1.response

# Second command: "mark it delivered" (should resolve "it" to "ORD-1003")
$cmd2 = @{command = "mark it delivered"} | ConvertTo-Json
$r2 = Invoke-RestMethod -Uri "http://localhost:8000/voice/command" -Method POST -Body $cmd2 -Headers @{Authorization="Bearer $token"; "Content-Type"="application/json"}
Write-Output $r2.response

# Check saved context
$ctx = Invoke-RestMethod -Uri "http://localhost:8000/context/Raj Kumar" -Headers @{Authorization="Bearer $token"}
$ctx.context | ConvertTo-Json
```

### Verify Redis Storage

```bash
redis-cli
KEYS voice_context:*
GET "voice_context:Raj Kumar"
EXIT
```

---

## 📊 Feature Summary

| Feature | Status | Testing Method |
|---------|--------|----------------|
| Redis Context Storage | ✅ Complete | Redis CLI, API tests |
| Context API Endpoints | ✅ Complete | cURL/PowerShell requests |
| Anaphoric Resolution | ✅ Complete | Multi-turn voice commands |
| Wake Word Hook | ✅ Complete | Browser console tests |
| Noise Filtering | ✅ Complete | Browser console tests |
| In-Memory Fallback | ✅ Complete | Stop Redis, test commands |
| Context Expiry (TTL) | ✅ Complete | Wait 5+ minutes, retest |
| Environment Config | ✅ Complete | Check .env files |

---

## 🔍 How to Verify Everything Works

### Backend Verification

```powershell
# 1. Check Redis connection
redis-cli ping
# Expected: PONG

# 2. Check backend logs when starting
uvicorn main:app --reload
# Expected to see: "Connected to Redis at localhost:6379"

# 3. Test context endpoint
# (Use commands from Quick Test section above)
```

### Frontend Verification

```javascript
// Open browser console (F12) at http://localhost:5173

// 1. Check if wake word hook exists
import { useWakeWord } from './src/hooks/useWakeWord.js';
console.log('Hook loaded:', typeof useWakeWord);

// 2. Check noise filtering
import NoiseFilteredAudioStream from './src/utils/audioProcessing.js';
console.log('Supported:', NoiseFilteredAudioStream.isSupported());
```

---

## 🎓 Example Use Cases

### Use Case 1: Delivery Driver Workflow

```
User: "Track order 1003"
Bot: "Order 1003 is packed and heading to 123 Main Street"
[Context saved: last_order_id=ORD-1003, last_location=123 Main Street]

User: "Mark it delivered"
[System resolves "it" → "ORD-1003"]
Bot: "Order ORD-1003 marked as delivered"

User: "What was that address?"
[System retrieves from context]
Bot: "123 Main Street"
```

### Use Case 2: Warehouse Staff Workflow

```
User: "Show pending orders"
Bot: "You have 5 pending orders"
[Context saved: pending_count=5]

User: "Mark order 2001 as packed"
Bot: "Order ORD-2001 marked as packed"
[Context saved: last_order_id=ORD-2001]

User: "Mark the next one packed"
[System looks up next pending order]
Bot: "Order ORD-2002 marked as packed"
```

---

## ⚠️ Common Issues & Solutions

### Issue: "Failed to connect to Redis"
**Solution:** Start Redis server (`redis-server` or `docker start redis`)

### Issue: "Porcupine access key invalid"
**Solution:** 
1. Get free key from https://console.picovoice.ai/
2. Add to `frontend/.env` as `VITE_PORCUPINE_ACCESS_KEY`

### Issue: "Context not persisting"
**Solution:**
1. Check Redis is running: `redis-cli ping`
2. Check user_name matches exactly
3. Wait < 5 minutes (context expires after TTL)

### Issue: "Module not found" errors
**Solution:**
```powershell
# Backend
pip install -r requirements.txt

# Frontend
cd frontend
npm install
```

---

## 📈 What's Next (Phase 2B & 2C)

### Week 4-6: Expanded Commands
- Implement new delivery commands (route, exceptions)
- Implement new warehouse commands (picking sequence)
- Add multi-turn dialogue flows

### Week 7-8: Optimization
- Download and integrate Vosk models
- Implement Rasa NLU for better intent detection
- Performance tuning and load testing
- Create custom "Hey Logistics" wake word

### Optional Enhancements
- Azure Speech fallback integration
- Vosk offline STT implementation
- Custom voice commands training data
- Analytics dashboard for voice metrics

---

## 📚 Documentation Files

1. **PHASE2_VOICE_IMPLEMENTATION_GUIDE.md** - Complete implementation strategy
2. **PHASE2_SETUP_TESTING_GUIDE.md** - Detailed setup and testing instructions
3. **PHASE2_QUICK_REFERENCE.md** - This file (quick reference)

---

**Version:** 1.0  
**Date:** March 10, 2026  
**Status:** Phase 2A Foundation Complete ✅
