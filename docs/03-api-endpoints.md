# API Endpoints Documentation

## API Design Principles
- RESTful conventions following `/v1/resource` pattern
- Consistent error response format with status codes
- Request/response validation with schemas
- Role-based access control (instructor vs student)
- Rate limiting on resource-intensive endpoints
- API versioning for future compatibility

---

## Authentication Endpoints (Identity Service)

### Base URL
- **Service**: Identity Service
- **Port**: 3001
- **Base Path**: `/v1/auth`

### 1. Instructor Login
**Endpoint**: `POST /v1/auth/instructor/login`

**Description**: Authenticate an instructor and receive JWT token

**Request Body**:
```json
{
  "email": "instructor@example.com",
  "password": "securePassword123"
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid-123",
      "email": "instructor@example.com",
      "role": "instructor",
      "name": "John Doe"
    }
  }
}
```

**Error Response** (401 Unauthorized):
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password"
  }
}
```

### 2. Student Login
**Endpoint**: `POST /v1/auth/student/login`

**Description**: Authenticate a student and receive JWT token

**Request Body**:
```json
{
  "email": "student@example.com",
  "password": "securePassword123"
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid-456",
      "email": "student@example.com",
      "role": "student",
      "name": "Jane Smith"
    }
  }
}
```

### 3. Get Current User
**Endpoint**: `GET /v1/me`

**Description**: Get authenticated user's profile information

**Headers**:
```
Authorization: Bearer {JWT_TOKEN}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "uuid-123",
    "email": "instructor@example.com",
    "role": "instructor",
    "name": "John Doe",
    "created_at": "2025-01-15T10:30:00Z"
  }
}
```

**Error Response** (401 Unauthorized):
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired token"
  }
}
```

---

## Course Management Endpoints (Course Service)

### Base URL
- **Service**: Course Service
- **Port**: 3002
- **Base Path**: `/v1/courses`

### 1. Get All Courses
**Endpoint**: `GET /v1/courses`

**Description**: Get list of all courses (public access)

**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search by course name
- `instructor_id` (optional): Filter by instructor

**Example Request**:
```
GET /v1/courses?page=1&limit=10&search=guitar
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "courses": [
      {
        "id": "course-uuid-1",
        "name": "Beginner Guitar Lessons",
        "description": "Learn guitar from scratch",
        "price": 50000,
        "instructor_id": "uuid-123",
        "instructor_name": "John Doe",
        "duration_minutes": 60,
        "created_at": "2025-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "total_pages": 3
    }
  }
}
```

### 2. Get Course by ID
**Endpoint**: `GET /v1/courses/:id`

**Description**: Get detailed information about a specific course

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "course-uuid-1",
    "name": "Beginner Guitar Lessons",
    "description": "Learn guitar from scratch with comprehensive curriculum",
    "price": 50000,
    "instructor_id": "uuid-123",
    "instructor_name": "John Doe",
    "duration_minutes": 60,
    "max_students": 10,
    "current_students": 5,
    "schedule": ["Monday 10:00", "Wednesday 14:00"],
    "created_at": "2025-01-15T10:30:00Z",
    "updated_at": "2025-01-20T15:45:00Z"
  }
}
```

**Error Response** (404 Not Found):
```json
{
  "success": false,
  "error": {
    "code": "COURSE_NOT_FOUND",
    "message": "Course with ID 'course-uuid-1' not found"
  }
}
```

### 3. Create Course
**Endpoint**: `POST /v1/courses`

**Description**: Create a new course (instructor only)

**Headers**:
```
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json
```

**Request Body**:
```json
{
  "name": "Advanced Piano Techniques",
  "description": "Master advanced piano playing techniques",
  "price": 100000,
  "duration_minutes": 90,
  "max_students": 8,
  "schedule": ["Tuesday 15:00", "Thursday 15:00"]
}
```

**Success Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "course-uuid-new",
    "name": "Advanced Piano Techniques",
    "description": "Master advanced piano playing techniques",
    "price": 100000,
    "instructor_id": "uuid-123",
    "duration_minutes": 90,
    "max_students": 8,
    "current_students": 0,
    "schedule": ["Tuesday 15:00", "Thursday 15:00"],
    "created_at": "2025-03-01T10:00:00Z"
  }
}
```

**Error Response** (403 Forbidden):
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Only instructors can create courses"
  }
}
```

**Error Response** (400 Bad Request):
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "price",
        "message": "Price must be a positive number"
      }
    ]
  }
}
```

### 4. Update Course
**Endpoint**: `PUT /v1/courses/:id`

**Description**: Update an existing course (instructor only, own courses)

**Headers**:
```
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json
```

**Request Body** (partial update allowed):
```json
{
  "price": 120000,
  "max_students": 10,
  "description": "Updated description"
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "course-uuid-1",
    "name": "Advanced Piano Techniques",
    "description": "Updated description",
    "price": 120000,
    "max_students": 10,
    "updated_at": "2025-03-05T14:30:00Z"
  }
}
```

