# API Testing Report
  
**Generated:** 18/10/2025, 14.23.46  
**Base URL:** http://localhost:3000  
**Total Tests:** 17  
**Passed:** ✅ 10  
**Failed:** ❌ 7  
**Success Rate:** 58.82%

---

## Test Summary by Category

### Health Check
- Total: 3
- Passed: ✅ 2
- Failed: ❌ 1

### Auth
- Total: 3
- Passed: ✅ 2
- Failed: ❌ 1

### User
- Total: 2
- Passed: ✅ 0
- Failed: ❌ 2

### Course
- Total: 5
- Passed: ✅ 4
- Failed: ❌ 1

### Booking
- Total: 1
- Passed: ✅ 0
- Failed: ❌ 1

### Customer
- Total: 1
- Passed: ✅ 0
- Failed: ❌ 1

### Aggregation
- Total: 2
- Passed: ✅ 2
- Failed: ❌ 0

---

## Detailed Test Results

### Health Check

#### ✅ Health Check: Gateway Health

**Request:**
- Method: `GET`
- Endpoint: `/health`
- Duration: 139ms

**Response:**
- Status: `200 OK`

**Response Data:**
```json
{
  "service": "api-gateway",
  "status": "healthy",
  "timestamp": "2025-10-18T07:23:43.154Z",
  "version": "1.0.0",
  "uptime": 3921.623860148,
  "environment": "production"
}
```

---

#### ✅ Health Check: Services Discovery

**Request:**
- Method: `GET`
- Endpoint: `/services`
- Duration: 18ms

**Response:**
- Status: `200 OK`

**Response Data:**
```json
{
  "success": true,
  "data": {
    "gateway": {
      "port": 3000,
      "environment": "production"
    },
    "services": {
      "auth": "http://auth-service:3001",
      "course": "http://course-service:3003",
      "booking": "http://booking-service:3004",
      "recommendation": "http://recommendation-service:3005"
    }
  }
}
```

---

#### ❌ Health Check: All Services Health

**Request:**
- Method: `GET`
- Endpoint: `/services/health`
- Duration: 18ms

**Response:**
- Status: `503 Service Unavailable`

**Response Data:**
```json
{
  "success": true,
  "overallStatus": "degraded",
  "services": {
    "auth": {
      "status": "healthy",
      "data": {
        "service": "auth-service",
        "status": "healthy",
        "timestamp": "2025-10-18T07:23:43.207Z",
        "version": "1.0.0",
        "authMethods": [
          "jwt",
          "firebase"
        ]
      }
    },
    "user": {
      "status": "unhealthy",
      "error": "fetch() URL is invalid"
    },
    "course": {
      "status": "healthy",
      "data": {
        "service": "course-service",
        "status": "healthy",
        "timestamp": "2025-10-18T07:23:43.199Z",
        "version": "1.0.0",
        "endpoints": [
          "courses",
          "categories",
          "instructors"
        ]
      }
    },
    "booking": {
      "status": "healthy",
      "data": {
        "status": "healthy",
        "service": "booking-service",
        "environment": "production",
        "timestamp": "2025-10-18T07:23:43.199Z"
      }
    },
    "chat"
... (truncated)
```

---

### Auth

#### ✅ Auth: User Login (POST) - Expected to fail (only admins)

**Request:**
- Method: `POST`
- Endpoint: `/api/auth/login`
- Duration: 1361ms

**Request Body:**
```json
{
  "email": "kiana@gmail.com",
  "password": "Kiana423"
}
```

**Response:**
- Status: `401 Unauthorized`

**Response Data:**
```json
{
  "success": false,
  "error": {
    "code": "AUTH_INVALID_CREDENTIALS",
    "message": "Invalid email or password"
  }
}
```

---

#### ✅ Auth: Admin Login (POST)

**Request:**
- Method: `POST`
- Endpoint: `/api/auth/login`
- Duration: 816ms

**Request Body:**
```json
{
  "email": "admin@shemamusic.com",
  "password": "Admin123!"
}
```

**Response:**
- Status: `200 OK`

