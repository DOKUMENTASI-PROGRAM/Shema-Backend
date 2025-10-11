# Shema Music Backend

Backend system untuk website lembaga kursus musik **Shema Music** - Platform digital terintegrasi dengan AI recommendation system.

> **🎉 Recently Updated (Oct 11, 2025)**: Code has been refactored following best practices. See [`docs/CLEANUP_SUMMARY.md`](./docs/CLEANUP_SUMMARY.md) for details.

## 🎯 Overview

**Tech Stack**: Hono.js, Supabase (PostgreSQL), Redis, Docker  
**Architecture**: Microservices  
**Development Phase**: In Progress  
**Timeline**: Oktober 2025 - Januari 2026 (14 minggu)

## 📁 Project Structure

```
Backend/
├── services/                    # All microservices
│   ├── api-gateway/            ✅ Port 3000 - Entry point & routing
│   ├── auth/                   ✅ Port 3001 - Authentication & authorization
│   ├── user/                   ⏳ Port 3002 - User management
│   ├── course/                 ⏳ Port 3003 - Course & schedule management
│   ├── booking/                ⏳ Port 3004 - Booking system
│   ├── chat/                   ⏳ Port 3005 - Live chat (WebSocket)
│   └── recommendation/         ⏳ Port 3006 - AI-based recommendations
├── shared/                      # Shared utilities
│   ├── config/                 # Shared configs (Supabase, Redis)
│   ├── middleware/             # Shared middleware
│   └── types/                  # Shared TypeScript types
├── docs/                        # 📚 Complete documentation
├── supabase/                    # Database migrations
├── docker-compose.yml           # Docker orchestration
└── .github/                     # GitHub configs & AI instructions

Legend: ✅ Complete | ⏳ In Progress | ❌ Not Started
```

## 🚀 Quick Start

### Prerequisites
- **Bun** >= 1.0.0
- **Docker** & Docker Compose
- **Supabase** account (for database)
- **Redis** (via Docker or local)

### Installation

```bash
# Clone repository
git clone <repository-url>
cd Backend

# Setup environment variables
cp .env.docker.example .env.docker
# Edit .env.docker with your actual values

# Start all services with Docker
docker-compose up -d

# Or run individual service locally
cd services/api-gateway
bun install
bun run dev
```

### Access Services

- **API Gateway**: http://localhost:3000
- **Auth Service**: http://localhost:3001
- **Redis**: localhost:6379

## 🌍 Environment Management

The backend supports multiple environments with easy switching between **development** (local Supabase) and **production** (remote Supabase).

### Environment Files

```
.env                    # Main environment file (auto-loaded)
.env.development       # Development configuration
.env.production        # Production configuration
services/*/            # Service-specific configs
├── .env              # Service-specific variables
```

### Switching Environments

```bash
# Switch to development (local Supabase)
npm run env:dev

# Switch to production (remote Supabase)
npm run env:prod

# Check current environment
npm run env:status
```

### Environment Variables

| Variable | Development | Production | Description |
|----------|-------------|------------|-------------|
| `SUPABASE_URL` | `http://127.0.0.1:54321` | `https://xlrwvzwppecphgzfcqxw.supabase.co` | Database URL |
| `NODE_ENV` | `development` | `production` | Environment mode |
| `JWT_SECRET` | Dev secrets | Prod secrets | JWT signing keys |

### Database Configuration

**Development**: Uses local Supabase instance
- URL: `http://127.0.0.1:54321`
- Perfect for local development and testing

**Production**: Uses remote Supabase instance
- URL: `https://xlrwvzwppecphgzfcqxw.supabase.co`
- Connected to live database with production data

### Service-Specific Configuration

Each service has its own `.env` file for service-specific settings:

```bash
# Auth Service (.env)
PORT=3001
AUTH_METHODS=jwt,firebase
JWT_ACCESS_TOKEN_EXPIRY=15m

# Booking Service (.env)
PORT=3004
BOOKING_EXPIRY_HOURS=72
BOOKING_MAX_SLOTS_PER_REQUEST=2
```

## 📚 Documentation

Complete documentation is available in the [`docs/`](./docs) folder:

### Getting Started
- **[Quick Start Guide](./docs/QUICK_START.md)** - Fast setup for development
- **[Setup Guide](./docs/SETUP_GUIDE.md)** - Detailed installation & configuration
- **[Project Overview](./docs/PROJECT_OVERVIEW.md)** - Complete project documentation

### Architecture
- **[Architecture Overview](./docs/architecture-overview.md)** - System design & microservices pattern
- **[Data Flow](./docs/data-flow.md)** - Request flow & inter-service communication
- **[Inter-Service Communication](./docs/inter-service-communication.md)** - HTTP calls & Redis Pub/Sub

### Development
- **[Development Guidelines](./docs/development-guidelines.md)** - Coding standards & best practices
- **[API Endpoints](./docs/api-endpoints.md)** - Complete API reference
- **[Environment Setup](./docs/environment-setup.md)** - Environment variables guide

