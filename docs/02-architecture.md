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
**Responsibility**: User authentication and profile management

**Structure**:
```
identity-service/
├── src/
│   ├── controllers/
│   │   ├── authController.js      # Login endpoints
│   │   └── userController.js      # User profile (/me)
│   ├── models/
│   │   └── User.js                # User model (Instructor, Student)
│   ├── services/
│   │   └── authService.js         # JWT & authentication logic
│   ├── middleware/
│   │   └── auth.js                # JWT verification
│   ├── routes/
│   │   ├── auth.js                # /v1/auth/* routes
│   │   └── user.js                # /v1/me route
│   └── config/
│       └── database.js            # Database configuration
├── Dockerfile
└── package.json
```

**Database**: Users table (instructors and students)

#### 2. Course Service (Port 3002)
**Responsibility**: Course management and CRUD operations

**Structure**:
```
course-service/
├── src/
│   ├── controllers/
│   │   └── courseController.js    # Course CRUD operations
│   ├── models/
│   │   └── Course.js              # Course model
│   ├── services/
│   │   └── courseService.js       # Course business logic
│   ├── middleware/
│   │   ├── auth.js                # JWT verification (shared)
│   │   └── roleCheck.js           # Instructor validation
│   ├── routes/
│   │   └── courses.js             # /v1/courses/* routes
│   └── config/
│       └── database.js            # Database configuration
├── Dockerfile
└── package.json
```

**Database**: Courses table

#### 3. Chat Service (Port 3003)
**Responsibility**: AI chatbot with ChatGPT integration

**Structure**:
```
chat-service/
├── src/
│   ├── controllers/
│   │   └── chatController.js      # Chat sessions & messages
│   ├── models/
│   │   ├── ChatSession.js         # Chat session model
│   │   └── ChatMessage.js         # Chat message model
│   ├── services/
│   │   ├── chatService.js         # ChatGPT API integration
│   │   └── contextManager.js      # Context limitation logic
│   ├── middleware/
│   │   ├── auth.js                # JWT verification (shared)
│   │   └── rateLimiter.js         # Rate limiting
│   ├── routes/
│   │   └── chat.js                # /v1/chat/* routes
│   └── config/
│       ├── database.js            # Database configuration
│       └── chatgpt.js             # ChatGPT API config
├── Dockerfile
└── package.json
```

**Database**: ChatSessions and ChatMessages tables
**Cache**: Redis for context management

#### 4. API Gateway (Port 8080) - Optional
**Responsibility**: Request routing and load balancing

**Structure**:
```
api-gateway/
├── src/
│   ├── routes/
│   │   └── gateway.js             # Route all requests to services
│   ├── middleware/
│   │   ├── cors.js                # CORS handling
│   │   └── logging.js             # Request logging
│   └── config/
│       └── services.js            # Service URLs
├── Dockerfile
└── package.json
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

### 3. Authentication Flow
```
Login Request (POST /v1/auth/instructor|student/login)
    ↓
API Gateway routes to Identity Service (port 3001)
    ↓
authController receives credentials
    ↓
authService validates credentials
    ↓
User model queries database
    ↓
Password verification (bcrypt)
    ↓
JWT token generation
    ↓
Return token + user info to client
```

**Key Steps**:
1. Client sends username/email and password
2. Controller validates request format
3. Service queries User model
4. Password is verified using bcrypt
5. JWT token is generated with user info and role
6. Token is returned to client for future requests

### 4. Chat/ChatGPT Flow
```
Chat Message Request (POST /v1/chat/sessions/:id/messages)
    ↓
API Gateway routes to Chat Service (port 3003)
    ↓
Rate Limiter checks request limits
    ↓
Auth Middleware verifies JWT token
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
1. Client sends message with session ID
2. Rate limiter prevents excessive API calls
3. JWT verified to ensure authenticated user
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
Auth Middleware verifies JWT token
    ↓
Role Check Middleware verifies instructor role
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
1. Client sends course data with JWT token
2. JWT verified for authentication
3. Role verified (must be instructor)
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