**Error Response** (403 Forbidden):
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "You can only update your own courses"
  }
}
```

### 5. Delete Course
**Endpoint**: `DELETE /v1/courses/:id`

**Description**: Delete a course (instructor only, own courses)

**Headers**:
```
Authorization: Bearer {JWT_TOKEN}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Course deleted successfully"
}
```

**Error Response** (404 Not Found):
```json
{
  "success": false,
  "error": {
    "code": "COURSE_NOT_FOUND",
    "message": "Course not found"
  }
}
```

---

## Chat Endpoints (Chat Service)

### Base URL
- **Service**: Chat Service
- **Port**: 3003
- **Base Path**: `/v1/chat`

### 1. Create Chat Session
**Endpoint**: `POST /v1/chat/sessions`

**Description**: Create a new chat session for the authenticated user

**Headers**:
```
Authorization: Bearer {JWT_TOKEN}
```

**Request Body** (optional):
```json
{
  "title": "Questions about guitar lessons"
}
```

**Success Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "session_id": "session-uuid-1",
    "user_id": "uuid-456",
    "title": "Questions about guitar lessons",
    "created_at": "2025-03-01T10:00:00Z"
  }
}
```

### 2. Get Chat Messages
**Endpoint**: `GET /v1/chat/sessions/:id/messages`

**Description**: Get all messages in a chat session

**Headers**:
```
Authorization: Bearer {JWT_TOKEN}
```

**Query Parameters**:
- `limit` (optional): Number of messages (default: 50)
- `before` (optional): Get messages before this message ID

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "session_id": "session-uuid-1",
    "messages": [
      {
        "id": "msg-uuid-1",
        "role": "user",
        "content": "What are the best guitar lessons for beginners?",
        "created_at": "2025-03-01T10:05:00Z"
      },
      {
        "id": "msg-uuid-2",
        "role": "assistant",
        "content": "For beginners, I recommend starting with...",
        "created_at": "2025-03-01T10:05:03Z"
      }
    ],
    "has_more": false
  }
}
```

### 3. Send Chat Message
**Endpoint**: `POST /v1/chat/sessions/:id/messages`

**Description**: Send a message to the chatbot and get AI response

**Headers**:
```
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json
```

**Request Body**:
```json
{
  "content": "What are the best guitar lessons for beginners?"
}
```

**Success Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "user_message": {
      "id": "msg-uuid-1",
      "role": "user",
      "content": "What are the best guitar lessons for beginners?",
      "created_at": "2025-03-01T10:05:00Z"
    },
    "assistant_message": {
      "id": "msg-uuid-2",
      "role": "assistant",
      "content": "For beginners, I recommend starting with our 'Beginner Guitar Lessons' course. It covers fundamental techniques, basic chords, and music theory. The course is 60 minutes per session and costs 50,000 IDR.",
      "created_at": "2025-03-01T10:05:03Z"
    }
  }
}
```

**Error Response** (429 Too Many Requests):
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many messages. Please wait before sending another message.",
    "retry_after": 60
  }
}
```

**Error Response** (503 Service Unavailable):
```json
{
  "success": false,
  "error": {
    "code": "CHATGPT_API_ERROR",
    "message": "ChatGPT API is currently unavailable. Please try again later."
  }
}
```

---

## HTTP Status Codes

### Success Codes
- **200 OK**: Request succeeded
- **201 Created**: Resource created successfully
- **204 No Content**: Request succeeded with no response body

### Client Error Codes
- **400 Bad Request**: Invalid request format or validation error
- **401 Unauthorized**: Authentication required or invalid token
- **403 Forbidden**: Authenticated but not authorized for this action
- **404 Not Found**: Resource not found
- **409 Conflict**: Resource conflict (e.g., duplicate entry)
- **429 Too Many Requests**: Rate limit exceeded

### Server Error Codes
- **500 Internal Server Error**: Unexpected server error
- **503 Service Unavailable**: Service temporarily unavailable

---

## API Best Practices

### Authentication
- Include JWT token in `Authorization` header: `Bearer {token}`
- Tokens expire after 24 hours (configurable)
- Refresh token before expiration

### Error Handling
- All errors follow consistent format with `success`, `error.code`, and `error.message`
- Validation errors include `details` array with field-specific errors
- Use appropriate HTTP status codes

### Pagination
- Use `page` and `limit` query parameters
- Response includes `pagination` object with metadata
- Maximum `limit` is 100 items

### Rate Limiting
- Chat endpoints: 20 messages per minute per user
- Other endpoints: 100 requests per minute per IP
- Rate limit info in response headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`

### Validation
- All input validated before processing
- Required fields checked
- Data types validated
- Business rules enforced (e.g., price > 0)

### Versioning
- All endpoints prefixed with `/v1`
- Future versions will use `/v2`, `/v3`, etc.
- Backward compatibility maintained within major versions
