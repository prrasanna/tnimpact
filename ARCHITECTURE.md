# Voice-Enabled Logistics Assistant - Architecture Documentation

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                         CLIENT LAYER (Frontend)                             │
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                     │
│  │   Admin      │  │  Warehouse   │  │   Delivery   │                     │
│  │  Dashboard   │  │  Dashboard   │  │  Dashboard   │                     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                     │
│         │                 │                  │                              │
│         └─────────────────┼──────────────────┘                              │
│                           │                                                 │
│                  ┌────────▼────────┐                                        │
│                  │  Voice Panel    │                                        │
│                  │  Component      │                                        │
│                  │  - Web Speech   │                                        │
│                  │  - SpeechSynth  │                                        │
│                  └────────┬────────┘                                        │
│                           │                                                 │
│                  ┌────────▼────────┐                                        │
│                  │   API Client    │                                        │
│                  │   (fetch/JWT)   │                                        │
│                  └────────┬────────┘                                        │
│                           │                                                 │
└───────────────────────────┼─────────────────────────────────────────────────┘
                            │
                     HTTPS/REST API
                            │
┌───────────────────────────▼─────────────────────────────────────────────────┐
│                                                                             │
│                         SERVER LAYER (Backend)                              │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────┐      │
│  │                      FastAPI Application                         │      │
│  │                                                                  │      │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │      │
│  │  │    Auth      │  │    Admin     │  │   Warehouse  │          │      │
│  │  │   Routes     │  │   Routes     │  │    Routes    │          │      │
│  │  │              │  │              │  │              │          │      │
│  │  │ - register   │  │ - dashboard  │  │ - pending    │          │      │
│  │  │ - login      │  │ - add-prod   │  │ - mark-pack  │          │      │
│  │  └──────────────┘  └──────────────┘  └──────────────┘          │      │
│  │                                                                  │      │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │      │
│  │  │  Delivery    │  │    Voice     │  │    Models    │          │      │
│  │  │   Routes     │  │   Processor  │  │   Schemas    │          │      │
│  │  │              │  │              │  │              │          │      │
│  │  │ - my-orders  │  │ - listen     │  │ - User       │          │      │
│  │  │ - delivered  │  │ - process    │  │ - Product    │          │      │
│  │  └──────────────┘  │ - speak      │  └──────────────┘          │      │
│  │                    └──────────────┘                             │      │
│  │                                                                  │      │
│  │  ┌───────────────────────────────────────────────────────┐      │      │
│  │  │              Middleware Layer                         │      │      │
│  │  │  - CORS (allow all origins)                           │      │      │
│  │  │  - JWT Authentication                                 │      │      │
│  │  │  - Error Handling                                     │      │      │
│  │  └───────────────────────────────────────────────────────┘      │      │
│  └──────────────────────────────────────────────────────────────────┘      │
│                                                                             │
│                           ┌─────────────┐                                  │
│                           │   Voice I/O │                                  │
│                           │   Utilities │                                  │
│                           │             │                                  │
│                           │ - pyttsx3   │                                  │
│                           │ - gTTS      │                                  │
│                           │ - SpeechRec │                                  │
│                           └─────────────┘                                  │
│                                                                             │
└───────────────────────────┼─────────────────────────────────────────────────┘
                            │
                   MongoDB Connection
                            │
┌───────────────────────────▼─────────────────────────────────────────────────┐
│                                                                             │
│                         DATA LAYER (MongoDB)                                │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────┐      │
│  │                    voice_logistics Database                      │      │
│  │                                                                  │      │
│  │  ┌──────────────────────┐      ┌──────────────────────┐        │      │
│  │  │   users Collection   │      │  products Collection │        │      │
│  │  │                      │      │                      │        │      │
│  │  │ - _id                │      │ - _id                │        │      │
│  │  │ - name               │      │ - order_id           │        │      │
│  │  │ - email              │      │ - product_name       │        │      │
│  │  │ - password (hashed)  │      │ - destination        │        │      │
│  │  │ - role               │      │ - warehouse_assigned │        │      │
│  │  │                      │      │ - delivery_person    │        │      │
│  │  │                      │      │ - status             │        │      │
│  │  │                      │      │ - created_at         │        │      │
│  │  └──────────────────────┘      └──────────────────────┘        │      │
│  │                                                                  │      │
│  └──────────────────────────────────────────────────────────────────┘      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Component Interaction Flow

