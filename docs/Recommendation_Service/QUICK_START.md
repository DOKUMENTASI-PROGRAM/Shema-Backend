# Quick Start Guide - Recommendation Service

## Prerequisites

- Bun v1.x+
- Docker & Docker Compose
- PostgreSQL (via Supabase)
- Redis
- OpenAI API key

## 1. Project Setup

### 1.1 Clone and Install

```bash
# Navigate to backend directory
cd d:\Tugas\PPL\New\ folder\Backend

# Install dependencies
bun install

# Install service-specific dependencies
cd services/recommendation
bun install
```

### 1.2 Environment Configuration

Create `.env.local` in the recommendation service:

```env
# Service
PORT=3005
NODE_ENV=development
SERVICE_NAME=recommendation-service

# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key

# Redis
REDIS_URL=redis://localhost:6379

# AI Service
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4-turbo

# Authentication
SESSION_SECRET=your-session-secret
SESSION_TTL=1800
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX_REQUESTS=10

# Logging
LOG_LEVEL=debug
```

## 2. Database Setup

### 2.1 Create Migrations

```bash
# Create migration files
supabase migration new create_assessment_tables

# Copy migration content from docs/02_DATABASE_SCHEMA.md
# into supabase/migrations/[timestamp]_create_assessment_tables.sql
```

### 2.2 Apply Migrations

```bash
# Apply locally
supabase db push

# Or manually run SQL in Supabase dashboard
```

## 3. Running the Service

### 3.1 Development Mode

```bash
# Terminal 1: Start Redis
docker run -p 6379:6379 redis:7-alpine

# Terminal 2: Start Supabase (if local)
supabase start

# Terminal 3: Start recommendation service
cd services/recommendation
npm run dev
```

### 3.2 Docker Mode

```bash
# Build and run with docker-compose
docker-compose up --build recommendation-service

# View logs
docker-compose logs -f recommendation-service
```

## 4. Testing the Service

### 4.1 Health Check

```bash
curl http://localhost:3005/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "recommendation-service",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 4.2 Submit Assessment

```bash
curl -X POST http://localhost:3005/api/assessment/submit \
  -H "Content-Type: application/json" \
  -H "Cookie: sid=YOUR_SESSION_ID" \
  -d '{
    "age": 25,
    "practice_hours_per_week": 5,
    "goals": ["Hobi/relax"],
    "preferred_genres": ["Pop"],
    "previous_instruments": ["Gitar Akustik"],
    "total_experience_years": 3,
    "notation_reading_level": "intermediate",
    "noise_sensitivity": 3,
    "home_space_availability": "adequate",
    "initial_budget": "Rp2 – 6 juta",
    "instrument_preference": "expressive",
    "learning_style": "exploratory",
    "performance_comfort": 4,
    "practice_discipline": 3,
    "preferred_lesson_times": ["Weekday malam"],
    "preferred_session_duration": "60",
    "class_format_preference": "small_group",
    "learning_approach": "favorite_songs",
    "ensemble_role": "melody",
    "available_instruments": ["Gitar akustik"],
    "notation_preference": "tab",
    "improvisation_interest": 4,
    "grading_exam_interest": "maybe",
    "audio_recording_interest": "simple",
    "primary_instrument_choice": "Gitar Akustik"
  }'
```

### 4.3 Check Status

```bash
curl http://localhost:3005/api/assessment/{assessment_id}/status \
  -H "Cookie: sid=YOUR_SESSION_ID"
```

### 4.4 Get Results

```bash
curl http://localhost:3005/api/assessment/{assessment_id}/results \
  -H "Cookie: sid=YOUR_SESSION_ID"
```

## 5. Running Tests

```bash
# Unit tests
npm test

# Integration tests
npm test -- --testPathPattern=integration

# E2E tests
npm test -- --testPathPattern=e2e

# With coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

## 6. Project Structure

