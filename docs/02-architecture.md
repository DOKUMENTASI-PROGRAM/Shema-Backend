# Architecture & Data Flow

## Microservices Architecture

### Service Organization
```
services/
├── identity-service/           # Port 3001 - Authentication & User Management
├── course-service/             # Port 3002 - Course Management
├── chat-service/               # Port 3003 - AI Chatbot
└── api-gateway/                # Port 8080 - API Gateway (optional)
```

### Service Details

#### 1. Identity Service (Port 3001)
**Responsibility**: Firebase authentication integration and user profile management

**Structure**:
```
identity-service/
├── src/
│   ├── controllers/
│   │   ├── authController.ts      # Firebase auth endpoints
│   │   └── userController.ts      # User profile (/me)
│   ├── models/
│   │   └── User.ts                # User model (Instructor, Student)
│   ├── services/
│   │   └── userService.ts         # User business logic
│   ├── middleware/
│   │   └── auth.ts                # Firebase token verification
│   ├── routes/
│   │   ├── auth.ts                # /v1/auth/* routes
│   │   └── user.ts                # /v1/me route
│   └── config/
│       ├── database.ts            # PostgreSQL configuration
│       └── firebase.ts            # Firebase Admin SDK config
├── Dockerfile
├── package.json
└── tsconfig.json
```

**Database**: Users table (instructors and students)
**External**: Firebase Authentication for token verification

#### 2. Course Service (Port 3002)
**Responsibility**: Course management and CRUD operations

**Structure**:
```
course-service/
├── src/
│   ├── controllers/
│   │   └── courseController.ts    # Course CRUD operations
│   ├── models/
│   │   └── Course.ts              # Course model
│   ├── services/
│   │   └── courseService.ts       # Course business logic
│   ├── middleware/
│   │   ├── auth.ts                # Firebase token verification
│   │   └── roleCheck.ts           # Instructor validation
│   ├── routes/
│   │   └── courses.ts             # /v1/courses/* routes
│   └── config/
│       ├── database.ts            # PostgreSQL configuration
│       └── firebase.ts            # Firebase Admin SDK config
├── Dockerfile
├── package.json
└── tsconfig.json
```

**Database**: Courses table
**External**: Firebase Authentication for token verification

#### 3. Chat Service (Port 3003)
**Responsibility**: AI chatbot with ChatGPT integration

**Structure**:
```
chat-service/
├── src/
│   ├── controllers/
│   │   └── chatController.ts      # Chat sessions & messages
│   ├── models/
│   │   ├── ChatSession.ts         # Chat session model
│   │   └── ChatMessage.ts         # Chat message model
│   ├── services/
│   │   ├── chatService.ts         # ChatGPT API integration
│   │   └── contextManager.ts      # Context limitation logic
│   ├── middleware/
│   │   ├── auth.ts                # Firebase token verification
│   │   └── rateLimiter.ts         # Rate limiting
│   ├── routes/
│   │   └── chat.ts                # /v1/chat/* routes
│   └── config/
│       ├── database.ts            # PostgreSQL configuration
│       ├── firebase.ts            # Firebase Admin SDK config
│       └── chatgpt.ts             # ChatGPT API config
├── Dockerfile
├── package.json
└── tsconfig.json
```

**Database**: ChatSessions and ChatMessages tables
**Cache**: Redis for context management
**External**: Firebase Authentication for token verification

#### 4. API Gateway (Port 8080) - Optional
**Responsibility**: Request routing and load balancing

**Structure**:
```
api-gateway/
├── src/
│   ├── routes/
│   │   └── gateway.ts             # Route all requests to services
│   ├── middleware/
│   │   ├── cors.ts                # CORS handling
│   │   └── logging.ts             # Request logging
│   └── config/
│       └── services.ts            # Service URLs
├── Dockerfile
├── package.json
└── tsconfig.json
```

---

## Data Flow Patterns

### 1. Request Flow (Client → Server)
```
Client Request
    ↓
API Gateway/Router (routes/)
    ↓
Middleware Layer (auth, validation, rate limiting)
    ↓
Controller (controllers/) - HTTP handling, input parsing
    ↓
Service Layer (services/) - Business logic, data processing
    ↓
Model/Repository (models/) - Database operations
    ↓
Database
```