### 1. Authentication Flow

```
┌──────────┐                ┌──────────┐              ┌──────────┐
│  Client  │                │  FastAPI │              │ MongoDB  │
│ (React)  │                │ Backend  │              │          │
└────┬─────┘                └────┬─────┘              └────┬─────┘
     │                           │                         │
     │  POST /auth/login         │                         │
     │  {email, password}        │                         │
     ├──────────────────────────>│                         │
     │                           │  Find user by email     │
     │                           ├────────────────────────>│
     │                           │                         │
     │                           │<────────────────────────┤
     │                           │  User document          │
     │                           │                         │
     │                           │  Verify password        │
     │                           │  with bcrypt            │
     │                           │                         │
     │                           │  Generate JWT token     │
     │                           │  {sub: email, role}     │
     │                           │                         │
     │  {access_token, type}     │                         │
     │<──────────────────────────┤                         │
     │                           │                         │
     │  Store token in           │                         │
     │  localStorage             │                         │
     │                           │                         │
     │  Decode JWT to get role   │                         │
     │                           │                         │
     │  Redirect to /admin or    │                         │
     │  /warehouse or /delivery  │                         │
     │                           │                         │
```

### 2. Voice Command Flow (Warehouse)

```
┌──────────┐         ┌──────────┐         ┌──────────┐         ┌──────────┐
│   User   │         │  Voice   │         │ FastAPI  │         │ MongoDB  │
│ (Speaks) │         │  Panel   │         │  API     │         │          │
└────┬─────┘         └────┬─────┘         └────┬─────┘         └────┬─────┘
     │                    │                     │                    │
     │ "Mark order 1003   │                     │                    │
     │  as packed"        │                     │                    │
     ├───────────────────>│                     │                    │
     │                    │                     │                    │
     │                    │ Web Speech API      │                    │
     │                    │ → Transcript        │                    │
     │                    │                     │                    │
     │                    │ Parse command       │                    │
     │                    │ Extract: ORD-1003   │                    │
     │                    │ Intent: mark packed │                    │
     │                    │                     │                    │
     │                    │ PUT /warehouse/     │                    │
     │                    │ mark-packed/        │                    │
     │                    │ ORD-1003            │                    │
     │                    ├────────────────────>│                    │
     │                    │ (with JWT token)    │                    │
     │                    │                     │                    │
     │                    │                     │ Verify JWT         │
     │                    │                     │ Check role=        │
     │                    │                     │ warehouse          │
     │                    │                     │                    │
     │                    │                     │ Find order by ID   │
     │                    │                     ├───────────────────>│
     │                    │                     │                    │
     │                    │                     │<───────────────────┤
     │                    │                     │ Order doc          │
     │                    │                     │                    │
     │                    │                     │ Update status      │
     │                    │                     │ to "packed"        │
     │                    │                     ├───────────────────>│
     │                    │                     │                    │
     │                    │                     │<───────────────────┤
     │                    │                     │ Updated doc        │
     │                    │                     │                    │
     │                    │ {updated product}   │                    │
     │                    │<────────────────────┤                    │
     │                    │                     │                    │
     │                    │ Generate response:  │                    │
     │                    │ "Order 1003 marked  │                    │
     │                    │  as packed"         │                    │
     │                    │                     │                    │
     │ Hears: "Order 1003 │ SpeechSynthesis     │                    │
     │ marked as packed"  │ → Speak             │                    │
     │<───────────────────┤                     │                    │
     │                    │                     │                    │
     │                    │ Update UI           │                    │
     │                    │ Remove from pending │                    │
     │                    │                     │                    │
```