```
services/recommendation/
├── src/
│   ├── index.ts                 # Entry point
│   ├── config/
│   │   ├── env.ts              # Environment config
│   │   └── database.ts          # Database setup
│   ├── routes/
│   │   └── assessment.ts        # API routes
│   ├── controllers/
│   │   └── assessmentController.ts
│   ├── services/
│   │   ├── assessmentService.ts
│   │   ├── aiService.ts
│   │   └── queueService.ts
│   ├── workers/
│   │   ├── worker1-receiver.ts
│   │   ├── worker2-persistence.ts
│   │   └── worker3-ai-processing.ts
│   ├── schemas/
│   │   └── assessment.ts        # Zod schemas
│   ├── types/
│   │   └── index.ts             # TypeScript types
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── errorHandler.ts
│   │   └── logging.ts
│   └── utils/
│       ├── logger.ts
│       ├── retry.ts
│       └── prompt.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── Dockerfile
├── package.json
├── tsconfig.json
└── jest.config.js
```

## 7. Common Commands

```bash
# Build TypeScript
npm run build

# Start production
npm start

# Start development
npm run dev

# Lint code
npm run lint

# Format code
npm run lint:fix

# Run tests
npm test

# Generate coverage
npm test -- --coverage

# Docker build
npm run docker:build

# Docker run
npm run docker:run
```

## 8. Troubleshooting

### Issue: Connection refused to Redis
**Solution**: Ensure Redis is running on port 6379
```bash
docker run -p 6379:6379 redis:7-alpine
```

### Issue: Database connection error
**Solution**: Check Supabase credentials in .env
```bash
# Test connection
node scripts/test-supabase-connection.js
```

### Issue: AI service timeout
**Solution**: Check OpenAI API key and rate limits
```bash
# Verify API key
echo $OPENAI_API_KEY
```

### Issue: Workers not processing messages
**Solution**: Check Redis queue status
```bash
# Connect to Redis
redis-cli

# Check queue length
LLEN answers_received
LLEN answers_saved
```

## 9. Monitoring

### View Logs

```bash
# Docker logs
docker-compose logs -f recommendation-service

# File logs (if configured)
tail -f logs/recommendation-service.log
```

### Check Metrics

```bash
# Queue depth
curl http://localhost:3005/metrics/queues

# Worker status
curl http://localhost:3005/metrics/workers

# Database connections
curl http://localhost:3005/metrics/database
```

## 10. Next Steps

1. **Read Full Documentation**: Review all docs in `docs/` folder
2. **Implement Service**: Follow Phase 1-5 in `08_IMPLEMENTATION_PHASES.md`
3. **Write Tests**: Use `10_TESTING_STRATEGY.md` as guide
4. **Deploy**: Follow deployment guide in `08_IMPLEMENTATION_PHASES.md`

## 11. Documentation Files

| File | Purpose |
|------|---------|
| `01_ARCHITECTURE_OVERVIEW.md` | System design & architecture |
| `02_DATABASE_SCHEMA.md` | Database tables & relationships |
| `03_API_SPECIFICATIONS.md` | API endpoints & contracts |
| `04_WORKER_IMPLEMENTATION.md` | Worker pattern details |
| `05_AI_INTEGRATION.md` | AI service integration |
| `06_DATA_FLOW.md` | Data flow diagrams |
| `07_TECHNOLOGY_STACK.md` | Tech stack & dependencies |
| `08_IMPLEMENTATION_PHASES.md` | Implementation timeline |
| `09_ERROR_HANDLING.md` | Error handling & retry logic |
| `10_TESTING_STRATEGY.md` | Testing approach |
| `QUICK_START.md` | This file |

## 12. Support & Resources

- **Supabase Docs**: https://supabase.com/docs
- **Redis Docs**: https://redis.io/documentation
- **OpenAI API**: https://platform.openai.com/docs
- **Express.js**: https://expressjs.com
- **TypeScript**: https://www.typescriptlang.org/docs

## 13. Getting Help

1. Check logs: `docker-compose logs recommendation-service`
2. Review error handling: `docs/09_ERROR_HANDLING.md`
3. Check API specs: `docs/03_API_SPECIFICATIONS.md`
4. Review test examples: `docs/10_TESTING_STRATEGY.md`

