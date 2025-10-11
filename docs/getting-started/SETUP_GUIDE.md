# 🚀 Shema Music Backend - Complete Setup Guide

## 📋 Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Quick Start with Docker](#quick-start-with-docker)
4. [Local Development Setup](#local-development-setup)
5. [Testing the API Gateway](#testing-the-api-gateway)
6. [Accessing Services](#accessing-services)
7. [Troubleshooting](#troubleshooting)

## Overview

Shema Music Backend is a microservices architecture with:
- **API Gateway** (Port 3000) - Entry point for all requests
- **Auth Service** (Port 3001) - Authentication & authorization
- **User Service** (Port 3002) - User profile management
- **Course Service** (Port 3003) - Course & schedule management
- **Booking Service** (Port 3004) - Booking system
- **Chat Service** (Port 3005) - Real-time live chat
- **Recommendation Service** (Port 3006) - AI-based recommendations
- **Redis** (Port 6379) - Caching & pub/sub

## Prerequisites

### For Docker Setup (Recommended)
- Docker Desktop (Windows/Mac) or Docker Engine (Linux)
- Docker Compose v2.0+
- Git

### For Local Development
- Bun runtime v1.0+
- Node.js v18+ (alternative)
- Redis server
- Git
- Supabase account

## Quick Start with Docker

### 1. Clone the Repository
```bash
git clone <repository-url>
cd Backend
```

### 2. Configure Environment
```bash
# Copy the Docker environment template
cp .env.docker.example .env.docker

# Edit .env.docker with your credentials
# IMPORTANT: Change JWT secrets and add Supabase credentials
```

### 3. Start All Services
```bash
# Build and start all containers
docker-compose --env-file .env.docker up -d

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f api-gateway
```

### 4. Verify Services are Running
```bash
# Check all containers
docker-compose ps

# Test API Gateway health
curl http://localhost:3000/health

# Check all services health
curl http://localhost:3000/services/health
```

### 5. Test the Gateway
```powershell
# Windows PowerShell
cd api-gateway
.\test-gateway.ps1

# Or use curl
curl -X POST http://localhost:3000/api/auth/register `
  -H "Content-Type: application/json" `
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "full_name": "Test User",
    "experience_level": "beginner",
    "preferred_instruments": ["piano"]
  }'
```

### 6. Stop Services
```bash
# Stop all containers
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v
```

## Local Development Setup

### 1. Install Dependencies for All Services

```bash
# Root dependencies
bun install

# API Gateway
cd api-gateway
bun install
cd ..

# Auth Service
cd services/auth
bun install
cd ../..

# Repeat for other services...
```

### 2. Setup Redis

**Windows (Docker)**:
```bash
docker run -d -p 6379:6379 --name shema-redis redis:7-alpine
```

**Linux/Mac**:
```bash
# Using Homebrew (Mac)
brew install redis
brew services start redis

# Using apt (Ubuntu/Debian)
sudo apt install redis-server
sudo systemctl start redis
```

### 3. Configure Each Service

```bash
# API Gateway
cd api-gateway
cp .env.example .env
# Edit .env with localhost URLs

# Auth Service
cd ../services/auth
cp .env.example .env
# Add Supabase credentials

# Repeat for other services...
```

### 4. Start Services in Order

**Terminal 1 - Auth Service**:
```bash
cd services/auth
bun run dev
```

**Terminal 2 - User Service**:
```bash
cd services/user
bun run dev
```

**Terminal 3 - Course Service**:
```bash
cd services/course
bun run dev
```

**Terminal 4 - Booking Service**:
```bash
cd services/booking
bun run dev
```

**Terminal 5 - Chat Service**:
```bash
cd services/chat
bun run dev
```

**Terminal 6 - Recommendation Service**:
```bash
cd services/recommendation
bun run dev
```

**Terminal 7 - API Gateway** (Start Last):
```bash
cd api-gateway
bun run dev
```

### 5. Verify All Services

```bash
# Check API Gateway
curl http://localhost:3000/health

# Check all services health
curl http://localhost:3000/services/health
```

## Testing the API Gateway

### Automated Tests

```powershell
# Run the PowerShell test script
cd api-gateway
.\test-gateway.ps1
```

### Manual API Tests

#### 1. Register a New User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@example.com",
    "password": "SecurePass123!",
    "full_name": "John Doe",
    "experience_level": "beginner",
    "preferred_instruments": ["piano", "gitar"]
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "student@example.com",
      "full_name": "John Doe",
      "role": "student"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

#### 2. Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@example.com",
    "password": "SecurePass123!"
  }'
```

#### 3. Get User Profile (Protected Route)
```bash
# Replace YOUR_TOKEN with the accessToken from login
curl http://localhost:3000/api/users/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 4. Get Available Courses (Public Route)
```bash
curl http://localhost:3000/api/courses
```

#### 5. Get Available Schedules
```bash
curl "http://localhost:3000/api/schedules/available?course_id=COURSE_UUID"
```

#### 6. Create Booking (Protected Route)
```bash
curl -X POST http://localhost:3000/api/bookings/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "course_id": "uuid",
    "first_choice_slot_id": "uuid",
    "second_choice_slot_id": "uuid"
  }'
```

## Accessing Services

### Service URLs

| Service | Local URL | Docker URL |
|---------|-----------|------------|
| API Gateway | http://localhost:3000 | http://localhost:3000 |
| Auth Service | http://localhost:3001 | http://auth-service:3001 |
| User Service | http://localhost:3002 | http://user-service:3002 |
| Course Service | http://localhost:3003 | http://course-service:3003 |
| Booking Service | http://localhost:3004 | http://booking-service:3004 |
| Chat Service | http://localhost:3005 | http://chat-service:3005 |
| Recommendation | http://localhost:3006 | http://recommendation-service:3006 |
| Redis | localhost:6379 | redis:6379 |

### Important Endpoints

- **Gateway Health**: `GET http://localhost:3000/health`
- **Services Health**: `GET http://localhost:3000/services/health`
- **Service Discovery**: `GET http://localhost:3000/services`
- **Register**: `POST http://localhost:3000/api/auth/register`
- **Login**: `POST http://localhost:3000/api/auth/login`
- **Get Courses**: `GET http://localhost:3000/api/courses`

## Troubleshooting

### Docker Issues

#### Containers won't start
```bash
# Check logs for specific service
docker-compose logs api-gateway

# Check all containers status
docker-compose ps

# Rebuild containers
docker-compose build --no-cache
docker-compose up -d
```

#### Port already in use
```bash
# Find process using port 3000 (Windows)
netstat -ano | findstr :3000

# Kill the process (replace PID)
taskkill /PID <PID> /F

# Or change port in docker-compose.yml
```

#### Redis connection failed
```bash
# Check if Redis is running
docker-compose ps redis

# Test Redis connection
docker exec -it shema-redis redis-cli ping
# Should return: PONG

# Restart Redis
docker-compose restart redis
```

### Local Development Issues

#### Services can't connect to each other
- **For Local Development**: Use `http://localhost:PORT`
- **For Docker**: Use service names like `http://auth-service:3001`

Example `.env` for local development:
```env
AUTH_SERVICE_URL=http://localhost:3001
USER_SERVICE_URL=http://localhost:3002
# etc...
```

#### Authentication errors
```bash
# Ensure JWT_SECRET matches across all services
# Check Auth Service .env
cat services/auth/.env | grep JWT_SECRET

# Check API Gateway .env
cat api-gateway/.env | grep JWT_SECRET

# They must match!
```

#### Service timeout errors
```bash
# Increase timeout in api-gateway/.env
SERVICE_TIMEOUT=60000  # 60 seconds

# Check if target service is running
curl http://localhost:3001/health  # Auth Service
curl http://localhost:3002/health  # User Service
```

### Common Error Messages

#### "ECONNREFUSED"
**Problem**: Service is not running or wrong URL

**Solution**:
1. Check if service is running: `docker-compose ps`
2. Verify service URL in `.env`
3. Check network connectivity

#### "SERVICE_UNAVAILABLE"
**Problem**: Service is down or not responding

**Solution**:
1. Check service health: `curl http://localhost:3000/services/health`
2. View service logs: `docker-compose logs <service-name>`
3. Restart service: `docker-compose restart <service-name>`

#### "AUTH_TOKEN_EXPIRED"
**Problem**: JWT token has expired

**Solution**:
1. Login again to get new token
2. Use refresh token endpoint: `POST /api/auth/refresh`

#### "AUTH_FORBIDDEN"
**Problem**: User doesn't have required role

**Solution**:
1. Check user role in token
2. Verify endpoint requires correct role
3. Admin endpoints require `role: "admin"`

## Next Steps

1. ✅ Read the [API Gateway README](./api-gateway/README.md) for complete API documentation
2. ✅ Review [Architecture Overview](./docs/architecture-overview.md)
3. ✅ Check [Development Guidelines](./docs/development-guidelines.md)
4. ✅ Explore individual service documentation in `services/<service-name>/README.md`

## 🆘 Need Help?

- Check the logs: `docker-compose logs -f`
- Verify environment variables: `docker-compose config`
- Review documentation in `/docs` folder
- Check Redis connection: `docker exec -it shema-redis redis-cli ping`

---

**Last Updated**: October 10, 2025  
**Version**: 1.0.0  
**Team**: Shema Music Backend Team