### 3. Admin Dashboard Data Flow

```
┌──────────┐                ┌──────────┐              ┌──────────┐
│  Admin   │                │  FastAPI │              │ MongoDB  │
│Dashboard │                │          │              │          │
└────┬─────┘                └────┬─────┘              └────┬─────┘
     │                           │                         │
     │  GET /admin/              │                         │
     │  dashboard-data           │                         │
     ├──────────────────────────>│                         │
     │  (with JWT token)         │                         │
     │                           │                         │
     │                           │ Verify JWT              │
     │                           │ Check role=admin        │
     │                           │                         │
     │                           │ Query all products      │
     │                           ├────────────────────────>│
     │                           │                         │
     │                           │<────────────────────────┤
     │                           │ List of products        │
     │                           │                         │
     │                           │ Calculate stats:        │
     │                           │ - Total orders          │
     │                           │ - Pending deliveries    │
     │                           │ - Active drivers        │
     │                           │                         │
     │  {products[], stats{}}    │                         │
     │<──────────────────────────┤                         │
     │                           │                         │
     │  Render:                  │                         │
     │  - Stat Cards             │                         │
     │  - Product Table          │                         │
     │                           │                         │
```

## Voice Command Processing Architecture

### Current Implementation

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND PROCESSING                      │
│                                                             │
│  User Speaks → Web Speech API → Transcript                 │
│                                                             │
│  ┌──────────────────────────────────────────────┐          │
│  │  processWarehouseVoiceCommand()              │          │
│  │  processDeliveryVoiceCommand()               │          │
│  │                                              │          │
│  │  1. Normalize text to lowercase              │          │
│  │  2. Extract order ID with regex              │          │
│  │  3. Detect intent (packing, delivered, etc)  │          │
│  │  4. Execute action:                          │          │
│  │     - API call to backend                    │          │
│  │     - Local state update                     │          │
│  │  5. Generate response text                   │          │
│  │  6. Speak response with SpeechSynthesis      │          │
│  └──────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

### Recommended Architecture (Unified Backend Processing)

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND                            │
│                                                             │
│  User Speaks → Web Speech API → Transcript                 │
│                      ↓                                      │
│       POST /voice/command {command, role}                   │
│                      ↓                                      │
└──────────────────────┼──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                        BACKEND                              │
│                                                             │
│  ┌───────────────────────────────────────────────┐         │
│  │     process_voice_command(command, role)      │         │
│  │                                               │         │
│  │  1. Detect language (English/Tamil)           │         │
│  │  2. Normalize text                            │         │
│  │  3. Extract entities (order ID, intent)       │         │
│  │  4. Validate user permissions                 │         │
│  │  5. Execute database operations               │         │
│  │  6. Log command to audit trail                │         │
│  │  7. Generate bilingual response               │         │
│  │  8. Return response text                      │         │
│  └───────────────────────────────────────────────┘         │
│                      ↓                                      │
└──────────────────────┼──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                       FRONTEND                              │
│                                                             │
│  Receive response → SpeechSynthesis.speak()                 │
│                  → Update UI                                │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow Diagrams

### Order Lifecycle

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ORDER LIFECYCLE                             │
└─────────────────────────────────────────────────────────────────────┘

   ┌──────────┐
   │  ADMIN   │
   └────┬─────┘
        │
        │ Creates Order
        │ POST /admin/add-product
        ▼
   ┌─────────────┐
   │   CREATED   │ ──────────────────────┐
   └─────┬───────┘                       │
         │                               │
         │ Warehouse staff picks         │ Admin can view
         │ PUT /warehouse/mark-packed    │ GET /admin/dashboard-data
         ▼                               │
   ┌──────────┐                          │
   │  PACKED  │ ◄────────────────────────┘
   └────┬─────┘
        │
        │ Delivery person picks up
        │ (Future: PUT /delivery/mark-out)
        ▼
   ┌─────────────────────┐
   │ OUT_FOR_DELIVERY    │
   │    (Future)         │
   └──────┬──────────────┘
          │
          │ Delivery completed
          │ PUT /delivery/mark-delivered
          ▼
   ┌────────────┐
   │ DELIVERED  │
   └────────────┘
