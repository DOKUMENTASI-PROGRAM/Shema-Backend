# Environment Setup

⚠️ **IMPORTANT**: System ini menggunakan **Firebase Authentication untuk admin ONLY**. Students dan instructors TIDAK memiliki authentication (public endpoints dengan captcha validation).

Panduan lengkap setup environment variables dan Docker untuk development Shema Music backend.

## Table of Contents
1. [Firebase Setup](#firebase-setup)
2. [Environment Variables per Service](#environment-variables-per-service)
3. [Docker Setup](#docker-setup)
4. [Local Development](#local-development)
5. [Production Configuration](#production-configuration)

---

## Firebase Setup

### 1. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" → Enter "Shema Music"
3. Disable Google Analytics (optional)
4. Create project

### 2. Enable Authentication
1. In Firebase Console, go to **Authentication**
2. Click **Get Started**
3. Enable **Email/Password** sign-in method
4. Add initial admin user manually:
   - Email: `admin@shemamusic.com`
   - Password: (set secure password)

### 3. Get Firebase Credentials

#### For Backend (Admin SDK)
1. Go to **Project Settings** → **Service Accounts**
2. Click **Generate New Private Key** → Download JSON file
3. Save as `firebase-service-account.json` (DON'T commit to git!)
4. Use file path in environment variable: `FIREBASE_SERVICE_ACCOUNT_PATH`

#### For Frontend (Client SDK)
1. Go to **Project Settings** → **General**
2. Scroll to **Your apps** → Click **Web icon** (</>)
3. Register app with name "Shema Music Web"
4. Copy configuration object (apiKey, authDomain, etc.)
5. Use these values in frontend `.env`

---

## Environment Variables per Service

### API Gateway (Port 3000)

**File**: `api-gateway/.env`

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Microservices URLs (Docker internal network)
AUTH_SERVICE_URL=http://auth-service:3001
USER_SERVICE_URL=http://user-service:3002
COURSE_SERVICE_URL=http://course-service:3003
ENROLLMENT_SERVICE_URL=http://enrollment-service:3004
CHAT_SERVICE_URL=http://chat-service:3005
SCHEDULE_SERVICE_URL=http://schedule-service:3006

# CORS Configuration
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
CORS_CREDENTIALS=true

# Rate Limiting (Global)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

### Auth Service (Port 3001)

**File**: `services/auth/.env`

```env
# Server Configuration
PORT=3001
NODE_ENV=development
SERVICE_NAME=auth-service

# Firebase Admin SDK Configuration
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
# Alternative: Use environment variables instead of file
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com

# Service-to-Service Authentication
SERVICE_JWT_SECRET=service-to-service-secret-key

# Redis Configuration (for Firebase token caching)
REDIS_URL=redis://redis:6379
REDIS_PASSWORD=
REDIS_DB=0

# Other Services URLs
USER_SERVICE_URL=http://user-service:3002

# Rate Limiting (Admin login)
ADMIN_LOGIN_RATE_LIMIT=5
ADMIN_LOGIN_RATE_WINDOW=900

# Firebase Token Configuration
FIREBASE_TOKEN_CACHE_TTL=3600
```

---

### User Service (Port 3002)

**File**: `services/user/.env`

```env
# Server Configuration
PORT=3002
NODE_ENV=development
SERVICE_NAME=user-service

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-from-supabase
SUPABASE_ANON_KEY=your-anon-key-from-supabase

# Redis Configuration
REDIS_URL=redis://redis:6379
REDIS_PASSWORD=
REDIS_DB=0

# Service-to-Service Authentication
SERVICE_JWT_SECRET=service-to-service-secret-key

# Cache TTL (seconds)
USER_CACHE_TTL=300
```

---

### Course Service (Port 3003)

**File**: `services/course/.env`

```env
# Server Configuration
PORT=3003
NODE_ENV=development
SERVICE_NAME=course-service

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-from-supabase

# Redis Configuration
REDIS_URL=redis://redis:6379
REDIS_PASSWORD=
REDIS_DB=0

# Service-to-Service Authentication
SERVICE_JWT_SECRET=service-to-service-secret-key

# Cache TTL (seconds)
SCHEDULE_CACHE_TTL=300
COURSE_CATALOG_TTL=3600
```

---

### Enrollment Service (Port 3004)

**File**: `services/enrollment/.env`

```env
# Server Configuration
PORT=3004
NODE_ENV=development
SERVICE_NAME=enrollment-service

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-from-supabase

# Redis Configuration (for idempotency keys)
REDIS_URL=redis://redis:6379
REDIS_PASSWORD=
REDIS_DB=0

# Service-to-Service Authentication
SERVICE_JWT_SECRET=service-to-service-secret-key

# Other Services URLs
COURSE_SERVICE_URL=http://course-service:3003
USER_SERVICE_URL=http://user-service:3002

# Captcha Configuration (Cloudflare Turnstile)
TURNSTILE_SECRET_KEY=your-turnstile-secret-key
# Alternative: Google reCAPTCHA
RECAPTCHA_SECRET_KEY=your-recaptcha-secret-key

# Rate Limiting (Public endpoint)
ENROLLMENT_RATE_LIMIT=10
ENROLLMENT_RATE_WINDOW=60

# Idempotency Key TTL (24 hours)
IDEMPOTENCY_KEY_TTL=86400

REGISTRATION_NUMBER_PREFIX=REG
AUTO_SEND_WHATSAPP=true

# WhatsApp Notification (Future)
WHATSAPP_API_URL=
WHATSAPP_API_KEY=
```

---

### Chat Service (Port 3005)

**File**: `services/chat/.env`

```env
# Server Configuration
PORT=3005
NODE_ENV=development
SERVICE_NAME=chat-service

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-from-supabase

# Redis Configuration
REDIS_URL=redis://redis:6379
REDIS_PASSWORD=
REDIS_DB=0

# Service-to-Service Authentication
SERVICE_JWT_SECRET=service-to-service-secret-key

# WebSocket Configuration
WS_HEARTBEAT_INTERVAL=30000
WS_CONNECTION_TIMEOUT=60000

# Chat Configuration
CHAT_SESSION_IDLE_TIMEOUT=1800
CHAT_MESSAGE_MAX_LENGTH=1000
```

---

### Schedule & Attendance Service (Port 3006)

**File**: `services/schedule/.env`

```env
# Server Configuration
PORT=3006
NODE_ENV=development
SERVICE_NAME=schedule-service

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-from-supabase

# Redis Configuration
REDIS_URL=redis://redis:6379
REDIS_PASSWORD=
REDIS_DB=0

# Service-to-Service Authentication
SERVICE_JWT_SECRET=service-to-service-secret-key

# Other Services URLs
USER_SERVICE_URL=http://user-service:3002
COURSE_SERVICE_URL=http://course-service:3003
ENROLLMENT_SERVICE_URL=http://enrollment-service:3004

# Schedule Configuration
MIN_CLASS_DURATION_MINUTES=30
MAX_CLASS_DURATION_MINUTES=180
DEFAULT_CLASS_DURATION=60

# Conflict Detection
ENABLE_ROOM_CONFLICT_CHECK=true
ENABLE_INSTRUCTOR_CONFLICT_CHECK=true
```

---

## Docker Setup

### Docker Compose Configuration

**File**: `docker-compose.yml`

```yaml
version: '3.8'

services:
  # Redis Service
  redis:
    image: redis:7-alpine
    container_name: shema-redis
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - shema-network

  # API Gateway
  api-gateway:
    build:
      context: ./api-gateway
      dockerfile: Dockerfile
    container_name: shema-api-gateway
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - NODE_ENV=development
      - AUTH_SERVICE_URL=http://auth-service:3001
      - USER_SERVICE_URL=http://user-service:3002
      - COURSE_SERVICE_URL=http://course-service:3003
      - ENROLLMENT_SERVICE_URL=http://enrollment-service:3004
      - CHAT_SERVICE_URL=http://chat-service:3005
      - SCHEDULE_SERVICE_URL=http://schedule-service:3006
    env_file:
      - ./api-gateway/.env
    depends_on:
      - auth-service
      - user-service
      - course-service
      - enrollment-service
      - chat-service
      - schedule-service
    networks:
      - shema-network
    restart: unless-stopped

  # Auth Service (Firebase-based, admin-only)
  auth-service:
    build:
      context: ./services/auth
      dockerfile: Dockerfile
    container_name: shema-auth-service
    ports:
      - "3001:3001"
    environment:
      - PORT=3001
      - NODE_ENV=development
      - REDIS_URL=redis://redis:6379
      - USER_SERVICE_URL=http://user-service:3002
    env_file:
      - ./services/auth/.env
    volumes:
      - ./services/auth/firebase-service-account.json:/app/firebase-service-account.json:ro
    depends_on:
      redis:
        condition: service_healthy
      user-service:
        condition: service_started
    networks:
      - shema-network
    restart: unless-stopped

  # User Service
  user-service:
    build:
      context: ./services/user
      dockerfile: Dockerfile
    container_name: shema-user-service
    ports:
      - "3002:3002"
    environment:
      - PORT=3002
      - NODE_ENV=development
      - REDIS_URL=redis://redis:6379
    env_file:
      - ./services/user/.env
    depends_on:
      redis:
        condition: service_healthy
    networks:
      - shema-network
    restart: unless-stopped

  # Course Service
  course-service:
    build:
      context: ./services/course
      dockerfile: Dockerfile
    container_name: shema-course-service
    ports:
      - "3003:3003"
    environment:
      - PORT=3003
      - NODE_ENV=development
      - REDIS_URL=redis://redis:6379
    env_file:
      - ./services/course/.env
    depends_on:
      redis:
        condition: service_healthy
    networks:
      - shema-network
    restart: unless-stopped

  # Enrollment Service (Public endpoint with captcha)
  enrollment-service:
    build:
      context: ./services/enrollment
      dockerfile: Dockerfile
    container_name: shema-enrollment-service
    ports:
      - "3004:3004"
    environment:
      - PORT=3004
      - NODE_ENV=development
      - REDIS_URL=redis://redis:6379
      - COURSE_SERVICE_URL=http://course-service:3003
      - USER_SERVICE_URL=http://user-service:3002
    env_file:
      - ./services/enrollment/.env
    depends_on:
      redis:
        condition: service_healthy
      course-service:
        condition: service_started
      user-service:
        condition: service_started
    networks:
      - shema-network
    restart: unless-stopped

  # Chat Service
  chat-service:
    build:
      context: ./services/chat
      dockerfile: Dockerfile
    container_name: shema-chat-service
    ports:
      - "3005:3005"
    environment:
      - PORT=3005
      - NODE_ENV=development
      - REDIS_URL=redis://redis:6379
    env_file:
      - ./services/chat/.env
    depends_on:
      redis:
        condition: service_healthy
    networks:
      - shema-network
    restart: unless-stopped

  # Schedule & Attendance Service
  schedule-service:
    build:
      context: ./services/schedule
      dockerfile: Dockerfile
    container_name: shema-schedule-service
    ports:
      - "3006:3006"
    environment:
      - PORT=3006
      - NODE_ENV=development
      - REDIS_URL=redis://redis:6379
      - USER_SERVICE_URL=http://user-service:3002
      - COURSE_SERVICE_URL=http://course-service:3003
      - ENROLLMENT_SERVICE_URL=http://enrollment-service:3004
    env_file:
      - ./services/schedule/.env
    depends_on:
      redis:
        condition: service_healthy
      user-service:
        condition: service_started
      course-service:
        condition: service_started
      enrollment-service:
        condition: service_started
    networks:
      - shema-network
    restart: unless-stopped

networks:
  shema-network:
    driver: bridge

volumes:
  redis-data:
    driver: local
```

### Dockerfile Template

**File**: `services/{service}/Dockerfile`

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src ./src

# Build TypeScript to JavaScript
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start application
CMD ["node", "dist/index.js"]
```

### .dockerignore

**File**: `services/{service}/.dockerignore`

```
node_modules
npm-debug.log
.env
.env.local
.env.*.local
dist
.git
.gitignore
README.md
tests
*.test.ts
*.spec.ts
coverage
.vscode
.idea
```

---

## Local Development

### Prerequisites
```bash
# Install Node.js 20+
node --version  # Should be v20.x.x

# Install Docker & Docker Compose
docker --version
docker-compose --version

# Install pnpm (recommended) or npm
npm install -g pnpm
```

### Initial Setup

1. **Clone repository**
```bash
git clone <repository-url>
cd backend
```

2. **Create .env files**
```bash
# Copy example files
cp api-gateway/.env.example api-gateway/.env
cp services/auth/.env.example services/auth/.env
cp services/user/.env.example services/user/.env
# ... repeat for all services

# Edit with your values
nano services/user/.env  # Add Supabase credentials
```

3. **Install dependencies (for each service)**
```bash
cd api-gateway && pnpm install
cd services/auth && pnpm install
cd services/user && pnpm install
# ... repeat for all services
```

4. **Start Redis locally (or use Docker)**
```bash
docker run -d -p 6379:6379 --name redis redis:7-alpine
```

5. **Run services individually (for development)**
```bash
# Terminal 1: Auth Service
cd services/auth
pnpm dev

# Terminal 2: User Service
cd services/user
pnpm dev

# Terminal 3: Course Service
cd services/course
pnpm dev

# ... and so on for each service
```

### Using Docker Compose (Recommended)

```bash
# Build and start all services
docker-compose up --build

# Start in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f auth-service

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# Rebuild specific service
docker-compose up --build auth-service
```

### Development Scripts

**File**: `package.json` (root)

```json
{
  "name": "shema-music-backend",
  "private": true,
  "scripts": {
    "dev": "docker-compose up",
    "dev:build": "docker-compose up --build",
    "dev:down": "docker-compose down",
    "dev:clean": "docker-compose down -v",
    "logs": "docker-compose logs -f",
    "ps": "docker-compose ps",
    "test": "pnpm --filter \"./services/**\" test",
    "test:auth": "pnpm --filter auth test",
    "lint": "pnpm --filter \"./services/**\" lint",
    "format": "prettier --write \"**/*.{ts,js,json,md}\""
  }
}
```

---

## Production Configuration

### Environment Variables (Production)

```env
# Production values - NEVER commit these
NODE_ENV=production

# Strong secrets
JWT_SECRET=<generate-with-openssl-rand-base64-64>
JWT_REFRESH_SECRET=<generate-different-secret>
SERVICE_JWT_SECRET=<generate-another-secret>

# Production URLs
AUTH_SERVICE_URL=https://auth.shemamusic.com
USER_SERVICE_URL=https://user.shemamusic.com
# ... etc

# Production Supabase
SUPABASE_URL=https://production-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<production-service-role-key>

# Production Redis (e.g., Redis Cloud, AWS ElastiCache)
REDIS_URL=redis://production-redis:6379
REDIS_PASSWORD=<strong-redis-password>
```

### Generating Secrets

```bash
# Generate JWT secret
openssl rand -base64 64

# Generate UUID
uuidgen

# Generate random hex
openssl rand -hex 32
```

### Docker Compose Production

**File**: `docker-compose.prod.yml`

```yaml
version: '3.8'

services:
  auth-service:
    image: ghcr.io/your-org/shema-auth:latest
    environment:
      - NODE_ENV=production
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
  # ... other services
```

### Health Checks

All services should expose `/health` endpoint:

```typescript
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    service: process.env.SERVICE_NAME,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})
```

### Monitoring Setup

```yaml
# Add to docker-compose.yml for monitoring
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```
