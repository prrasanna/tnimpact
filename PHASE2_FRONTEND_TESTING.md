# Phase 2 Frontend Integration Testing Guide

## Quick Reference

**What Changed:**

- ✅ Backend now extracts user info from JWT token automatically
- ✅ Voice commands save conversation context to Redis
- ✅ Follow-up commands can reference previous actions ("it", "that order")
- ✅ Context API endpoints available for managing conversation state

---

## Testing Steps

### 1. Start Services

**Terminal 1 - Backend:**

```powershell
cd e:\tnimpact\backend
python -m uvicorn main:app --reload
```

Should see: `Connected to Redis at localhost:6379`

**Terminal 2 - Frontend:**

```powershell
cd e:\tnimpact\frontend
npm run dev
```

Should see: `Local: http://localhost:5173/`

---

### 2. Login and Test Voice Commands

1. **Open Browser:** Go to http://localhost:5173
2. **Login as Delivery:**
   - Email: `delivery@example.com`
   - Password: `delivery123`

3. **Open Browser Console:** Press `F12` → Console tab

---

### 3. Test Context-Aware Commands

**⚠️ IMPORTANT: After updating the code, logout and login again so `user_id` is saved to localStorage!**

#### Test 1: Track an Order (Saves Context)

**Command:** "Track order 1001"

**Expected Browser Console:**

```javascript
Voice Response: {
  success: true,
  message: "Order ORD-1001 is currently pending and is headed to Mumbai",
  data: {
    order_id: "ORD-1001",
    status: "pending",
    destination: "Mumbai"
  },
  context_updated: true  // <-- Context was saved to Redis
}
```

#### Test 2: Use Anaphoric Reference (Uses Saved Context)

**Command:** "Mark it in transit"

**Expected Browser Console:**

```javascript
Voice Response: {
  success: true,
  message: "Order ORD-1001 has been marked as in_transit",
  data: {
    order_id: "ORD-1001",  // <-- "it" was resolved to ORD-1001!
    status: "in_transit"
  },
  context_updated: true
}
```

#### Test 3: Another Follow-up Command

**Command:** "Update its location to Chennai"

**Expected Browser Console:**

```javascript
Voice Response: {
  success: true,
  message: "Order ORD-1001 location updated to Chennai",
  data: {
    order_id: "ORD-1001",  // <-- "its" refers to same order
    location: "Chennai"
  },
  context_updated: true
}
```

---

### 4. Check Context in Browser Console

**IMPORTANT: You must logout and login again after the frontend update for `user_id` to be saved!**

**Get Current Context:**

```javascript
// In browser console (F12)
const userId = localStorage.getItem("user_id");
console.log("User ID:", userId); // Should show your email

// If user_id is null, logout and login again!
if (!userId) {
  console.error("ERROR: user_id is null. Please logout and login again.");
}

// Fetch current context
fetch(`http://localhost:8000/context/${userId}`, {
  headers: {
    Authorization: `Bearer ${localStorage.getItem("access_token")}`,
  },
})
  .then((r) => r.json())
  .then((data) => console.log("Current Context:", data));
```

**Expected Output:**

```javascript
User ID: delivery@example.com

{
  last_order_id: "ORD-1003",
  last_status: "delivered",
  last_location: "Chennai",
  command_history: [
    "track order 1003",
    "mark it delivered",
    "what's its location"
  ],
  timestamp: "2025-01-15T10:30:45.123Z"
}
```

---

### 5. Test Context Management APIs

**Clear Context:**

```javascript
fetch(`http://localhost:8000/context/${userId}`, {
  method: "DELETE",
  headers: {
    Authorization: `Bearer ${localStorage.getItem("access_token")}`,
  },
})
  .then((r) => r.json())
  .then((data) => console.log("Context Cleared:", data));
```

**Update Context Manually:**

```javascript
fetch(`http://localhost:8000/context/${userId}`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${localStorage.getItem("access_token")}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    last_order_id: "ORD-9999",
    custom_field: "test_value",
  }),
})
  .then((r) => r.json())
  .then((data) => console.log("Context Updated:", data));
