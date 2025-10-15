# API Gateway - Shema Music Backend

**Port: 3000**  
**Purpose**: Entry point for all client requests, routes to appropriate microservices

## 🏗️ Architecture Overview

The API Gateway is the single entry point for all client applications. It handles:

- **Request Routing**: Forwards requests to appropriate microservices
- **Authentication**: Validates JWT tokens for protected routes
- **Data Aggregation**: Combines data from multiple services (e.g., dashboard)
- **Load Balancing**: Distributes requests across service instances
- **Error Handling**: Provides consistent error responses
- **Service Discovery**: Health checks for all backend services

## 📁 Project Structure

```
api-gateway/
├── src/
│   ├── config/
│   │   ├── redis.ts              # Redis client configuration
│   │   └── services.ts           # Service URLs and gateway config
│   ├── middleware/
│   │   └── auth.ts               # JWT authentication middleware
│   ├── routes/
│   │   └── index.ts              # All API routes
│   ├── utils/
│   │   ├── proxy.ts              # Service proxy with retry logic
│   │   └── aggregator.ts         # Multi-service data aggregation
│   └── index.ts                  # Main entry point
├── Dockerfile
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Bun runtime (v1.0+)
- Redis server running
- All microservices running (auth, user, course, booking, chat, recommendation)

### Installation

```bash
# Install dependencies
cd api-gateway
bun install

# Copy environment variables
cp .env.example .env

# Edit .env with your configuration
# Ensure service URLs match your setup
```

### Development

```bash
# Start development server with hot reload
bun run dev

# Or use the batch script (Windows)
start-server.bat
```

### Production

```bash
# Build for production
bun run build

# Start production server
bun run start
```

### Docker

```bash
# Build Docker image
docker build -t shema-music/api-gateway:latest .

# Run container
docker run -p 3000:3000 --env-file .env shema-music/api-gateway:latest
```

## 🌐 Service Routing

The API Gateway routes requests to the following microservices:

| Service | Port | Internal URL | Purpose |
|---------|------|--------------|---------|
| **Auth Service** | 3001 | `http://auth-service:3001` | Authentication & authorization |
| **User Service** | 3002 | `http://user-service:3002` | User profile management |
| **Course Service** | 3003 | `http://course-service:3003` | Course & schedule management |
| **Booking Service** | 3004 | `http://booking-service:3004` | Booking system with 2-slot selection |
| **Chat Service** | 3005 | `http://chat-service:3005` | Real-time live chat (WebSocket) |
| **Recommendation Service** | 3006 | `http://recommendation-service:3006` | AI-based class recommendations |

## 📡 API Endpoints

### Health & Monitoring

#### `GET /health`
**Description**: Gateway health check  
**Auth**: None  
**Response**:
```json
{
  "service": "api-gateway",
  "status": "healthy",
  "timestamp": "2025-10-10T10:00:00.000Z",
  "version": "1.0.0",
  "uptime": 3600,
  "environment": "development"
}
```

#### `GET /services`
**Description**: List all configured services  
**Auth**: None  
**Response**:
```json
{
  "success": true,
  "data": {
    "gateway": {
      "port": 3000,
      "environment": "development"
    },
    "services": {
      "auth": "http://auth-service:3001",
      "user": "http://user-service:3002",
      "course": "http://course-service:3003",
      "booking": "http://booking-service:3004",
      "chat": "http://chat-service:3005",
      "recommendation": "http://recommendation-service:3006"
    }
  }
}
```

#### `GET /services/health`
**Description**: Health check for all microservices  
**Auth**: None  
**Response**:
```json
{
  "success": true,
  "overallStatus": "healthy",
  "services": {
    "auth": { "status": "healthy", "data": {...} },
    "user": { "status": "healthy", "data": {...} },
    "course": { "status": "healthy", "data": {...} },
    "booking": { "status": "healthy", "data": {...} },
    "chat": { "status": "healthy", "data": {...} },
    "recommendation": { "status": "healthy", "data": {...} }
  },
  "timestamp": "2025-10-10T10:00:00.000Z"
}
```

### Authentication Routes (Proxied to Auth Service)

#### `POST /api/auth/register`
**Description**: User registration  
**Auth**: None  
**Body**:
```json
{
  "email": "student@example.com",
  "password": "SecurePass123!",
  "full_name": "John Doe",
  "experience_level": "beginner",
  "preferred_instruments": ["piano", "gitar"]
}
```