```

### User Role Permissions

```
┌─────────────────────────────────────────────────────────────────────┐
│                      ROLE-BASED ACCESS CONTROL                      │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    ADMIN     │     │  WAREHOUSE   │     │   DELIVERY   │
│              │     │              │     │              │
│ Permissions: │     │ Permissions: │     │ Permissions: │
│  • Create    │     │  • View own  │     │  • View own  │
│    orders    │     │    orders    │     │    orders    │
│  • View all  │     │  • Mark      │     │  • Mark      │
│    orders    │     │    packed    │     │    delivered │
│  • View      │     │  • Voice     │     │  • Track     │
│    stats     │     │    commands  │     │    orders    │
│  • Assign    │     │              │     │  • Voice     │
│    warehouse │     │              │     │    commands  │
│  • Assign    │     │              │     │              │
│    delivery  │     │              │     │              │
└──────────────┘     └──────────────┘     └──────────────┘
```

## Technology Stack Details

### Frontend

```
┌─────────────────────────────────────────────────────────────┐
│ Language:    JavaScript (ES6+)                              │
│ Framework:   React 18 with Hooks                            │
│ Build Tool:  Vite 5                                         │
│ Styling:     Tailwind CSS 3                                 │
│ Icons:       Lucide React                                   │
│ Voice:       Web Speech API                                 │
│              - SpeechRecognition for STT                    │
│              - SpeechSynthesis for TTS                      │
│ Routing:     React Router v6                                │
│ HTTP:        Fetch API with JWT Bearer tokens              │
│ State:       React useState, useEffect, useMemo             │
│ Toast:       react-hot-toast                                │
└─────────────────────────────────────────────────────────────┘
```

### Backend

```
┌─────────────────────────────────────────────────────────────┐
│ Language:    Python 3.13                                    │
│ Framework:   FastAPI 0.115                                  │
│ ASGI Server: Uvicorn (development)                          │
│ Database:    MongoDB (async with Motor)                     │
│ Auth:        JWT with python-jose                           │
│              bcrypt for password hashing                    │
│ Voice:       pyttsx3 (offline English TTS)                  │
│              gTTS (Tamil TTS)                               │
│              SpeechRecognition (Google STT)                 │
│ Validation:  Pydantic v2                                    │
│ Logging:     Python logging module                          │
└─────────────────────────────────────────────────────────────┘
```

### Database Schema

```
MongoDB: voice_logistics

┌─────────────────────────────────────────────────────────────┐
│ Collection: users                                           │
├─────────────────────────────────────────────────────────────┤
│ {                                                           │
│   _id: ObjectId("..."),                                     │
│   name: String (max 100),                                   │
│   email: String (unique, validated),                        │
│   password: String (bcrypt hashed, max 255),                │
│   role: Enum["admin", "warehouse", "delivery"]              │
│ }                                                           │
│                                                             │
│ Indexes:                                                    │
│   - email (unique)                                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Collection: products                                        │
├─────────────────────────────────────────────────────────────┤
│ {                                                           │
│   _id: ObjectId("..."),                                     │
│   order_id: String (unique, format: ORD-XXXX),              │
│   product_name: String (max 255),                           │
│   destination: String (max 255),                            │
│   warehouse_assigned: String (max 255),                     │
│   delivery_person_assigned: String (max 255),               │
│   delivery_person_phone: String (max 50),                   │
│   status: Enum["created", "packed", "delivered"],           │
│   created_at: DateTime (UTC)                                │
│ }                                                           │
│                                                             │
│ Indexes:                                                    │
│   - order_id (unique)                                       │
│   - status                                                  │
│   - warehouse_assigned + status (compound)                  │
│   - delivery_person_assigned                                │
│   - created_at                                              │
└─────────────────────────────────────────────────────────────┘
```

## Deployment Architecture (Recommended)

```
┌─────────────────────────────────────────────────────────────────────┐
│                          PRODUCTION SETUP                           │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                        Load Balancer                         │
│                    (AWS ALB / Nginx)                         │
└────┬──────────────────────────────────────────┬──────────────┘
     │                                          │
     │                                          │