### 2. Response Flow (Server → Client)
```
Database
    ↓
Model/Repository - Returns data objects
    ↓
Service Layer - Transforms and validates data
    ↓
Controller - Formats response, sets status codes
    ↓
Middleware - Logs, error handling
    ↓
Client Response (JSON format)
```

---

## Specific Flow Examples

### 3. Authentication Flow (Firebase + PostgreSQL)
```
Client authenticates with Firebase (email/password, Google, etc.)
    ↓
Firebase returns ID Token
    ↓
Client sends request with Firebase ID Token to Identity Service
    ↓
API Gateway routes to Identity Service (port 3001)
    ↓
authMiddleware verifies Firebase ID Token with Firebase Admin SDK
    ↓
Extract user info (UID, email) from verified token
    ↓
userService checks if user exists in PostgreSQL
    ↓
If not exists: Create user record in PostgreSQL
If exists: Update last login timestamp
    ↓
Return user profile from PostgreSQL to client
```

**Key Steps**:
1. Client authenticates with Firebase (using Firebase Client SDK)
2. Firebase returns ID Token to client
3. Client includes Firebase ID Token in Authorization header
4. Backend verifies token using Firebase Admin SDK
5. User data is synced between Firebase and PostgreSQL
6. PostgreSQL stores additional user metadata and relationships
7. Token is used for all subsequent API requests

### 4. Chat/ChatGPT Flow
```
Chat Message Request (POST /v1/chat/sessions/:id/messages)
    ↓
API Gateway routes to Chat Service (port 3003)
    ↓
Rate Limiter checks request limits
    ↓
Auth Middleware verifies Firebase ID Token
    ↓
chatController receives message
    ↓
chatService retrieves context from Redis/Memory
    ↓
chatService calls ChatGPT API with context
    ↓
Context management: limit & cleanup old messages
    ↓
Save message & response to database
    ↓
Update context in Redis
    ↓
Return response to client
```

**Key Steps**:
1. Client sends message with session ID and Firebase ID Token
2. Rate limiter prevents excessive API calls
3. Firebase token verified to ensure authenticated user
4. Previous context retrieved from Redis
5. Context + new message sent to ChatGPT API
6. Response received from ChatGPT
7. Both message and response saved to database
8. Context updated (old messages removed if exceeding limit)
9. Response returned to client

### 5. Course Management Flow (Instructor)
```
Course Request (POST/PUT/DELETE /v1/courses)
    ↓
API Gateway routes to Course Service (port 3002)
    ↓
Auth Middleware verifies Firebase ID Token
    ↓
Role Check Middleware verifies instructor role (from PostgreSQL)
    ↓
Validation Middleware validates request body
    ↓
courseController processes request
    ↓
courseService applies business rules
    ↓
Course model performs database operation
    ↓
Return success/error response
```

**Key Steps**:
1. Client sends course data with Firebase ID Token
2. Firebase token verified for authentication
3. User role fetched from PostgreSQL and verified (must be instructor)
4. Request body validated (required fields, data types)
5. Business logic applied (e.g., price validation, schedule conflicts)
6. Database operation performed
7. Success or error response returned

---

## Key Architecture Principles

### Layer Separation
- **Never skip layers** - each layer has specific responsibility
- **Controller → Service → Model** flow must be maintained
- **Services must not import controllers** - maintain unidirectional dependency
- **Models should be database-agnostic** in service layer

### Middleware Processing
- **Middleware processes before controller** - authentication, validation first
- Authentication middleware runs before all protected routes
- Validation middleware ensures data integrity
- Error handling middleware catches and formats errors

### Error Handling
- **Error handling at each layer** - catch and transform errors appropriately
- Controllers catch service errors and format HTTP responses
- Services catch model errors and add business context
- Middleware catches all uncaught errors

### Context Preservation
- **Context preservation** - pass request context (user, session) through layers
- User information from JWT should be available in all layers
- Request ID for tracing should be propagated
- Session data should be maintained throughout request lifecycle

### Service Communication
- Services communicate via REST APIs (HTTP)
- JWT tokens shared for authentication across services
- Services are independent and can be deployed separately
- Each service has its own database (database per service pattern)
- Optional: Message queues for asynchronous communication

### Scalability Considerations
- Each service can scale independently
- Stateless services (state stored in database/Redis)
- Load balancing via API Gateway
- Database connection pooling per service
- Redis caching for frequently accessed data