#### `POST /api/auth/login`
**Description**: User login  
**Auth**: None  
**Body**:
```json
{
  "email": "student@example.com",
  "password": "SecurePass123!"
}
```

#### `POST /api/auth/refresh`
**Description**: Refresh access token  
**Auth**: Refresh Token  
**Body**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### `POST /api/auth/logout`
**Description**: User logout  
**Auth**: Bearer Token (Required)

### User Routes (Proxied to User Service)

#### `GET /api/users/me`
**Description**: Get current user profile  
**Auth**: Bearer Token (Required)

#### `GET /api/users/:id`
**Description**: Get user by ID  
**Auth**: Bearer Token (Required)

#### `PUT /api/users/:id`
**Description**: Update user profile  
**Auth**: Bearer Token (Required)

#### `GET /api/users`
**Description**: List all users (admin only)  
**Auth**: Bearer Token (Admin role required)

### Course Routes (Proxied to Course Service)

#### `GET /api/courses`
**Description**: List all courses  
**Auth**: None  
**Query Params**: `?instrument=piano&level=beginner`

#### `GET /api/courses/:id`
**Description**: Get course details  
**Auth**: None

#### `POST /api/courses`
**Description**: Create new course (admin only)  
**Auth**: Bearer Token (Admin role required)

#### `GET /api/schedules/available`
**Description**: Get available schedules  
**Auth**: None  
**Query Params**: `?course_id=uuid`

### Booking Routes (Proxied to Booking Service)

#### `POST /api/bookings/create`
**Description**: Create new booking with 2 slot choices  
**Auth**: Bearer Token (Required)  
**Body**:
```json
{
  "course_id": "uuid",
  "first_choice_slot_id": "uuid",
  "second_choice_slot_id": "uuid"
}
```

#### `GET /api/bookings/user/:userId`
**Description**: Get user's bookings  
**Auth**: Bearer Token (Required)

#### `GET /api/bookings/pending`
**Description**: Get pending bookings (admin only)  
**Auth**: Bearer Token (Admin role required)

#### `POST /api/bookings/:id/confirm`
**Description**: Confirm booking (admin only)  
**Auth**: Bearer Token (Admin role required)

### Chat Routes (Proxied to Chat Service)

#### `GET /api/chat/sessions`
**Description**: Get user's chat sessions  
**Auth**: Bearer Token (Required)

#### `GET /api/chat/active-sessions`
**Description**: Get all active sessions (admin only)  
**Auth**: Bearer Token (Admin role required)

### Recommendation Routes (Proxied to Recommendation Service)

#### `POST /api/recommendations/generate`
**Description**: Generate course recommendations  
**Auth**: Bearer Token (Required)

#### `GET /api/recommendations/user/:userId`
**Description**: Get user's recommendations  
**Auth**: Bearer Token (Required)

### Aggregation Endpoints (Multi-Service)

#### `GET /api/dashboard/stats`
**Description**: Aggregate statistics from all services  
**Auth**: Bearer Token (Admin role required)  
**Response**:
```json
{
  "success": true,
  "data": {
    "totalStudents": 150,
    "pendingBookings": 12,
    "activeChats": 5,
    "coursesAvailable": 24,
    "servicesHealth": {
      "userService": true,
      "bookingService": true,
      "chatService": true,
      "courseService": true
    }
  }
}
```

#### `GET /api/dashboard/admin`
**Description**: Complete admin dashboard data  
**Auth**: Bearer Token (Admin role required)

#### `GET /api/profile/:userId/full`
**Description**: Complete user profile with bookings and recommendations  
**Auth**: Bearer Token (Required)

## 🔐 Authentication

The API Gateway validates JWT tokens for protected routes using middleware:

### Public Routes (No Auth Required)
- `/health`
- `/services`
- `/services/health`
- `/api/auth/register`
- `/api/auth/login`
- `/api/courses` (GET)
- `/api/courses/:id` (GET)
- `/api/schedules/available` (GET)

### Protected Routes (Bearer Token Required)
All other `/api/*` routes require:

```
Authorization: Bearer <jwt_token>
```

### Role-Based Access Control
Admin-only routes:
- `/api/users` (GET all users)
- `/api/courses` (POST/PUT/DELETE)
- `/api/bookings/pending`
- `/api/bookings/:id/confirm`
- `/api/dashboard/stats`
- `/api/dashboard/admin`

## 🔄 Request Flow

### Standard Request Flow
```
Client → API Gateway → Authentication Middleware → Service Proxy → Microservice → Response
```

