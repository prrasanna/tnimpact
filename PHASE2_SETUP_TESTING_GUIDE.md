# Phase 2 Voice Features - Setup & Testing Guide

## Quick Start Guide

This guide will help you set up and test the newly implemented Phase 2 voice features, including:
- ✅ Context-aware voice commands
- ✅ Redis-based conversation context management
- ✅ Wake word detection (Porcupine)
- ✅ Noise filtering for warehouse/vehicle environments
- ✅ Anaphoric reference resolution ("it", "that order", "the customer")

---

## Prerequisites

### System Requirements
- **Node.js**: 18+ (for frontend)
- **Python**: 3.10+ (for backend)
- **Redis**: 5.0+ (for context management)
- **OS**: Windows/Linux/macOS

### Install Redis

#### Windows
1. Download Redis from: https://github.com/microsoftarchive/redis/releases
2. Extract to `C:\Redis` or any preferred location
3. Run `redis-server.exe` from the extracted folder
4. Keep the terminal open (Redis runs on port 6379 by default)

**OR use Docker:**
```powershell
docker run -d -p 6379:6379 --name redis redis:latest
```

#### Linux/macOS
```bash
# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis

# macOS
brew install redis
brew services start redis

# OR use Docker:
docker run -d -p 6379:6379 --name redis redis:latest
```

### Verify Redis is Running
```powershell
# Windows/Linux/macOS
redis-cli ping
# Should return: PONG
```

---

## Backend Setup

### Step 1: Install Dependencies

```powershell
# Navigate to backend directory
cd e:\tnimpact\backend

# Activate virtual environment (if not already activated)
.\.venv\Scripts\Activate.ps1

# Install new dependencies
pip install redis vosk webrtcvad numpy soundfile
```

### Step 2: Configure Environment Variables

Open `backend/.env` file (already updated by the implementation):

```env
# Phase 2 Voice Features - Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
VOICE_CONTEXT_TTL=300  # 5 minutes

# Phase 2 Voice Features - Vosk STT (for future use)
VOSK_MODEL_PATH=./models/vosk
VOSK_SAMPLE_RATE=16000
ENABLE_VOSK=true

# Phase 2 Voice Features - Azure Speech (Optional)
AZURE_SPEECH_KEY=  # Leave empty for now
AZURE_SPEECH_REGION=
ENABLE_AZURE_FALLBACK=false
```

### Step 3: Test Redis Connection

```powershell
# In backend directory with virtual environment activated
python -c "import redis; r = redis.Redis(host='localhost', port=6379); print('Redis connection:', r.ping())"
# Should print: Redis connection: True
```

### Step 4: Start Backend Server

```powershell
# In backend directory
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

You should see:
```
INFO:     Application startup complete
INFO:     Connected to Redis at localhost:6379
```

---

## Frontend Setup

### Step 1: Install Dependencies

```powershell
# Navigate to frontend directory
cd e:\tnimpact\frontend

# Install new dependencies
npm install @picovoice/porcupine-react @picovoice/web-voice-processor
```

### Step 2: Configure Environment Variables

#### Get Porcupine Access Key (Free)

1. Go to: https://console.picovoice.ai/
2. Sign up for a free account
3. Create a new project
4. Copy your **Access Key**
5. Free tier includes: 3 custom wake words, unlimited usage

#### Update `.env` file

Open `frontend/.env` and add your access key:

```env
VITE_API_URL=http://127.0.0.1:8000

# Phase 2 Voice Features - Porcupine Wake Word Detection
VITE_PORCUPINE_ACCESS_KEY=YOUR_ACCESS_KEY_HERE  # Paste your key here

# Wake Word Configuration
VITE_WAKE_WORD_ENABLED=false  # Start with false for testing
VITE_WAKE_WORD_SENSITIVITY=0.5
```

**Note:** Start with `VITE_WAKE_WORD_ENABLED=false` to test basic features first.

### Step 3: Start Frontend Server

```powershell
# In frontend directory
npm run dev
```

You should see:
```
  ➜  Local:   http://localhost:5173/
```

---

## Testing Phase 2 Features

### Test 1: Context Management API (Backend)

#### Using cURL (Windows PowerShell)

```powershell
# 1. Login as delivery user to get token
$loginResponse = Invoke-RestMethod -Uri "http://localhost:8000/auth/login" -Method POST -Body (@{email="delivery@example.com"; password="password123"} | ConvertTo-Json) -ContentType "application/json"
$token = $loginResponse.access_token

# 2. Get current context (should be empty initially)
Invoke-RestMethod -Uri "http://localhost:8000/context/Raj Kumar" -Headers @{Authorization="Bearer $token"}
# Should return: {"user_id":"Raj Kumar","context":{},"redis_available":true}