**Response Data:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI4OGU3NzQwMC1mOTUyLTQyNjUtYTc4OS00MWQ5ZjdiYzgyZGIiLCJlbWFpbCI6ImFkbWluQHNoZW1hbXVzaWMuY29tIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzYwNzcyMjI1LCJleHAiOjE3NjA3NzMxMjUsImF1ZCI6InNoZW1hLW11c2ljLWFwaSIsImlzcyI6InNoZW1hLW11c2ljLWF1dGgifQ.DHhdtK0zmwfLQyeYP22YAPyrn7zAOOe_4awwT9br9rs",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI4OGU3NzQwMC1mOTUyLTQyNjUtYTc4OS00MWQ5ZjdiYzgyZGIiLCJlbWFpbCI6ImFkbWluQHNoZW1hbXVzaWMuY29tIiwiaWF0IjoxNzYwNzcyMjI1LCJleHAiOjE3NjEzNzcwMjUsImF1ZCI6InNoZW1hLW11c2ljLWFwaSIsImlzcyI6InNoZW1hLW11c2ljLWF1dGgifQ.JqJ34Al0tXchdpOl4xkS4AobZphasyIcsbZDH9LzN38",
    "user": {
      "id": "88e77400-f952-4265-a789-41d9f7bc82db",
      "email": "admin@shemamusic.com",
      "full_name": "System Administrator",
      "role": "admin",
      "phone_number": null,
      "created_at": "2025-10-18T07:22:21.611+00:00",
      "updated_at": "2025-10-18T07:22:21.580169+00
... (truncated)
```

---

#### ❌ Auth: Admin Logout (POST)

**Request:**
- Method: `POST`
- Endpoint: `/api/auth/logout`
- Duration: 611ms

**Response:**
- Status: `500 Internal Server Error`

**Response Data:**
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

---

### User

#### ❌ User: Get All Users - Admin (GET)

**Request:**
- Method: `GET`
- Endpoint: `/api/users`
- Duration: 2ms

**Response:**
- Status: `404 Not Found`

**Response Data:**
```json
{
  "success": false,
  "error": {
    "code": "ROUTE_NOT_FOUND",
    "message": "The requested route does not exist",
    "path": "/api/users",
    "method": "GET"
  }
}
```

---

#### ❌ User: Get User Stats - Admin (GET)

**Request:**
- Method: `GET`
- Endpoint: `/api/users/stats`
- Duration: 2ms

**Response:**
- Status: `404 Not Found`

**Response Data:**
```json
{
  "success": false,
  "error": {
    "code": "ROUTE_NOT_FOUND",
    "message": "The requested route does not exist",
    "path": "/api/users/stats",
    "method": "GET"
  }
}
```

---

### Course

#### ✅ Course: Get All Courses - Public (GET)

**Request:**
- Method: `GET`
- Endpoint: `/api/courses`
- Duration: 3ms

**Response:**
- Status: `200 OK`

**Response Data:**
```json
{
  "success": true,
  "message": "Courses endpoint - Coming soon",
  "data": []
}
```

---

#### ✅ Course: Get All Courses - Admin (GET)

**Request:**
- Method: `GET`
- Endpoint: `/api/courses`
- Duration: 6ms

**Response:**
- Status: `200 OK`

**Response Data:**
```json
{
  "success": true,
  "message": "Courses endpoint - Coming soon",
  "data": []
}
```

---

#### ❌ Course: Create New Course - Admin (POST)

**Request:**
- Method: `POST`
- Endpoint: `/api/courses`
- Duration: 34ms

**Request Body:**
```json
{
  "title": "Test Guitar Course",
  "description": "A comprehensive guitar course for beginners",
  "level": "beginner",
  "price_per_session": 500000,
  "duration_minutes": 90,
  "max_students": 5,
  "is_active": true
}
```

**Response:**
- Status: `200 OK`

**Response Data:**
```json
{
  "success": true,
  "message": "Course creation endpoint - Coming soon",
  "data": {}
}
```

---

#### ✅ Course: Get Course by ID (GET)

**Request:**
- Method: `GET`
- Endpoint: `/api/courses/undefined`
- Duration: 4ms

**Response:**
- Status: `200 OK`

**Response Data:**
```json
{
  "success": true,
  "message": "Course undefined endpoint - Coming soon",
  "data": {
    "id": "undefined"
  }
}
```

---

#### ✅ Course: Update Course - Admin (PUT)

**Request:**
- Method: `PUT`
- Endpoint: `/api/courses/undefined`
- Duration: 6ms

**Request Body:**
```json
{
  "title": "Test Guitar Course - Updated",
  "price_per_session": 550000
}
```

**Response:**
- Status: `200 OK`

**Response Data:**
```json
{
  "success": true,
  "message": "Course undefined update endpoint - Coming soon",
  "data": {
    "id": "undefined"
  }
}
```

---

### Booking

#### ❌ Booking: Get Pending Bookings - Admin (GET)

**Request:**
- Method: `GET`
- Endpoint: `/api/bookings/pending`
- Duration: 611ms

**Response:**
- Status: `404 Not Found`

**Response Data:**
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Endpoint not found"
  }
}
```

---

### Customer

#### ❌ Customer: Create Guest Chat Session (POST)

**Request:**
- Method: `POST`
- Endpoint: `/api/cs/sessions`
- Duration: 1ms

**Request Body:**
```json
{
  "guest_name": "Test Guest User",
  "guest_email": "testguest@example.com"
}
```

**Response:**
- Status: `404 Not Found`

**Response Data:**
```json
{
  "success": false,
  "error": {
    "code": "ROUTE_NOT_FOUND",
    "message": "The requested route does not exist",
    "path": "/api/cs/sessions",
    "method": "POST"
  }
}
```

---

### Aggregation

#### ✅ Aggregation: Dashboard Stats - Admin (GET)

**Request:**
- Method: `GET`
- Endpoint: `/api/dashboard/stats`
- Duration: 12ms

**Response:**
- Status: `200 OK`

**Response Data:**
```json
{
  "success": true,
  "data": {
    "totalStudents": 0,
    "pendingBookings": 0,
    "activeChats": 0,
    "coursesAvailable": 0,
    "servicesHealth": {
      "userService": false,
      "bookingService": false,
      "chatService": false,
      "courseService": true
    }
  }
}
```

---

#### ✅ Aggregation: Admin Dashboard (GET)

**Request:**
- Method: `GET`
- Endpoint: `/api/dashboard/admin`
- Duration: 5ms

**Response:**
- Status: `200 OK`

**Response Data:**
```json
{
  "success": true,
  "data": {
    "pendingBookings": [],
    "activeChatSessions": [],
    "statistics": {},
    "servicesHealth": {
      "bookingService": false,
      "chatService": false,
      "userService": false
    }
  }
}
```

---

## Raw Test Data

<details>
<summary>Click to expand JSON data</summary>

```json
{
  "timestamp": "2025-10-18T07:23:43.009Z",
  "baseUrl": "http://localhost:3000",
  "summary": {
    "total": 17,
    "passed": 10,
    "failed": 7
  },
  "tests": [
    {
      "name": "Health Check: Gateway Health",
      "method": "GET",
      "endpoint": "/health",
      "request": {
        "headers": {},
        "body": null
      },
      "response": {
        "status": 200,
        "statusText": "OK",
        "data": {
          "service": "api-gateway",
          "status": "healthy",
          "timestamp": "2025-10-18T07:23:43.154Z",
          "version": "1.0.0",
          "uptime": 3921.623860148,
          "environment": "production"
        },
        "error": null
      },
      "duration": "139ms",
      "passed": true,
      "timestamp": "2025-10-18T07:23:43.174Z"
    },
    {
      "name": "Health Check: Services Discovery",
      "method": "GET",
      "endpoint": "/services",
      "request": {
        "headers": {},
        "body": null
      },
      "response": {
        "status": 200,
        "statusText": "OK",
        "data": {
          "success": true,
          "data": {
            "gateway": {
              "port": 3000,
              "environment": "production"
            },
            "services": {
              "auth": "http://auth-service:3001",
              "course": "http://course-service:3003",
              "booking": "http://booking-service:3004",
              "recommendation": "http://recommendation-service:3005"
            }
          }
        },
        "error": null
      },
      "duration": "18ms",
      "passed": true,
      "timestamp": "2025-10-18T07:23:43.194Z"
    },
    {
      "name": "Health Check: All Services Health",
      "method": "GET",
      "endpoint": "/services/health",
      "request": {
        "headers": {},
        "body": null
      },
      "response": {
        "status": 503,
        "statusText": "Service Unavailable",
        "data": {
          "success": true,
          "overallStatus": "degraded",
          "services": {
            "auth": {
              "status": "healthy",
              "data": {
                "service": "auth-service",
                "status": "healthy",
                "timestamp": "2025-10-18T07:23:43.207Z",
                "version": "1.0.0",
                "authMethods": [
                  "jwt",
                  "firebase"
                ]
              }
            },
            "user": {
              "status": "unhealthy",
              "error": "fetch() URL is invalid"
            },
            "course": {
              "status": "healthy",
              "data": {
                "service": "course-service",
                "status": "healthy",
                "timestamp": "2025-10-18T07:23:43.199Z",
                "version": "1.0.0",
                "endpoints": [
                  "courses",
                  "categories",
                  "instructors"
                ]
              }
            },
            "booking": {
              "status": "healthy",
              "data": {
                "status": "healthy",
                "service": "booking-service",
                "environment": "production",
                "timestamp": "2025-10-18T07:23:43.199Z"
              }
            },
            "chat": {
              "status": "unhealthy",
              "error": "fetch() URL is invalid"
            },
            "recommendation": {
              "status": "healthy",
              "data": {
                "service": "recommendation-service",
                "status": "healthy",
                "timestamp": "2025-10-18T07:23:43.200Z",
                "version": "1.0.0",
                "features": [
                  "assessment",
                  "ai-recommendation"
                ]
              }
            }
          },
          "timestamp": "2025-10-18T07:23:43.209Z"
        },
        "error": null
      },
      "duration": "18ms",
      "passed": false,
      "timestamp": "2025-10-18T07:23:43.212Z"
    },
    {
      "name": "Auth: User Login (POST) - Expected to fail (only admins)",
      "method": "POST",
      "endpoint": "/api/auth/login",
      "request": {
        "headers": {},
        "body": {
          "email": "kiana@gmail.com",
          "password": "Kiana423"
        }
      },
      "response": {
        "status": 401,
        "statusText": "Unauthorized",
        "data": {
          "success": false,
          "error": {
            "code": "AUTH_INVALID_CREDENTIALS",
            "message": "Invalid email or password"
          }
        },
        "error": null
      },
      "duration": "1361ms",
      "passed": true,
      "timestamp": "2025-10-18T07:23:44.574Z"
    },
    {
      "name": "Auth: Admin Login (POST)",
      "method": "POST",
      "endpoint": "/api/auth/login",
      "request": {
        "headers": {},
        "body": {
          "email": "admin@shemamusic.com",
          "password": "Admin123!"
        }
      },
      "response": {
        "status": 200,
        "statusText": "OK",
        "data": {
          "success": true,
          "data": {
            "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI4OGU3NzQwMC1mOTUyLTQyNjUtYTc4OS00MWQ5ZjdiYzgyZGIiLCJlbWFpbCI6ImFkbWluQHNoZW1hbXVzaWMuY29tIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzYwNzcyMjI1LCJleHAiOjE3NjA3NzMxMjUsImF1ZCI6InNoZW1hLW11c2ljLWFwaSIsImlzcyI6InNoZW1hLW11c2ljLWF1dGgifQ.DHhdtK0zmwfLQyeYP22YAPyrn7zAOOe_4awwT9br9rs",
            "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI4OGU3NzQwMC1mOTUyLTQyNjUtYTc4OS00MWQ5ZjdiYzgyZGIiLCJlbWFpbCI6ImFkbWluQHNoZW1hbXVzaWMuY29tIiwiaWF0IjoxNzYwNzcyMjI1LCJleHAiOjE3NjEzNzcwMjUsImF1ZCI6InNoZW1hLW11c2ljLWFwaSIsImlzcyI6InNoZW1hLW11c2ljLWF1dGgifQ.JqJ34Al0tXchdpOl4xkS4AobZphasyIcsbZDH9LzN38",
            "user": {
              "id": "88e77400-f952-4265-a789-41d9f7bc82db",
              "email": "admin@shemamusic.com",
              "full_name": "System Administrator",
              "role": "admin",
              "phone_number": null,
              "created_at": "2025-10-18T07:22:21.611+00:00",
              "updated_at": "2025-10-18T07:22:21.580169+00:00",
              "last_login_at": "2025-10-18T07:23:45.388Z"
            }
          },
          "meta": {
            "timestamp": "2025-10-18T07:23:45.388Z"
          }
        },
        "error": null
      },
      "duration": "816ms",
      "passed": true,
      "timestamp": "2025-10-18T07:23:45.390Z"
    },
    {
      "name": "User: Get All Users - Admin (GET)",
      "method": "GET",
      "endpoint": "/api/users",
      "request": {
        "headers": {
          "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI4OGU3NzQwMC1mOTUyLTQyNjUtYTc4OS00MWQ5ZjdiYzgyZGIiLCJlbWFpbCI6ImFkbWluQHNoZW1hbXVzaWMuY29tIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzYwNzcyMjI1LCJleHAiOjE3NjA3NzMxMjUsImF1ZCI6InNoZW1hLW11c2ljLWFwaSIsImlzcyI6InNoZW1hLW11c2ljLWF1dGgifQ.DHhdtK0zmwfLQyeYP22YAPyrn7zAOOe_4awwT9br9rs"
        },
        "body": null
      },
      "response": {
        "status": 404,
        "statusText": "Not Found",
        "data": {
          "success": false,
          "error": {
            "code": "ROUTE_NOT_FOUND",
            "message": "The requested route does not exist",
            "path": "/api/users",
            "method": "GET"
          }
        },
        "error": null
      },
      "duration": "2ms",
      "passed": false,
      "timestamp": "2025-10-18T07:23:45.393Z"
    },
    {
      "name": "User: Get User Stats - Admin (GET)",
      "method": "GET",
      "endpoint": "/api/users/stats",
      "request": {
        "headers": {
          "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI4OGU3NzQwMC1mOTUyLTQyNjUtYTc4OS00MWQ5ZjdiYzgyZGIiLCJlbWFpbCI6ImFkbWluQHNoZW1hbXVzaWMuY29tIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzYwNzcyMjI1LCJleHAiOjE3NjA3NzMxMjUsImF1ZCI6InNoZW1hLW11c2ljLWFwaSIsImlzcyI6InNoZW1hLW11c2ljLWF1dGgifQ.DHhdtK0zmwfLQyeYP22YAPyrn7zAOOe_4awwT9br9rs"
        },
        "body": null
      },
      "response": {
        "status": 404,
        "statusText": "Not Found",
        "data": {
          "success": false,
          "error": {
            "code": "ROUTE_NOT_FOUND",
            "message": "The requested route does not exist",
            "path": "/api/users/stats",
            "method": "GET"
          }
        },
        "error": null
      },
      "duration": "2ms",
      "passed": false,
      "timestamp": "2025-10-18T07:23:45.396Z"
    },
    {
      "name": "Course: Get All Courses - Public (GET)",
      "method": "GET",
      "endpoint": "/api/courses",
      "request": {
        "headers": {},
        "body": null
      },
      "response": {
        "status": 200,
        "statusText": "OK",
        "data": {
          "success": true,
          "message": "Courses endpoint - Coming soon",
          "data": []
        },
        "error": null
      },
      "duration": "3ms",
      "passed": true,
      "timestamp": "2025-10-18T07:23:45.399Z"
    },
    {
      "name": "Course: Get All Courses - Admin (GET)",
      "method": "GET",
      "endpoint": "/api/courses",
      "request": {
        "headers": {
          "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI4OGU3NzQwMC1mOTUyLTQyNjUtYTc4OS00MWQ5ZjdiYzgyZGIiLCJlbWFpbCI6ImFkbWluQHNoZW1hbXVzaWMuY29tIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzYwNzcyMjI1LCJleHAiOjE3NjA3NzMxMjUsImF1ZCI6InNoZW1hLW11c2ljLWFwaSIsImlzcyI6InNoZW1hLW11c2ljLWF1dGgifQ.DHhdtK0zmwfLQyeYP22YAPyrn7zAOOe_4awwT9br9rs"
        },
        "body": null
      },
      "response": {
        "status": 200,
        "statusText": "OK",
        "data": {
          "success": true,
          "message": "Courses endpoint - Coming soon",
          "data": []
        },
        "error": null
      },
      "duration": "6ms",
      "passed": true,
      "timestamp": "2025-10-18T07:23:45.406Z"
    },
    {
      "name": "Course: Create New Course - Admin (POST)",
      "method": "POST",
      "endpoint": "/api/courses",
      "request": {
        "headers": {
          "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI4OGU3NzQwMC1mOTUyLTQyNjUtYTc4OS00MWQ5ZjdiYzgyZGIiLCJlbWFpbCI6ImFkbWluQHNoZW1hbXVzaWMuY29tIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzYwNzcyMjI1LCJleHAiOjE3NjA3NzMxMjUsImF1ZCI6InNoZW1hLW11c2ljLWFwaSIsImlzcyI6InNoZW1hLW11c2ljLWF1dGgifQ.DHhdtK0zmwfLQyeYP22YAPyrn7zAOOe_4awwT9br9rs"
        },
        "body": {
          "title": "Test Guitar Course",
          "description": "A comprehensive guitar course for beginners",
          "level": "beginner",
          "price_per_session": 500000,
          "duration_minutes": 90,
          "max_students": 5,
          "is_active": true
        }
      },
      "response": {
        "status": 200,
        "statusText": "OK",
        "data": {
          "success": true,
          "message": "Course creation endpoint - Coming soon",
          "data": {}
        },
        "error": null
      },
      "duration": "34ms",
      "passed": false,
      "timestamp": "2025-10-18T07:23:45.440Z"
    },
    {
      "name": "Course: Get Course by ID (GET)",
      "method": "GET",
      "endpoint": "/api/courses/undefined",
      "request": {
        "headers": {},
        "body": null
      },
      "response": {
        "status": 200,
        "statusText": "OK",
        "data": {
          "success": true,
          "message": "Course undefined endpoint - Coming soon",
          "data": {
            "id": "undefined"
          }
        },
        "error": null
      },
      "duration": "4ms",
      "passed": true,
      "timestamp": "2025-10-18T07:23:45.445Z"
    },
    {
      "name": "Course: Update Course - Admin (PUT)",
      "method": "PUT",
      "endpoint": "/api/courses/undefined",
      "request": {
        "headers": {
          "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI4OGU3NzQwMC1mOTUyLTQyNjUtYTc4OS00MWQ5ZjdiYzgyZGIiLCJlbWFpbCI6ImFkbWluQHNoZW1hbXVzaWMuY29tIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzYwNzcyMjI1LCJleHAiOjE3NjA3NzMxMjUsImF1ZCI6InNoZW1hLW11c2ljLWFwaSIsImlzcyI6InNoZW1hLW11c2ljLWF1dGgifQ.DHhdtK0zmwfLQyeYP22YAPyrn7zAOOe_4awwT9br9rs"
        },
        "body": {
          "title": "Test Guitar Course - Updated",
          "price_per_session": 550000
        }
      },
      "response": {
        "status": 200,
        "statusText": "OK",
        "data": {
          "success": true,
          "message": "Course undefined update endpoint - Coming soon",
          "data": {
            "id": "undefined"
          }
        },
        "error": null
      },
      "duration": "6ms",
      "passed": true,
      "timestamp": "2025-10-18T07:23:45.451Z"
    },
    {
      "name": "Booking: Get Pending Bookings - Admin (GET)",
      "method": "GET",
      "endpoint": "/api/bookings/pending",
      "request": {
        "headers": {
          "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI4OGU3NzQwMC1mOTUyLTQyNjUtYTc4OS00MWQ5ZjdiYzgyZGIiLCJlbWFpbCI6ImFkbWluQHNoZW1hbXVzaWMuY29tIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzYwNzcyMjI1LCJleHAiOjE3NjA3NzMxMjUsImF1ZCI6InNoZW1hLW11c2ljLWFwaSIsImlzcyI6InNoZW1hLW11c2ljLWF1dGgifQ.DHhdtK0zmwfLQyeYP22YAPyrn7zAOOe_4awwT9br9rs"
        },
        "body": null
      },
      "response": {
        "status": 404,
        "statusText": "Not Found",
        "data": {
          "success": false,
          "error": {
            "code": "NOT_FOUND",
            "message": "Endpoint not found"
          }
        },
        "error": null
      },
      "duration": "611ms",
      "passed": false,
      "timestamp": "2025-10-18T07:23:46.062Z"
    },
    {
      "name": "Customer: Create Guest Chat Session (POST)",
      "method": "POST",
      "endpoint": "/api/cs/sessions",
      "request": {
        "headers": {},
        "body": {
          "guest_name": "Test Guest User",
          "guest_email": "testguest@example.com"
        }
      },
      "response": {
        "status": 404,
        "statusText": "Not Found",
        "data": {
          "success": false,
          "error": {
            "code": "ROUTE_NOT_FOUND",
            "message": "The requested route does not exist",
            "path": "/api/cs/sessions",
            "method": "POST"
          }
        },
        "error": null
      },
      "duration": "1ms",
      "passed": false,
      "timestamp": "2025-10-18T07:23:46.064Z"
    },
    {
      "name": "Aggregation: Dashboard Stats - Admin (GET)",
      "method": "GET",
      "endpoint": "/api/dashboard/stats",
      "request": {
        "headers": {
          "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI4OGU3NzQwMC1mOTUyLTQyNjUtYTc4OS00MWQ5ZjdiYzgyZGIiLCJlbWFpbCI6ImFkbWluQHNoZW1hbXVzaWMuY29tIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzYwNzcyMjI1LCJleHAiOjE3NjA3NzMxMjUsImF1ZCI6InNoZW1hLW11c2ljLWFwaSIsImlzcyI6InNoZW1hLW11c2ljLWF1dGgifQ.DHhdtK0zmwfLQyeYP22YAPyrn7zAOOe_4awwT9br9rs"
        },
        "body": null
      },
      "response": {
        "status": 200,
        "statusText": "OK",
        "data": {
          "success": true,
          "data": {
            "totalStudents": 0,
            "pendingBookings": 0,
            "activeChats": 0,
            "coursesAvailable": 0,
            "servicesHealth": {
              "userService": false,
              "bookingService": false,
              "chatService": false,
              "courseService": true
            }
          }
        },
        "error": null
      },
      "duration": "12ms",
      "passed": true,
      "timestamp": "2025-10-18T07:23:46.077Z"
    },
    {
      "name": "Aggregation: Admin Dashboard (GET)",
      "method": "GET",
      "endpoint": "/api/dashboard/admin",
      "request": {
        "headers": {
          "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI4OGU3NzQwMC1mOTUyLTQyNjUtYTc4OS00MWQ5ZjdiYzgyZGIiLCJlbWFpbCI6ImFkbWluQHNoZW1hbXVzaWMuY29tIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzYwNzcyMjI1LCJleHAiOjE3NjA3NzMxMjUsImF1ZCI6InNoZW1hLW11c2ljLWFwaSIsImlzcyI6InNoZW1hLW11c2ljLWF1dGgifQ.DHhdtK0zmwfLQyeYP22YAPyrn7zAOOe_4awwT9br9rs"
        },
        "body": null
      },
      "response": {
        "status": 200,
        "statusText": "OK",
        "data": {
          "success": true,
          "data": {
            "pendingBookings": [],
            "activeChatSessions": [],
            "statistics": {},
            "servicesHealth": {
              "bookingService": false,
              "chatService": false,
              "userService": false
            }
          }
        },
        "error": null
      },
      "duration": "5ms",
      "passed": true,
      "timestamp": "2025-10-18T07:23:46.082Z"
    },
    {
      "name": "Auth: Admin Logout (POST)",
      "method": "POST",
      "endpoint": "/api/auth/logout",
      "request": {
        "headers": {
          "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI4OGU3NzQwMC1mOTUyLTQyNjUtYTc4OS00MWQ5ZjdiYzgyZGIiLCJlbWFpbCI6ImFkbWluQHNoZW1hbXVzaWMuY29tIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzYwNzcyMjI1LCJleHAiOjE3NjA3NzMxMjUsImF1ZCI6InNoZW1hLW11c2ljLWFwaSIsImlzcyI6InNoZW1hLW11c2ljLWF1dGgifQ.DHhdtK0zmwfLQyeYP22YAPyrn7zAOOe_4awwT9br9rs"
        },
        "body": null
      },
      "response": {
        "status": 500,
        "statusText": "Internal Server Error",
        "data": {
          "success": false,
          "error": {
            "code": "INTERNAL_SERVER_ERROR",
            "message": "An unexpected error occurred"
          }
        },
        "error": null
      },
      "duration": "611ms",
      "passed": false,
      "timestamp": "2025-10-18T07:23:46.694Z"
    }
  ]
}
```

</details>

---

**Report generated automatically by test-all-endpoints.js**
