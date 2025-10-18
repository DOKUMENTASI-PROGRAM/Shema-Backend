# API Testing Report
  
**Generated:** 18/10/2025, 16.09.11  
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
- Duration: 58ms

**Response:**
- Status: `200 OK`

**Response Data:**
```json
{
  "service": "api-gateway",
  "status": "healthy",
  "timestamp": "2025-10-18T09:09:09.119Z",
  "version": "1.0.0",
  "uptime": 662.680034225,
  "environment": "production"
}
```

---

#### ✅ Health Check: Services Discovery

**Request:**
- Method: `GET`
- Endpoint: `/services`
- Duration: 6ms

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
- Duration: 10ms

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
        "timestamp": "2025-10-18T09:09:09.140Z",
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
        "timestamp": "2025-10-18T09:09:09.140Z",
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
        "timestamp": "2025-10-18T09:09:09.140Z"
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
- Duration: 1079ms

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
- Duration: 271ms

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
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI4OGU3NzQwMC1mOTUyLTQyNjUtYTc4OS00MWQ5ZjdiYzgyZGIiLCJlbWFpbCI6ImFkbWluQHNoZW1hbXVzaWMuY29tIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzYwNzc4NTUwLCJleHAiOjE3NjA3Nzk0NTAsImF1ZCI6InNoZW1hLW11c2ljLWFwaSIsImlzcyI6InNoZW1hLW11c2ljLWF1dGgifQ.wEB3B6C3DgSHrA0nShAR06KPsYItVtZ6iRnROInCHpY",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI4OGU3NzQwMC1mOTUyLTQyNjUtYTc4OS00MWQ5ZjdiYzgyZGIiLCJlbWFpbCI6ImFkbWluQHNoZW1hbXVzaWMuY29tIiwiaWF0IjoxNzYwNzc4NTUwLCJleHAiOjE3NjEzODMzNTAsImF1ZCI6InNoZW1hLW11c2ljLWFwaSIsImlzcyI6InNoZW1hLW11c2ljLWF1dGgifQ.0q-m7ITZV0MhhUIVFiElIcE_oAXkROtxt6qZwnc9jWU",
    "user": {
      "id": "88e77400-f952-4265-a789-41d9f7bc82db",
      "email": "admin@shemamusic.com",
      "full_name": "System Administrator",
      "role": "admin",
      "phone_number": null,
      "created_at": "2025-10-18T07:22:21.611+00:00",
      "updated_at": "2025-10-18T09:05:35.57787+00:
... (truncated)
```

---

#### ❌ Auth: Admin Logout (POST)

**Request:**
- Method: `POST`
- Endpoint: `/api/auth/logout`
- Duration: 610ms

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
- Duration: 3ms

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
- Duration: 4ms

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
- Duration: 5ms

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
- Duration: 5ms

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
- Duration: 3ms

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
- Duration: 4ms

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
- Duration: 613ms

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
- Duration: 3ms

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
- Duration: 4ms

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
- Duration: 3ms

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
  "timestamp": "2025-10-18T09:09:09.062Z",
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
          "timestamp": "2025-10-18T09:09:09.119Z",
          "version": "1.0.0",
          "uptime": 662.680034225,
          "environment": "production"
        },
        "error": null
      },
      "duration": "58ms",
      "passed": true,
      "timestamp": "2025-10-18T09:09:09.127Z"
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
      "duration": "6ms",
      "passed": true,
      "timestamp": "2025-10-18T09:09:09.134Z"
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
                "timestamp": "2025-10-18T09:09:09.140Z",
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
                "timestamp": "2025-10-18T09:09:09.140Z",
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
                "timestamp": "2025-10-18T09:09:09.140Z"
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
                "timestamp": "2025-10-18T09:09:09.143Z",
                "version": "1.0.0",
                "features": [
                  "assessment",
                  "ai-recommendation"
                ]
              }
            }
          },
          "timestamp": "2025-10-18T09:09:09.144Z"
        },
        "error": null
      },
      "duration": "10ms",
      "passed": false,
      "timestamp": "2025-10-18T09:09:09.145Z"
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
      "duration": "1079ms",
      "passed": true,
      "timestamp": "2025-10-18T09:09:10.224Z"
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
            "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI4OGU3NzQwMC1mOTUyLTQyNjUtYTc4OS00MWQ5ZjdiYzgyZGIiLCJlbWFpbCI6ImFkbWluQHNoZW1hbXVzaWMuY29tIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzYwNzc4NTUwLCJleHAiOjE3NjA3Nzk0NTAsImF1ZCI6InNoZW1hLW11c2ljLWFwaSIsImlzcyI6InNoZW1hLW11c2ljLWF1dGgifQ.wEB3B6C3DgSHrA0nShAR06KPsYItVtZ6iRnROInCHpY",
            "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI4OGU3NzQwMC1mOTUyLTQyNjUtYTc4OS00MWQ5ZjdiYzgyZGIiLCJlbWFpbCI6ImFkbWluQHNoZW1hbXVzaWMuY29tIiwiaWF0IjoxNzYwNzc4NTUwLCJleHAiOjE3NjEzODMzNTAsImF1ZCI6InNoZW1hLW11c2ljLWFwaSIsImlzcyI6InNoZW1hLW11c2ljLWF1dGgifQ.0q-m7ITZV0MhhUIVFiElIcE_oAXkROtxt6qZwnc9jWU",
            "user": {
              "id": "88e77400-f952-4265-a789-41d9f7bc82db",
              "email": "admin@shemamusic.com",
              "full_name": "System Administrator",
              "role": "admin",
              "phone_number": null,
              "created_at": "2025-10-18T07:22:21.611+00:00",
              "updated_at": "2025-10-18T09:05:35.57787+00:00",
              "last_login_at": "2025-10-18T09:09:10.495Z"
            }
          },
          "meta": {
            "timestamp": "2025-10-18T09:09:10.495Z"
          }
        },
        "error": null
      },
      "duration": "271ms",
      "passed": true,
      "timestamp": "2025-10-18T09:09:10.496Z"
    },
    {
      "name": "User: Get All Users - Admin (GET)",
      "method": "GET",
      "endpoint": "/api/users",
      "request": {
        "headers": {
          "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI4OGU3NzQwMC1mOTUyLTQyNjUtYTc4OS00MWQ5ZjdiYzgyZGIiLCJlbWFpbCI6ImFkbWluQHNoZW1hbXVzaWMuY29tIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzYwNzc4NTUwLCJleHAiOjE3NjA3Nzk0NTAsImF1ZCI6InNoZW1hLW11c2ljLWFwaSIsImlzcyI6InNoZW1hLW11c2ljLWF1dGgifQ.wEB3B6C3DgSHrA0nShAR06KPsYItVtZ6iRnROInCHpY"
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
      "duration": "3ms",
      "passed": false,
      "timestamp": "2025-10-18T09:09:10.500Z"
    },
    {
      "name": "User: Get User Stats - Admin (GET)",
      "method": "GET",
      "endpoint": "/api/users/stats",
      "request": {
        "headers": {
          "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI4OGU3NzQwMC1mOTUyLTQyNjUtYTc4OS00MWQ5ZjdiYzgyZGIiLCJlbWFpbCI6ImFkbWluQHNoZW1hbXVzaWMuY29tIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzYwNzc4NTUwLCJleHAiOjE3NjA3Nzk0NTAsImF1ZCI6InNoZW1hLW11c2ljLWFwaSIsImlzcyI6InNoZW1hLW11c2ljLWF1dGgifQ.wEB3B6C3DgSHrA0nShAR06KPsYItVtZ6iRnROInCHpY"
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
      "timestamp": "2025-10-18T09:09:10.503Z"
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
      "duration": "4ms",
      "passed": true,
      "timestamp": "2025-10-18T09:09:10.507Z"
    },
    {
      "name": "Course: Get All Courses - Admin (GET)",
      "method": "GET",
      "endpoint": "/api/courses",
      "request": {
        "headers": {
          "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI4OGU3NzQwMC1mOTUyLTQyNjUtYTc4OS00MWQ5ZjdiYzgyZGIiLCJlbWFpbCI6ImFkbWluQHNoZW1hbXVzaWMuY29tIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzYwNzc4NTUwLCJleHAiOjE3NjA3Nzk0NTAsImF1ZCI6InNoZW1hLW11c2ljLWFwaSIsImlzcyI6InNoZW1hLW11c2ljLWF1dGgifQ.wEB3B6C3DgSHrA0nShAR06KPsYItVtZ6iRnROInCHpY"
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
      "duration": "5ms",
      "passed": true,
      "timestamp": "2025-10-18T09:09:10.512Z"
    },
    {
      "name": "Course: Create New Course - Admin (POST)",
      "method": "POST",
      "endpoint": "/api/courses",
      "request": {
        "headers": {
          "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI4OGU3NzQwMC1mOTUyLTQyNjUtYTc4OS00MWQ5ZjdiYzgyZGIiLCJlbWFpbCI6ImFkbWluQHNoZW1hbXVzaWMuY29tIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzYwNzc4NTUwLCJleHAiOjE3NjA3Nzk0NTAsImF1ZCI6InNoZW1hLW11c2ljLWFwaSIsImlzcyI6InNoZW1hLW11c2ljLWF1dGgifQ.wEB3B6C3DgSHrA0nShAR06KPsYItVtZ6iRnROInCHpY"
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
      "duration": "5ms",
      "passed": false,
      "timestamp": "2025-10-18T09:09:10.517Z"
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
      "duration": "3ms",
      "passed": true,
      "timestamp": "2025-10-18T09:09:10.520Z"
    },
    {
      "name": "Course: Update Course - Admin (PUT)",
      "method": "PUT",
      "endpoint": "/api/courses/undefined",
      "request": {
        "headers": {
          "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI4OGU3NzQwMC1mOTUyLTQyNjUtYTc4OS00MWQ5ZjdiYzgyZGIiLCJlbWFpbCI6ImFkbWluQHNoZW1hbXVzaWMuY29tIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzYwNzc4NTUwLCJleHAiOjE3NjA3Nzk0NTAsImF1ZCI6InNoZW1hLW11c2ljLWFwaSIsImlzcyI6InNoZW1hLW11c2ljLWF1dGgifQ.wEB3B6C3DgSHrA0nShAR06KPsYItVtZ6iRnROInCHpY"
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
      "duration": "4ms",
      "passed": true,
      "timestamp": "2025-10-18T09:09:10.524Z"
    },
    {
      "name": "Booking: Get Pending Bookings - Admin (GET)",
      "method": "GET",
      "endpoint": "/api/bookings/pending",
      "request": {
        "headers": {
          "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI4OGU3NzQwMC1mOTUyLTQyNjUtYTc4OS00MWQ5ZjdiYzgyZGIiLCJlbWFpbCI6ImFkbWluQHNoZW1hbXVzaWMuY29tIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzYwNzc4NTUwLCJleHAiOjE3NjA3Nzk0NTAsImF1ZCI6InNoZW1hLW11c2ljLWFwaSIsImlzcyI6InNoZW1hLW11c2ljLWF1dGgifQ.wEB3B6C3DgSHrA0nShAR06KPsYItVtZ6iRnROInCHpY"
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
      "duration": "613ms",
      "passed": false,
      "timestamp": "2025-10-18T09:09:11.138Z"
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
      "duration": "3ms",
      "passed": false,
      "timestamp": "2025-10-18T09:09:11.142Z"
    },
    {
      "name": "Aggregation: Dashboard Stats - Admin (GET)",
      "method": "GET",
      "endpoint": "/api/dashboard/stats",
      "request": {
        "headers": {
          "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI4OGU3NzQwMC1mOTUyLTQyNjUtYTc4OS00MWQ5ZjdiYzgyZGIiLCJlbWFpbCI6ImFkbWluQHNoZW1hbXVzaWMuY29tIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzYwNzc4NTUwLCJleHAiOjE3NjA3Nzk0NTAsImF1ZCI6InNoZW1hLW11c2ljLWFwaSIsImlzcyI6InNoZW1hLW11c2ljLWF1dGgifQ.wEB3B6C3DgSHrA0nShAR06KPsYItVtZ6iRnROInCHpY"
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
      "duration": "4ms",
      "passed": true,
      "timestamp": "2025-10-18T09:09:11.146Z"
    },
    {
      "name": "Aggregation: Admin Dashboard (GET)",
      "method": "GET",
      "endpoint": "/api/dashboard/admin",
      "request": {
        "headers": {
          "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI4OGU3NzQwMC1mOTUyLTQyNjUtYTc4OS00MWQ5ZjdiYzgyZGIiLCJlbWFpbCI6ImFkbWluQHNoZW1hbXVzaWMuY29tIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzYwNzc4NTUwLCJleHAiOjE3NjA3Nzk0NTAsImF1ZCI6InNoZW1hLW11c2ljLWFwaSIsImlzcyI6InNoZW1hLW11c2ljLWF1dGgifQ.wEB3B6C3DgSHrA0nShAR06KPsYItVtZ6iRnROInCHpY"
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
      "duration": "3ms",
      "passed": true,
      "timestamp": "2025-10-18T09:09:11.150Z"
    },
    {
      "name": "Auth: Admin Logout (POST)",
      "method": "POST",
      "endpoint": "/api/auth/logout",
      "request": {
        "headers": {
          "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI4OGU3NzQwMC1mOTUyLTQyNjUtYTc4OS00MWQ5ZjdiYzgyZGIiLCJlbWFpbCI6ImFkbWluQHNoZW1hbXVzaWMuY29tIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzYwNzc4NTUwLCJleHAiOjE3NjA3Nzk0NTAsImF1ZCI6InNoZW1hLW11c2ljLWFwaSIsImlzcyI6InNoZW1hLW11c2ljLWF1dGgifQ.wEB3B6C3DgSHrA0nShAR06KPsYItVtZ6iRnROInCHpY"
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
      "duration": "610ms",
      "passed": false,
      "timestamp": "2025-10-18T09:09:11.761Z"
    }
  ]
}
```

</details>

---

**Report generated automatically by test-all-endpoints.js**
