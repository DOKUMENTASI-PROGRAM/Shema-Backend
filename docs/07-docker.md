# Docker Configuration & Deployment

## Docker Architecture

### Microservices Container Strategy
Each microservice runs in its own container following the **one service per container** principle:

```
┌─────────────────────────────────────────────────────────┐
│                     Docker Network                       │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Identity   │  │    Course    │  │     Chat     │  │
│  │   Service    │  │   Service    │  │   Service    │  │
│  │  (Port 3001) │  │ (Port 3002)  │  │ (Port 3003)  │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                  │                  │          │
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌──────▼───────┐  │
│  │  PostgreSQL  │  │  PostgreSQL  │  │  PostgreSQL  │  │
│  │identity_db   │  │ course_db    │  │   chat_db    │  │
│  └──────────────┘  └──────────────┘  └──────┬───────┘  │
│                                               │          │
│                                        ┌──────▼───────┐  │
│  ┌──────────────┐                     │    Redis     │  │
│  │ API Gateway  │                     │   (Cache)    │  │
│  │ (Port 8080)  │                     └──────────────┘  │
│  └──────────────┘                                        │
└─────────────────────────────────────────────────────────┘
```

---

## Docker Compose Configuration

### Complete docker-compose.yml

```yaml
version: '3.8'

services:
  # Identity Service Database
  identity-db:
    image: postgres:15-alpine
    container_name: identity-db
    environment:
      POSTGRES_DB: identity_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${IDENTITY_DB_PASSWORD:-postgres}
    volumes:
      - identity-db-data:/var/lib/postgresql/data
    networks:
      - backend-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Course Service Database
  course-db:
    image: postgres:15-alpine
    container_name: course-db
    environment:
      POSTGRES_DB: course_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${COURSE_DB_PASSWORD:-postgres}
    volumes:
      - course-db-data:/var/lib/postgresql/data
    networks:
      - backend-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Chat Service Database
  chat-db:
    image: postgres:15-alpine
    container_name: chat-db
    environment:
      POSTGRES_DB: chat_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${CHAT_DB_PASSWORD:-postgres}
    volumes:
      - chat-db-data:/var/lib/postgresql/data
    networks:
      - backend-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis for Chat Context
  redis:
    image: redis:7-alpine
    container_name: redis
    command: redis-server --appendonly yes
    volumes:
      - redis-data:/data
    networks:
      - backend-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  # Identity Service
  identity-service:
    build:
      context: ./services/identity-service
      dockerfile: Dockerfile
    container_name: identity-service
    environment:
      NODE_ENV: ${NODE_ENV:-development}
      PORT: 3001
      DATABASE_URL: postgresql://postgres:${IDENTITY_DB_PASSWORD:-postgres}@identity-db:5432/identity_db
      JWT_SECRET: ${JWT_SECRET}
      JWT_EXPIRES_IN: ${JWT_EXPIRES_IN:-24h}
    ports:
      - "3001:3001"
    depends_on:
      identity-db:
        condition: service_healthy
    volumes:
      - ./services/identity-service:/app
      - /app/node_modules
    networks:
      - backend-network
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped

  # Course Service
  course-service:
    build:
      context: ./services/course-service
      dockerfile: Dockerfile
    container_name: course-service
    environment:
      NODE_ENV: ${NODE_ENV:-development}
      PORT: 3002
      DATABASE_URL: postgresql://postgres:${COURSE_DB_PASSWORD:-postgres}@course-db:5432/course_db
      JWT_SECRET: ${JWT_SECRET}
      IDENTITY_SERVICE_URL: http://identity-service:3001
    ports:
      - "3002:3002"
    depends_on:
      course-db:
        condition: service_healthy
      identity-service:
        condition: service_healthy
    volumes:
      - ./services/course-service:/app
      - /app/node_modules
    networks:
      - backend-network
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3002/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped

  # Chat Service
  chat-service:
    build:
      context: ./services/chat-service
      dockerfile: Dockerfile
    container_name: chat-service
    environment:
      NODE_ENV: ${NODE_ENV:-development}
      PORT: 3003
      DATABASE_URL: postgresql://postgres:${CHAT_DB_PASSWORD:-postgres}@chat-db:5432/chat_db
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET}
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      CHATGPT_MODEL: ${CHATGPT_MODEL:-gpt-3.5-turbo}
      MAX_CONTEXT_MESSAGES: ${MAX_CONTEXT_MESSAGES:-10}
      RATE_LIMIT_MESSAGES_PER_MINUTE: ${RATE_LIMIT_MESSAGES_PER_MINUTE:-20}
    ports:
      - "3003:3003"
    depends_on:
      chat-db:
        condition: service_healthy
      redis:
        condition: service_healthy
      identity-service:
        condition: service_healthy
    volumes:
      - ./services/chat-service:/app
      - /app/node_modules
    networks:
      - backend-network
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3003/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped

  # API Gateway
  api-gateway:
    build:
      context: ./services/api-gateway
      dockerfile: Dockerfile
    container_name: api-gateway
    environment:
      NODE_ENV: ${NODE_ENV:-development}
      PORT: 8080
      IDENTITY_SERVICE_URL: http://identity-service:3001
      COURSE_SERVICE_URL: http://course-service:3002
      CHAT_SERVICE_URL: http://chat-service:3003
      ALLOWED_ORIGINS: ${ALLOWED_ORIGINS:-http://localhost:3000,http://localhost:5173}
    ports:
      - "8080:8080"
    depends_on:
      - identity-service
      - course-service
      - chat-service
    volumes:
      - ./services/api-gateway:/app
      - /app/node_modules
    networks:
      - backend-network
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped

networks:
  backend-network:
    driver: bridge

volumes:
  identity-db-data:
  course-db-data:
  chat-db-data:
  redis-data:
```

