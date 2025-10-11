# API Gateway - Quick Start Guide

## 🚀 Getting Started (Local Development)

### 1. Install Dependencies
```bash
cd api-gateway
bun install
```

### 2. Configure Environment
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your local configuration
# For local development, use localhost URLs:
AUTH_SERVICE_URL=http://localhost:3001
USER_SERVICE_URL=http://localhost:3002
# ... etc
```

### 3. Start Redis
```bash
# Using Docker
docker run -d -p 6379:6379 redis:7-alpine

# Or if you have Redis installed locally
redis-server
```

### 4. Start All Microservices
Make sure all backend services are running:
- Auth Service (port 3001)
- User Service (port 3002)
- Course Service (port 3003)
- Booking Service (port 3004)
- Chat Service (port 3005)
- Recommendation Service (port 3006)

### 5. Start API Gateway
```bash
# Development mode with hot reload
bun run dev

# Or use the batch script (Windows)
./start-server.bat
```

### 6. Test the Gateway
```bash
# Run the test script
./test-gateway.ps1

# Or manually test the health endpoint
curl http://localhost:3000/health
```

## 🐳 Docker Setup

### Using Docker Compose (Recommended)

1. Make sure you have the root `docker-compose.yml` with all services
2. Start all services:
```bash
cd ..  # Go to backend root
docker-compose up -d
```

3. Check logs:
```bash
docker-compose logs -f api-gateway
```

### Individual Docker Container

```bash
# Build image
docker build -t shema-music/api-gateway:latest .

# Run container
docker run -d \
  -p 3000:3000 \
  --env-file .env \
  --name api-gateway \
  shema-music/api-gateway:latest
```

## 📝 Common Tasks

### Check Service Health
```bash
curl http://localhost:3000/services/health
```

### Test Authentication
```bash
# Register a new user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "full_name": "Test User",
    "experience_level": "beginner",
    "preferred_instruments": ["piano"]
  }'

# Login (save the token from response)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'

# Use token for protected routes
curl http://localhost:3000/api/users/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## ⚠️ Troubleshooting

### Gateway won't start
- Check if port 3000 is already in use
- Verify Redis is running: `redis-cli ping`
- Check logs for specific errors

### Can't connect to services
- Ensure all microservices are running
- Verify service URLs in `.env`
- Check network connectivity

### Authentication fails
- Verify JWT_SECRET matches Auth Service
- Check token format: `Bearer <token>`
- Token may be expired, try login again

## 📚 Next Steps

1. Read the full [README.md](./README.md) for complete API documentation
2. Check the [architecture documentation](../docs/architecture-overview.md)
3. Review [inter-service communication](../docs/inter-service-communication.md)

## 🆘 Need Help?

- Review error logs: `docker-compose logs api-gateway`
- Check service health: `http://localhost:3000/services/health`
- Read the architecture docs in `/docs` folder