### Service Documentation
- **[API Gateway Summary](./docs/API_GATEWAY_SUMMARY.md)** - API Gateway implementation
- **[Auth Service Summary](./docs/AUTH_SERVICE_SUMMARY.md)** - Authentication service
- **[Firebase Auth Complete](./docs/FIREBASE_AUTH_COMPLETE.md)** - Firebase integration guide

### Recent Updates
- **[Folder Reorganization](./docs/FOLDER_REORGANIZATION.md)** - Folder structure changes
- **[API Gateway Migration](./docs/API_GATEWAY_MIGRATION_SUMMARY.md)** - Migration details
- **[Reorganization Complete](./docs/REORGANIZATION_COMPLETE.md)** - Final checklist

## 🏗️ Architecture Highlights

### Microservices
Each service is an independent Hono.js application in its own Docker container:
- **API Gateway** - Routes requests to appropriate services
- **Auth Service** - JWT-based authentication
- **User Service** - Student, teacher, and admin profiles
- **Course Service** - Classes, packages, and schedules
- **Booking Service** - 2-slot booking with 3-day confirmation window
- **Chat Service** - Real-time WebSocket communication
- **Recommendation Service** - AI-based class recommendations

### Communication
- **Synchronous**: HTTP REST calls between services
- **Asynchronous**: Redis Pub/Sub for events
- **Real-time**: WebSocket for live chat

### Database
- **Supabase (PostgreSQL)** for persistent data
- **Redis** for caching and pub/sub

## 🔧 Development Commands

### Docker Commands
```bash
# Build all services
docker-compose build

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f [service-name]

# Stop all services
docker-compose down

# Rebuild and restart
docker-compose up -d --build
```

### Local Development
```bash
# Navigate to service
cd services/[service-name]

# Install dependencies
bun install

# Run development server
bun run dev

# Run tests
bun run test

# Build for production
bun run build
```

## 🧪 Testing

### API Gateway Tests
```bash
cd services/api-gateway
bun run test

# Or use PowerShell test script
.\test-gateway.ps1
```

### Manual Testing
```bash
# Health check
curl http://localhost:3000/health

# Register admin user (admin only)
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin123!","full_name":"Admin User","role":"admin"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## 📊 Service Status

| Service | Port | Status | Features |
|---------|------|--------|----------|
| API Gateway | 3000 | ✅ Complete | Routing, aggregation, health checks |
| Auth Service | 3001 | ✅ Complete | JWT auth, Firebase integration |
| User Service | 3002 | ⏳ In Progress | User CRUD operations |
| Course Service | 3003 | ⏳ Planned | Course & schedule management |
| Booking Service | 3004 | ⏳ Planned | 2-slot booking system |
| Chat Service | 3005 | ⏳ Planned | WebSocket live chat |
| Recommendation Service | 3006 | ⏳ Planned | AI recommendations |

## 🔐 Environment Variables

Create `.env.docker` file with these variables:

```env
# JWT Secrets
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
SERVICE_JWT_SECRET=your-service-secret

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Firebase (optional)
FIREBASE_PROJECT_ID=your-firebase-project-id

# Redis
REDIS_URL=redis://redis:6379

# CORS
CORS_ORIGIN=*
```

See [Environment Setup](./docs/environment-setup.md) for complete guide.

## 🤝 Contributing

### Development Workflow
1. Read [Development Guidelines](./docs/development-guidelines.md)
2. Follow the coding standards in [copilot-instructions.md](./.github/copilot-instructions.md)
3. Test your changes thoroughly
4. Update documentation if needed

### AI Coding Assistant
This project uses GitHub Copilot with custom instructions. See [`.github/copilot-instructions.md`](./.github/copilot-instructions.md) for:
- Architecture patterns
- Data flow diagrams
- Best practices
- Common pitfalls to avoid

## 📝 License

[Add your license here]

## 📞 Contact

- **Project**: Shema Music Backend
- **Team**: [Add team info]
- **Repository**: [Add repository URL]

## 🗺️ Roadmap

### Phase 1: Core Services (Current)
- ✅ API Gateway implementation
- ✅ Auth Service with Firebase
- ⏳ User Service CRUD

### Phase 2: Business Logic
- ⏳ Course Service implementation
- ⏳ Booking Service with 2-slot system
- ⏳ Admin dashboard data aggregation

### Phase 3: Real-time Features
- ⏳ Live Chat with WebSocket
- ⏳ Real-time notifications

### Phase 4: AI Integration
- ⏳ Recommendation engine
- ⏳ ML model integration

### Phase 5: Production
- ⏳ Performance optimization
- ⏳ Security hardening
- ⏳ Deployment to production

---

**Status**: 🚧 In Active Development  
**Last Updated**: October 10, 2025  

For questions or issues, please refer to the [documentation](./docs) or contact the development team.