---

## Dockerfile Examples

### Multi-Stage Dockerfile (Node.js + TypeScript + Hono)

```dockerfile
# services/identity-service/Dockerfile

# Stage 1: Build TypeScript
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript to JavaScript
RUN npm run build

# Stage 2: Production
FROM node:18-alpine

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy built files from builder
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Copy Firebase service account if exists
COPY --chown=nodejs:nodejs config/ ./config/ 2>/dev/null || true

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "dist/index.js"]
```

### Development Dockerfile (TypeScript)
```dockerfile
# services/identity-service/Dockerfile.dev

FROM node:18-alpine

WORKDIR /app

# Install tsx for TypeScript hot reload
RUN npm install -g tsx

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including dev)
RUN npm install

# Copy source code
COPY . .

# Expose port
EXPOSE 3001

# Start with tsx watch mode for hot reload
CMD ["tsx", "watch", "src/index.ts"]
```

---

## Docker Best Practices

### 1. Multi-Stage Builds

**Benefits**:
- Smaller final image size
- Separation of build and runtime dependencies
- Faster deployment

```dockerfile
# Build stage - includes build tools
FROM node:18 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage - minimal runtime
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
CMD ["node", "dist/index.js"]
```

### 2. Non-Root User

**Security**: Always run containers as non-root user

```dockerfile
# Create user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set ownership
COPY --chown=nodejs:nodejs . .

# Switch to non-root user
USER nodejs
```

### 3. Layer Caching Optimization

```dockerfile
# ✅ Good - Copy package files first for better caching
COPY package*.json ./
RUN npm ci
COPY . .

# ❌ Bad - Copy everything, invalidates cache on any file change
COPY . .
RUN npm ci
```

### 4. .dockerignore File

```
# services/identity-service/.dockerignore

node_modules
npm-debug.log
.env
.env.local
.env.production
.git
.gitignore
README.md
.vscode
.idea
dist
coverage
*.log
.DS_Store
```

### 5. Health Checks

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1
```

```javascript
// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    await pool.query('SELECT 1');
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'identity-service'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});
```

### 6. Resource Limits

```yaml
# docker-compose.yml
services:
  identity-service:
    # ... other config
    deploy:
      resources:
        limits:
          cpus: '0.5'      # Maximum 0.5 CPU
          memory: 512M     # Maximum 512MB RAM
        reservations:
          cpus: '0.25'     # Minimum 0.25 CPU
          memory: 256M     # Minimum 256MB RAM
```

---

## Environment-Specific Configurations

### Development Environment

```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  identity-service:
    build:
      context: ./services/identity-service
      dockerfile: Dockerfile.dev
    volumes:
      - ./services/identity-service:/app
      - /app/node_modules
    environment:
      NODE_ENV: development
      DEBUG: app:*
```

**Usage**:
```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

### Production Environment

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  identity-service:
    build:
      context: ./services/identity-service
      dockerfile: Dockerfile
    restart: always
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '1'
          memory: 1G
```

**Usage**:
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

## Docker Commands Cheat Sheet

### Basic Operations

```bash
# Build and start all services
docker-compose up -d