### Aggregation Request Flow
```
Client → API Gateway → Authentication Middleware → Aggregator
  ├─→ Service A → fetch data
  ├─→ Service B → fetch data  } (parallel)
  └─→ Service C → fetch data
  ↓
Combine all responses → Client
```

## ⚙️ Configuration

### Environment Variables

```env
# Server
PORT=3000
NODE_ENV=development

# CORS
CORS_ORIGIN=http://localhost:5173

# Redis
REDIS_URL=redis://localhost:6379

# Service URLs
AUTH_SERVICE_URL=http://auth-service:3001
USER_SERVICE_URL=http://user-service:3002
COURSE_SERVICE_URL=http://course-service:3003
BOOKING_SERVICE_URL=http://booking-service:3004
CHAT_SERVICE_URL=http://chat-service:3005
RECOMMENDATION_SERVICE_URL=http://recommendation-service:3006

# JWT (must match Auth Service)
JWT_SECRET=your-jwt-secret-key
SERVICE_JWT_SECRET=service-to-service-secret

# Gateway Config
SERVICE_TIMEOUT=30000
MAX_RETRIES=3
ENABLE_REQUEST_LOGGING=true
```

## 🛡️ Error Handling

The API Gateway provides consistent error responses:

### Service Unavailable (503)
```json
{
  "success": false,
  "error": {
    "code": "SERVICE_UNAVAILABLE",
    "message": "Failed to reach service after 3 attempts",
    "details": {
      "service": "http://user-service:3002",
      "path": "/api/users/me"
    }
  }
}
```

### Authentication Error (401)
```json
{
  "success": false,
  "error": {
    "code": "AUTH_TOKEN_EXPIRED",
    "message": "Token has expired"
  }
}
```

### Forbidden (403)
```json
{
  "success": false,
  "error": {
    "code": "AUTH_FORBIDDEN",
    "message": "Access denied. Required roles: admin",
    "userRole": "student"
  }
}
```

### Not Found (404)
```json
{
  "success": false,
  "error": {
    "code": "ROUTE_NOT_FOUND",
    "message": "The requested route does not exist",
    "path": "/api/invalid",
    "method": "GET"
  }
}
```

## 🔧 Middleware

### Authentication Middleware (`authMiddleware`)
- Validates JWT token from `Authorization` header
- Extracts user info and attaches to context
- Returns 401 for invalid/expired tokens

### Role-Based Middleware (`requireRole`)
- Checks if user has required role
- Used for admin-only routes
- Returns 403 if role not allowed

### Optional Auth Middleware (`optionalAuth`)
- Validates token if provided
- Does not fail if no token
- Used for routes that work with/without auth

## 📊 Monitoring & Observability

### Request Logging
All requests are logged with:
- Method, path, status code
- Response time
- User agent
- Source IP

### Service Health Checks
Periodic health checks to all microservices:
- Every 30 seconds
- Timeout: 3 seconds
- Auto-retry on failure

### Metrics (Future)
- Request count per service
- Average response time
- Error rate
- Service availability percentage

## 🚨 Troubleshooting

### Gateway can't connect to services
**Symptom**: `ECONNREFUSED` errors

**Solution**:
1. Check if all microservices are running
2. Verify service URLs in `.env`
3. Ensure Docker network connectivity (if using Docker)
4. Check firewall rules

### Authentication errors
**Symptom**: 401 Unauthorized on protected routes

**Solution**:
1. Verify JWT_SECRET matches Auth Service
2. Check token expiration time
3. Ensure `Authorization: Bearer <token>` header format
4. Use `/api/auth/refresh` to renew token

### Slow response times
**Symptom**: Requests taking > 5 seconds

**Solution**:
1. Check service health: `GET /services/health`
2. Increase `SERVICE_TIMEOUT` in config
3. Check Redis connection
4. Monitor individual service performance

## 🔮 Future Enhancements

- [ ] Circuit breaker pattern for failing services
- [ ] Request rate limiting per client
- [ ] API versioning support (v1, v2)
- [ ] Request/response caching with Redis
- [ ] WebSocket support for chat (direct proxy)
- [ ] GraphQL gateway support
- [ ] Distributed tracing (OpenTelemetry)
- [ ] API documentation with Swagger/OpenAPI

## 📄 License

MIT License - Shema Music Team

---

**Last Updated**: October 10, 2025  
**Version**: 1.0.0  
**Maintainer**: Shema Music Backend Team
