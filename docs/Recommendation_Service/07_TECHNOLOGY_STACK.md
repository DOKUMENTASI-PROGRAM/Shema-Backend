# Technology Stack & Dependencies

## 1. Core Technologies

### Runtime & Framework
- **Bun**: v1.x (Fast runtime, drop-in Node.js replacement)
- **TypeScript**: v5.x (Type safety)
- **Express.js**: v4.x (HTTP server)
- **Zod**: v4.x (Schema validation)

### Database & Caching
- **Supabase**: PostgreSQL database
- **Redis**: v7.x (Caching, session storage)
- **Message Broker**: Kafka/RabbitMQ for event-driven communication
- **pg**: v8.x (PostgreSQL client)
- **amqplib**: For RabbitMQ integration
- **kafkajs**: For Kafka integration (alternative)

### External Services
- **OpenAI API**: GPT-4 for AI recommendations
- **Anthropic Claude**: Alternative AI provider

## 2. Dependencies

### Production Dependencies

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.75.0",
    "dotenv": "^17.2.3",
    "express": "^4.18.2",
    "pg": "^8.16.3",
    "redis": "^5.8.3",
    "amqplib": "^0.10.3",
    "kafkajs": "^2.2.4",
    "zod": "^4.1.12",
    "openai": "^4.24.0",
    "axios": "^1.6.0",
    "winston": "^3.11.0",
    "uuid": "^9.0.1"
  }
}
```

### Development Dependencies

```json
{
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/jest": "^29.5.8",
    "@types/node": "^20.9.0",
    "@types/supertest": "^6.0.2",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.1",
    "supertest": "^6.3.3",
    "typescript": "^5.2.2",
    "@typescript-eslint/eslint-plugin": "^6.10.0",
    "@typescript-eslint/parser": "^6.10.0",
    "eslint": "^8.53.0"
  }
}
```

## 3. Architecture Components

### HTTP Server
- **Express.js**: Lightweight, widely used
- **Middleware**: CORS, authentication, logging
- **Error handling**: Centralized error handler

### Message Queue
- **Redis Streams** or **Redis Lists**
  - Pros: Simple, fast, built-in
  - Cons: No persistence guarantees
- **Alternative**: Bull (Redis-based queue library)

### Database ORM
- **Supabase Client**: Direct SQL queries
- **Alternative**: Prisma (type-safe ORM)

### Logging
- **Winston**: Structured logging
- **Log levels**: debug, info, warn, error
- **Transports**: Console, file, external service

### Validation
- **Zod**: Runtime schema validation
- **Type-safe**: Generates TypeScript types

## 4. Docker Configuration

### Service Dockerfile

```dockerfile
FROM oven/bun:latest

WORKDIR /app

# Install dependencies
COPY package*.json bun.lockb* ./
RUN bun install --production

# Copy source code
COPY . .

# Build TypeScript
RUN bun run build

# Expose port
EXPOSE 3005

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun -e "require('http').get('http://localhost:3005/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start service
CMD ["bun", "run", "start"]
```

### Docker Compose Integration

```yaml
recommendation-service:
  build:
    context: .
    dockerfile: ./services/recommendation/Dockerfile
  container_name: shema-recommendation-service
  ports:
    - "3005:3005"
  environment:
    - PORT=3005
    - NODE_ENV=${NODE_ENV:-development}
    - SERVICE_NAME=recommendation-service
    - REDIS_URL=${REDIS_URL}
    - SUPABASE_URL=${SUPABASE_URL}
    - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
    - OPENAI_API_KEY=${OPENAI_API_KEY}
    - SESSION_SECRET=${SESSION_SECRET}
    - SESSION_TTL=${SESSION_TTL}
    - RATE_LIMIT_WINDOW=${RATE_LIMIT_WINDOW}
    - RATE_LIMIT_MAX_REQUESTS=${RATE_LIMIT_MAX_REQUESTS}
  depends_on:
    redis:
      condition: service_healthy
  networks:
    - shema-network
  restart: unless-stopped
```

## 5. Environment Variables

### Required Configuration

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
REDIS_URL=redis://redis:6379

# AI Service
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4-turbo
OPENAI_TIMEOUT=30000

# Authentication
SESSION_SECRET=your-session-secret
SESSION_TTL=1800
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX_REQUESTS=10

# Logging
LOG_LEVEL=info

# Message Broker
MESSAGE_BROKER_TYPE=rabbitmq  # or kafka
RABBITMQ_URL=amqp://rabbitmq:5672
KAFKA_BROKERS=kafka:9092
KAFKA_CLIENT_ID=shema-recommendation-service
KAFKA_GROUP_ID=recommendation-group

# Worker Configuration
AI_WORKER_CONCURRENCY=3
EVENT_TIMEOUT=60000
MAX_EVENT_RETRIES=3
```

## 6. Build & Deployment

### Build Process

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run tests
npm test

# Build Docker image
docker build -t shema-recommendation-service:latest .
```

### Package Scripts

```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node src/index.ts",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix",
    "docker:build": "docker build -t shema-recommendation-service:latest .",
    "docker:run": "docker run -p 3005:3005 shema-recommendation-service:latest"
  }
}
```

## 7. Performance Considerations

### Optimization Strategies
- **Connection pooling**: Reuse database connections
- **Redis caching**: Cache AI responses for identical assessments
- **Batch processing**: Process multiple assessments in parallel
- **Compression**: Gzip responses
- **Rate limiting**: Prevent abuse

### Monitoring Tools
- **Prometheus**: Metrics collection
- **Grafana**: Visualization
- **ELK Stack**: Log aggregation
- **Sentry**: Error tracking

## 8. Security

### Best Practices
- **Environment variables**: Never commit secrets
- **Session validation**: HttpOnly cookies with secure flags
- **Rate limiting**: Based on session ID + IP + User Agent hash
- **Input validation**: Zod schemas for all inputs
- **SQL injection prevention**: Use parameterized queries
- **CORS**: Restrict to known origins
- **Rate limiting**: Prevent abuse
- **HTTPS**: Use in production

### Dependencies Security
```bash
# Check for vulnerabilities
npm audit

# Update dependencies
npm update

# Audit fix
npm audit fix
```

## 9. Scalability

### Horizontal Scaling
- **Load balancer**: Nginx/HAProxy
- **Multiple instances**: Run multiple service replicas
- **Shared Redis**: Central queue for all instances
- **Shared database**: Supabase handles this

### Vertical Scaling
- **Worker concurrency**: Adjust based on load
- **Memory limits**: Monitor and adjust
- **CPU allocation**: Increase for compute-heavy tasks

## 10. Disaster Recovery

### Backup Strategy
- **Database**: Supabase automated backups
- **Redis**: Persistence enabled (RDB/AOF)
- **Code**: Git repository

### Recovery Procedures
- **Database restore**: Use Supabase recovery
- **Redis recovery**: Restart from persistence
- **Service restart**: Docker restart policy