# Build without cache
docker-compose build --no-cache

# Start specific service
docker-compose up -d identity-service

# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes data)
docker-compose down -v

# Restart specific service
docker-compose restart identity-service
```

### Viewing Logs

```bash
# View all logs
docker-compose logs

# Follow logs (real-time)
docker-compose logs -f

# View specific service logs
docker-compose logs -f identity-service

# View last 100 lines
docker-compose logs --tail=100 identity-service
```

### Service Management

```bash
# List running containers
docker-compose ps

# Check service health
docker-compose ps --services --filter "status=running"

# Execute command in running container
docker-compose exec identity-service sh

# Run one-off command
docker-compose run identity-service npm test
```

### Database Operations

```bash
# Connect to PostgreSQL
docker-compose exec identity-db psql -U postgres -d identity_db

# Run SQL file
docker-compose exec -T identity-db psql -U postgres -d identity_db < backup.sql

# Backup database
docker-compose exec identity-db pg_dump -U postgres identity_db > backup.sql

# Restore database
docker-compose exec -T identity-db psql -U postgres identity_db < backup.sql
```

### Redis Operations

```bash
# Connect to Redis CLI
docker-compose exec redis redis-cli

# Flush all keys (WARNING: deletes all data)
docker-compose exec redis redis-cli FLUSHALL

# Monitor Redis commands
docker-compose exec redis redis-cli MONITOR
```

### Debugging

```bash
# View container resource usage
docker stats

# Inspect container
docker inspect identity-service

# View container processes
docker-compose top identity-service

# Execute shell in container
docker-compose exec identity-service sh

# View container filesystem
docker-compose exec identity-service ls -la
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v3
    
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v2
    
    - name: Login to Docker Hub
      uses: docker/login-action@v2
      with:
        username: ${{ secrets.DOCKER_USERNAME }}
        password: ${{ secrets.DOCKER_PASSWORD }}
    
    - name: Build and push Identity Service
      uses: docker/build-push-action@v4
      with:
        context: ./services/identity-service
        push: true
        tags: yourorg/identity-service:latest
    
    - name: Build and push Course Service
      uses: docker/build-push-action@v4
      with:
        context: ./services/course-service
        push: true
        tags: yourorg/course-service:latest
    
    - name: Build and push Chat Service
      uses: docker/build-push-action@v4
      with:
        context: ./services/chat-service
        push: true
        tags: yourorg/chat-service:latest
    
    - name: Deploy to server
      uses: appleboy/ssh-action@master
      with:
        host: ${{ secrets.SERVER_HOST }}
        username: ${{ secrets.SERVER_USER }}
        key: ${{ secrets.SSH_PRIVATE_KEY }}
        script: |
          cd /opt/music-lesson-backend
          docker-compose pull
          docker-compose up -d
          docker-compose ps
```

---

## Production Deployment Checklist

### Pre-Deployment
- [ ] Environment variables configured
- [ ] Database migrations prepared
- [ ] Multi-stage Dockerfiles optimized
- [ ] Health checks implemented
- [ ] Resource limits defined
- [ ] Logging configured
- [ ] Backup strategy in place

### Deployment
- [ ] Build images with proper tags
- [ ] Test images locally
- [ ] Push images to registry
- [ ] Pull images on production server
- [ ] Run database migrations
- [ ] Start services with docker-compose
- [ ] Verify health checks passing
- [ ] Test API endpoints

### Post-Deployment
- [ ] Monitor logs for errors
- [ ] Check resource usage
- [ ] Verify all services running
- [ ] Test critical user flows
- [ ] Monitor API response times
- [ ] Check database connections
- [ ] Verify Redis caching working
- [ ] Test ChatGPT integration

---

## Troubleshooting

### Common Issues

#### Container Won't Start
```bash
# Check logs
docker-compose logs identity-service

# Check if port is already in use
netstat -an | grep 3001

# Remove and recreate container
docker-compose rm -f identity-service
docker-compose up -d identity-service
```

#### Database Connection Issues
```bash
# Check if database is healthy
docker-compose ps

# Restart database
docker-compose restart identity-db

# Check database logs
docker-compose logs identity-db
```

#### Volume Permission Issues
```bash
# Fix ownership
docker-compose exec identity-service chown -R nodejs:nodejs /app

# Or rebuild with correct permissions
docker-compose build --no-cache identity-service
```

#### Out of Disk Space
```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Remove everything unused
docker system prune -a --volumes
```