```

**Get Context Summary:**

```javascript
fetch(`http://localhost:8000/context/${userId}/summary`, {
  headers: {
    Authorization: `Bearer ${localStorage.getItem("access_token")}`,
  },
})
  .then((r) => r.json())
  .then((data) => console.log("Context Summary:", data));
```

---

### 6. Verify in Network Tab

1. **Open DevTools:** Press `F12` → Network tab
2. **Filter:** Type "voice/command" in filter box
3. **Send Voice Command:** Use voice or type command
4. **Click Request:** See payload sent to backend

**Request Payload (Should NOT include user_role or user_name):**

```json
{
  "command": "track order 1003"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Order ORD-1003 is currently delivered...",
  "data": { "order_id": "ORD-1003", "status": "delivered" },
  "context_updated": true
}
```

---

### 7. Test Redis Context Storage Directly

**Using Redis CLI (if installed):**

```bash
redis-cli

# View all keys
KEYS *

# Get context for delivery user
GET "voice_context:delivery@example.com"

# Check TTL (should be around 300 seconds = 5 minutes)
TTL "voice_context:delivery@example.com"
```

**Using PowerShell (backend endpoint):**

```powershell
# Get access token first
$loginResponse = Invoke-RestMethod -Uri "http://localhost:8000/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"username":"delivery@example.com","password":"delivery123"}'

$token = $loginResponse.access_token

# Get context
Invoke-RestMethod -Uri "http://localhost:8000/context/delivery@example.com" `
  -Headers @{ Authorization = "Bearer $token" } | ConvertTo-Json -Depth 10
```

---

## Common Test Scenarios

### Scenario 1: Order Status Update Flow (Recommended)

```
1. "Track order 1001"          → Returns status: pending
2. "Mark it in transit"        → Updates order to in_transit
3. "Update its location to Chennai" → Updates location
4. "Mark it delivered"         → Updates to delivered
```

### Scenario 2: Order Query Flow

```
1. "Track order 1005"          → Returns current status
2. "What's its location?"      → Shows location of same order
3. "Show order status"         → Shows status of last tracked order
```

### Scenario 3: Context Timeout

```
1. "Track order 1001"          → Saves context
2. Wait 6 minutes              → Context expires (TTL = 5 min)
3. "Mark it delivered"         → Returns error (no "it" in context)
```

### Scenario 4: Multiple Orders

```
1. "Track order 1001"          → Context: last_order = 1001
2. "Track order 1005"          → Context: last_order = 1005 (overwritten)
3. "Mark it delivered"         → Updates order 1005 (most recent)
```

---

## Troubleshooting

### Issue: "403 Forbidden" or "user_id is null"

**Cause:** Frontend update didn't save `user_id` to localStorage
**Solution:**

1. **Logout** from the app
2. **Login again** - `user_id` will now be saved
3. Verify in console: `localStorage.getItem('user_id')` should show your email

### Issue: "Order cannot be delivered from status delivered"

**Cause:** Business logic prevents marking an already delivered order as delivered
**Solution:**

1. Use a different test order: "Track order 1001" or "Track order 1005"
2. Or test other status transitions:
   - "Mark it in transit"
   - "Mark it pending"
   - "Update its location to Mumbai"

### Issue: "Command not supported" or "unknown intent"

**Cause:** Command doesn't match intent patterns
**Solution:** Check `backend/voice.py` for supported patterns:

- ✅ "track order {number}"
- ✅ "mark it {status}" (status: pending, in_transit, delivered)
- ✅ "update its location to {city}"
- ✅ "what's its location"
- ✅ "show order {number}"
- ❌ "mark that delivered" (use "it" not "that")
- ❌ "where is it" (use "what's its location")

### Issue: "Command not supported"

**Cause:** Command doesn't match intent patterns
**Solution:** Check `backend/voice.py` for supported patterns:

- "track order {number}"
- "mark it {status}"
- "what's its location"
- etc.

### Issue: "Cannot resolve 'it' - no context"

**Cause:** No previous command or context expired
**Solution:**

1. Run a track/query command first
2. Check context TTL (5 min default)
3. Verify Redis is running