┌────▼────────┐                        ┌────────▼────┐
│  Frontend   │                        │  Backend    │
│  (S3 +      │                        │  (ECS/K8s)  │
│ CloudFront) │                        │             │
│             │                        │ ┌─────────┐ │
│ - React App │                        │ │FastAPI  │ │
│ - Static    │                        │ │Container│ │
│   Assets    │                        │ └────┬────┘ │
└─────────────┘                        │      │      │
                                       └──────┼──────┘
                                              │
                                       ┌──────▼──────┐
                                       │   MongoDB   │
                                       │   Atlas     │
                                       │  (Cluster)  │
                                       └─────────────┘
```

## Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       SECURITY LAYERS                       │
└─────────────────────────────────────────────────────────────┘

1. Transport Layer
   ├─ HTTPS/TLS 1.3 for all connections
   └─ Certificate management (Let's Encrypt / ACM)

2. Authentication Layer
   ├─ JWT tokens (HS256 or RS256)
   ├─ Token expiration (15 min access, 7 day refresh)
   └─ bcrypt password hashing (cost factor 12)

3. Authorization Layer
   ├─ Role-based access control (RBAC)
   ├─ JWT claims validation
   └─ Route-level permission checks

4. API Security
   ├─ CORS restricted to allowed origins
   ├─ Rate limiting (100 requests/min per IP)
   ├─ Input validation (Pydantic schemas)
   └─ SQL/NoSQL injection prevention

5. Data Security
   ├─ Encryption at rest (MongoDB encryption)
   ├─ Encryption in transit (TLS)
   └─ PII data masking in logs

6. Voice Security
   ├─ Voice recording consent
   ├─ Audio data not stored by default
   └─ Command audit logs
```

## Monitoring & Observability

```
┌─────────────────────────────────────────────────────────────┐
│                    MONITORING STACK                         │
└─────────────────────────────────────────────────────────────┘

Application Monitoring
├─ Error Tracking: Sentry
├─ Performance: New Relic / DataDog
└─ User Analytics: Mixpanel / LogRocket

Infrastructure Monitoring
├─ Server Metrics: CloudWatch / Prometheus
├─ Database Metrics: MongoDB Atlas Charts
└─ Logs: ELK Stack / CloudWatch Logs

Voice Analytics
├─ Command success rate
├─ Recognition accuracy
├─ Response time distribution
└─ Language usage (English vs Tamil)
```

---

## Future Architecture Enhancements

### Microservices Architecture

```
Current: Monolithic FastAPI app
Future:  Separate services for:
         - Auth Service
         - Order Service
         - Voice Service
         - Notification Service
         - Route Optimization Service
```

### Event-Driven Architecture

```
Current: Synchronous REST API calls
Future:  Event bus (RabbitMQ / Kafka) for:
         - Order status changes
         - Voice command events
         - Real-time notifications
         - Analytics events
```

### Caching Layer

```
Current: Direct database queries
Future:  Redis for:
         - Session management
         - API response caching
         - Voice command history
         - Real-time dashboard data
```

This architecture documentation provides a comprehensive view of the current system design and recommended improvements for scaling to production.