# 3. Update context with sample data
$contextUpdate = @{
    last_order_id = "ORD-1003"
    last_customer_phone = "+91 98765 43210"
    last_location = "123 Main Street"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/context/Raj Kumar" -Method POST -Body $contextUpdate -Headers @{Authorization="Bearer $token"; "Content-Type"="application/json"}
# Should return: {"user_id":"Raj Kumar","updated":true,"context":{...}}

# 4. Verify context was saved
Invoke-RestMethod -Uri "http://localhost:8000/context/Raj Kumar" -Headers @{Authorization="Bearer $token"}
# Should return the context we just saved

# 5. Get context summary
Invoke-RestMethod -Uri "http://localhost:8000/context/Raj Kumar/summary" -Headers @{Authorization="Bearer $token"}
# Should return formatted summary

# 6. Clear context
Invoke-RestMethod -Uri "http://localhost:8000/context/Raj Kumar" -Method DELETE -Headers @{Authorization="Bearer $token"}
# Should return: {"user_id":"Raj Kumar","cleared":true}
```

#### Using Redis CLI

```bash
# Check what's stored in Redis
redis-cli

# List all voice context keys
KEYS voice_context:*

# Get context for specific user
GET voice_context:Raj Kumar

# Clear specific context
DEL voice_context:Raj Kumar

# Exit
EXIT
```

### Test 2: Context-Aware Voice Commands

#### Test Anaphoric Reference Resolution

```powershell
# 1. Login
$loginResponse = Invoke-RestMethod -Uri "http://localhost:8000/auth/login" -Method POST -Body (@{email="delivery@example.com"; password="password123"} | ConvertTo-Json) -ContentType "application/json"
$token = $loginResponse.access_token

# 2. First command: Track an order (establishes context)
$cmd1 = @{command = "track order 1003"} | ConvertTo-Json
$response1 = Invoke-RestMethod -Uri "http://localhost:8000/voice/command" -Method POST -Body $cmd1 -Headers @{Authorization="Bearer $token"; "Content-Type"="application/json"}
Write-Output "Response 1: $($response1.response)"
# Should return order status and save order_id to context

# 3. Second command: Use anaphoric reference "it"
$cmd2 = @{command = "mark it delivered"} | ConvertTo-Json
$response2 = Invoke-RestMethod -Uri "http://localhost:8000/voice/command" -Method POST -Body $cmd2 -Headers @{Authorization="Bearer $token"; "Content-Type"="application/json"}
Write-Output "Response 2: $($response2.response)"
# Should resolve "it" to "ORD-1003" and mark as delivered

# 4. Check context to see what was saved
$context = Invoke-RestMethod -Uri "http://localhost:8000/context/Raj Kumar" -Headers @{Authorization="Bearer $token"}
Write-Output "Saved Context: $($context.context | ConvertTo-Json)"
```

**Expected Output:**
```
Response 1: Order ORD-1003 is currently packed and is headed to 123 Main Street.
Response 2: Order ORD-1003 marked as delivered.
Saved Context: {"last_order_id":"ORD-1003","last_location":"123 Main Street","last_customer_phone":"+91..."}
```

### Test 3: Context Expiry (TTL)

```powershell
# 1. Set context
# ... (use commands from Test 2)

# 2. Wait 6 minutes (TTL is 5 minutes)
Start-Sleep -Seconds 360

# 3. Try to get context
Invoke-RestMethod -Uri "http://localhost:8000/context/Raj Kumar" -Headers @{Authorization="Bearer $token"}
# Should return empty context (expired)
```

### Test 4: Test Redis Fallback (In-Memory)

```powershell
# 1. Stop Redis server
# Close redis-server.exe or: redis-cli shutdown

# 2. Restart backend server
# Server will log: "Failed to connect to Redis at localhost:6379"

# 3. Test context management (should use in-memory fallback)
$cmd = @{command = "track order 1003"} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:8000/voice/command" -Method POST -Body $cmd -Headers @{Authorization="Bearer $token"; "Content-Type"="application/json"}
# Should still work but return "redis_available": false

# 4. Restart Redis and backend to restore Redis functionality
```

### Test 5: Noise Filtering (Frontend)

Open browser console (F12) and run:

```javascript
// Import and test noise filtering
import NoiseFilteredAudioStream from './src/utils/audioProcessing.js';

// Check if supported
console.log('Audio processing supported:', NoiseFilteredAudioStream.isSupported());

// Create instance
const audioStream = new NoiseFilteredAudioStream();

// Initialize
await audioStream.initialize();
console.log('Basic stream initialized');

// Get processed stream
const processedStream = audioStream.getProcessedStream();
console.log('Processed stream created:', processedStream);

// Cleanup when done
audioStream.cleanup();
```

### Test 6: Wake Word Detection (Frontend)

**Note:** Only test this after getting your Porcupine access key.

#### Enable Wake Word

Update `frontend/.env`:
```env
VITE_WAKE_WORD_ENABLED=true
VITE_PORCUPINE_ACCESS_KEY=your-actual-key-here
```

#### Test in Browser

1. Open http://localhost:5173
2. Login as warehouse or delivery user
3. Navigate to dashboard
4. You should see "Wake word detection active" indicator (if implemented)
5. Say "Hey Google" (temporary wake word)
6. Voice panel should activate automatically

**Check Browser Console:**
```
Wake word detected!
Porcupine wake word detection started
```

---

## Verification Checklist

### Backend
- [ ] Redis server running (`redis-cli ping` returns PONG)
- [ ] Backend starts without errors
- [ ] Backend logs show "Connected to Redis at localhost:6379"
- [ ] Context API endpoints respond (GET/POST/DELETE /context/{user_id})
- [ ] Voice commands save context to Redis
- [ ] Anaphoric references resolve correctly ("it" → "ORD-1003")
- [ ] Context expires after 5 minutes (TTL works)
- [ ] Fallback to in-memory storage when Redis is down

### Frontend
- [ ] New dependencies installed (`@picovoice/porcupine-react`, etc.)
- [ ] Environment variables configured (.env has Porcupine key)
- [ ] Frontend builds without errors
- [ ] Browser console shows no errors
- [ ] Noise filtering utility works (check console)

### Integration
- [ ] Voice commands work end-to-end
- [ ] Context persists between commands
- [ ] Follow-up commands resolve references
- [ ] Redis stores context data
- [ ] Context clears after timeout

---

## Troubleshooting

### Redis Connection Failed

**Error:** `ConnectionError: Error connecting to localhost:6379`

**Solution:**
1. Check if Redis server is running: `redis-cli ping`
2. If not running, start Redis server
3. Check firewall/antivirus blocking port 6379
4. Backend will use in-memory fallback (check logs)

### Porcupine Access Key Invalid

**Error:** `Invalid access key` or `403 Forbidden`

**Solution:**
1. Verify key is correct (no extra spaces)
2. Check if key is activated in Picovoice console
3. Ensure you're not exceeding free tier limits
4. Set `VITE_WAKE_WORD_ENABLED=false` to disable temporarily

### Context Not Persisting

**Issue:** Context is empty after update

**Solution:**
1. Check Redis connection: `redis-cli GET voice_context:YourUserName`
2. Verify user_name matches exactly (case-sensitive)
3. Check backend logs for errors
4. Ensure TTL hasn't expired (default: 5 minutes)

### Microphone Permission Denied

**Error:** `Microphone access denied`

**Solution:**
1. Check browser permissions (URL bar → lock icon → allow microphone)
2. Ensure HTTPS connection (or localhost exception)
3. Check OS microphone permissions
4. Try different browser (Chrome/Edge recommended)

### Import Errors (Frontend)

**Error:** `Cannot find module '@picovoice/porcupine-react'`

**Solution:**
```powershell
cd frontend
rm -r node_modules
rm package-lock.json
npm install
```

---

## What's Next?

### Immediate Next Steps

1. **Download Vosk Models** (for offline STT):
   - English: https://alphacephei.com/vosk/models/vosk-model-en-us-0.42-gigaspeech.zip (1.6GB)
   - Tamil: https://alphacephei.com/vosk/models/vosk-model-small-ta-in-0.4.zip (40MB)
   - Extract to `backend/models/vosk/`

2. **Create Custom Wake Word**:
   - Go to https://console.picovoice.ai/
   - Create custom "Hey Logistics" wake word
   - Download `.ppn` file
   - Update frontend hook to use custom keyword

3. **Implement Rasa NLU** (for better intent detection):
   - Install Rasa: `pip install rasa`
   - Create training data (see Phase 2 guide)
   - Train model
   - Replace regex-based intent detection

### Test Scenarios to Try

1. **Multi-turn Conversation:**
   ```
   User: "Track order 1003"
   Bot: "Order 1003 is packed..."
   User: "Mark it delivered"
   Bot: "Order 1003 marked as delivered"
   User: "What was that order's destination?"
   Bot: [Should remember from context]
   ```

2. **Context Timeout:**
   - Send command
   - Wait 6 minutes
   - Send follow-up with "it"
   - Should fail (context expired)

3. **Concurrent Users:**
   - Login as Raj Kumar (delivery)
   - Login as Admin (different browser/incognito)
   - Each should have separate context

---

## Environment Variables Summary

### Backend (.env)
```env
# MongoDB
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=voice_logistics

# JWT
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Redis (Phase 2)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
VOICE_CONTEXT_TTL=300

# Vosk (Phase 2 - Optional)
VOSK_MODEL_PATH=./models/vosk
ENABLE_VOSK=true

# Azure (Phase 2 - Optional)
AZURE_SPEECH_KEY=
ENABLE_AZURE_FALLBACK=false
```

### Frontend (.env)
```env
# Backend API
VITE_API_URL=http://127.0.0.1:8000

# Porcupine (Phase 2)
VITE_PORCUPINE_ACCESS_KEY=your-key-here
VITE_WAKE_WORD_ENABLED=false
VITE_WAKE_WORD_SENSITIVITY=0.5
```

---

## Support & Resources

- **Redis Documentation:** https://redis.io/docs/
- **Porcupine Console:** https://console.picovoice.ai/
- **Vosk Models:** https://alphacephei.com/vosk/models
- **Phase 2 Implementation Guide:** `PHASE2_VOICE_IMPLEMENTATION_GUIDE.md`

---

**Last Updated:** March 10, 2026  
**Version:** 1.0 (Phase 2A Foundation)