### Issue: "401 Unauthorized"

**Cause:** JWT token expired or missing
**Solution:**

1. Login again
2. Check `localStorage.getItem('access_token')` in console
3. Verify backend shows "Connected to Redis"

### Issue: "redis_available: false" in response

**Cause:** Backend couldn't connect to Redis
**Solution:**

1. Check Redis is running: `redis-cli ping` → should return "PONG"
2. Check backend .env: `REDIS_URL=redis://localhost:6379`
3. Restart backend server

---

## Integration Checklist

- [x] Backend extracts user from JWT (no user_role/user_name in request)
- [x] VoiceCommandRequest schema updated (schemas.py)
- [x] Context manager integrated (voice.py)
- [x] Context API endpoints added (main.py)
- [x] Frontend voiceAPI.processCommand updated (src/utils/api.js)
- [x] DeliveryDashboard uses simplified API
- [x] WarehouseDashboard uses simplified API
- [x] Context API client added (contextAPI in api.js)
- [ ] Wake word detection integrated (VoicePanel)
- [ ] Noise filtering integrated (VoicePanel)
- [ ] UI shows context indicators (optional enhancement)

---

## Next Steps (Optional Enhancements)

### 1. Integrate Wake Word Detection

Update `frontend/src/components/VoicePanel.jsx`:

```javascript
import { useWakeWord } from "../hooks/useWakeWord";

function VoicePanel() {
  const { isListening, error } = useWakeWord({
    onWakeWord: () => {
      console.log("Wake word detected!");
      // Start listening for command
    },
  });

  return (
    <div>
      {isListening && <span>Listening for "Hey Logistics"...</span>}
      {error && <span>Error: {error}</span>}
    </div>
  );
}
```

### 2. Add Noise Filtering

```javascript
import { NoiseFilteredAudioStream } from "../utils/audioProcessing";

const getFilteredMicrophone = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const filtered = new NoiseFilteredAudioStream(stream);
  return filtered.getOutputStream();
};
```

### 3. Show Context in UI

Add a context indicator to dashboards:

```javascript
const [currentContext, setCurrentContext] = useState(null);

useEffect(() => {
  const fetchContext = async () => {
    const userId = localStorage.getItem("user_id");
    const data = await contextAPI.getContext(userId);
    setCurrentContext(data);
  };
  fetchContext();
}, []);

return (
  <div className="context-indicator">
    {currentContext?.last_order_id && (
      <span>Last Order: {currentContext.last_order_id}</span>
    )}
  </div>
);
```

---

## Success Criteria

✅ **Working correctly if:**

- Voice commands return `context_updated: true`
- Follow-up commands with "it"/"that" resolve to correct entity
- Context persists for 5 minutes
- Network tab shows only `{command}` in request body
- Browser console shows resolved entities in response

❌ **Issues if:**

- Response shows `redis_available: false` (Redis not connected)
- Anaphoric commands fail ("Cannot resolve 'it'")
- Request body still has `user_role`/`user_name` fields
- 401 errors (authentication problem)

---

## Summary

**What You Just Integrated:**

1. **Simplified API:** Frontend only sends command, backend gets user from JWT
2. **Context Management:** Conversation state stored in Redis with 5-min TTL
3. **Anaphoric Resolution:** Backend resolves "it", "that order", "its" to actual entities
4. **Context APIs:** Four new endpoints for reading/updating/clearing context

**How to Verify:**

1. Login → Send "track order 1003" → See response with `context_updated: true`
2. Send "mark it delivered" → See "it" resolved to "ORD-1003"
3. Check Network tab → Request only has `{command}`
4. Use browser console → Fetch context with APIs
5. Check Redis → See context stored with TTL

**Documentation:**

- Full implementation guide: `PHASE2_VOICE_IMPLEMENTATION_GUIDE.md`
- Setup instructions: `PHASE2_SETUP_TESTING_GUIDE.md`
- Quick reference: `PHASE2_QUICK_REFERENCE.md`
- **This testing guide:** `PHASE2_FRONTEND_TESTING.md`
