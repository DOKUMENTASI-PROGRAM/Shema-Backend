# Visual Reference Guide

## 1. System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React/Vue)                         │
│                    Display Questions & Results                       │
└────────────────────────────┬────────────────────────────────────────┘
                             │ HTTP
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      API GATEWAY (Port 3000)                         │
│              Route, Authenticate, Transform Requests                │
└────────────────────────────┬────────────────────────────────────────┘
                             │ HTTP
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│         RECOMMENDATION SERVICE (Port 3005)                           │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Worker 1: Answer Receiver                                   │  │
│  │ • Validate input                                            │  │
│  │ • Create assessment record                                  │  │
│  │ • Publish to queue                                          │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                          ↓ Redis Queue                               │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Worker 2: Data Persistence                                  │  │
│  │ • Save to database                                          │  │
│  │ • Update status                                             │  │
│  │ • Publish to queue                                          │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                          ↓ Redis Queue                               │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Worker 3: AI Processing                                     │  │
│  │ • Build prompt                                              │  │
│  │ • Call AI service                                           │  │
│  │ • Save results                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                    ↓              ↓              ↓
            ┌──────────────┐ ┌──────────┐ ┌──────────┐
            │  Supabase    │ │  Redis   │ │ OpenAI   │
            │  Database    │ │  Cache   │ │ GPT-4    │
            └──────────────┘ └──────────┘ └──────────┘
```

## 2. Data Flow Timeline

```
T=0s    User submits assessment
        ↓
T=0.1s  Worker 1 validates & creates record
        ↓ (202 Accepted returned to user)
T=0.2s  Worker 2 receives message from queue
        ↓
T=0.5s  Worker 2 saves to database
        ↓
T=0.6s  Worker 3 receives message from queue
        ↓
T=0.7s  Worker 3 builds AI prompt
        ↓
T=0.8s  Worker 3 calls OpenAI API
        ↓
T=25s   OpenAI returns recommendations
        ↓
T=25.5s Worker 3 saves results to database
        ↓
T=25.6s User polls for results
        ↓
T=25.7s Results returned to user
```

## 3. Database Relationship Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      auth.users                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ id (UUID)                                           │   │
│  │ email                                               │   │
│  │ created_at                                          │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │ (Anonymous)
                         │ session_id
                         │ (N)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   test_assessment                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ id (UUID) PRIMARY KEY                              │   │
│  │ session_id (VARCHAR) - Opaque session ID           │   │
│  │ assessment_data (JSONB) - All 28 questions         │   │
│  │   ├── questions (q01-q28 with answers)             │   │
│  │   └── metadata (submitted_at, version)             │   │
│  │ status ('submitted', 'processing', 'completed')   │   │
│  │ created_at, updated_at                             │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │ (1)
                         │ assessment_id
                         │ (N)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                     result_test                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ id (UUID) PRIMARY KEY                              │   │
│  │ assessment_id (FK → test_assessment)               │   │
│  │ user_id (FK → auth.users)                          │   │
│  │ ai_analysis (JSONB) - All AI results               │   │
│  │   ├── recommendations (instruments, skill_level,   │   │
│  │   │    class_format, learning_path)                │   │
│  │   ├── analysis (reasoning, strengths,             │   │
│  │   │    improvements, challenges)                   │   │
│  │   ├── practical_advice (practice, equipment,      │   │
│  │   │    next_steps)                                 │   │
│  │   └── ai_metadata (model, confidence, etc.)       │   │
│  │ status ('completed', 'failed')                    │   │
│  │ created_at, updated_at                            │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
│  │ next_steps, ai_model_used, ai_prompt_version      │   │
│  │ ai_confidence_score, status, created_at            │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 4. Worker Communication Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                    HTTP Request                             │
│              POST /api/assessment/submit                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────┐
        │ Worker 1: Answer Receiver      │
        │ • Validate schema              │
        │ • Create DB record             │
        │ • Publish message              │
        └────────────────────────────────┘
                         │
                         ▼ (Redis LPUSH)
        ┌────────────────────────────────┐
        │ Queue: answers_received        │
        │ [msg1, msg2, msg3, ...]        │
        └────────────────────────────────┘
                         │
                         ▼ (Redis BRPOP)
        ┌────────────────────────────────┐
        │ Worker 2: Data Persistence     │
        │ • Save to database             │
        │ • Update status                │
        │ • Publish message              │
        └────────────────────────────────┘
                         │
                         ▼ (Redis LPUSH)
        ┌────────────────────────────────┐
        │ Queue: answers_saved           │
        │ [msg1, msg2, msg3, ...]        │
        └────────────────────────────────┘
                         │
                         ▼ (Redis BRPOP)
        ┌────────────────────────────────┐
        │ Worker 3: AI Processing        │
        │ • Build prompt                 │
        │ • Call AI service              │
        │ • Save results                 │
        └────────────────────────────────┘
                         │
                         ▼ (Redis PUBLISH)
        ┌────────────────────────────────┐
        │ Event: assessment_completed    │
        │ (Subscribed by frontend)       │
        └────────────────────────────────┘
```

## 5. Error Handling Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Operation Attempt                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────┐
        │ Try Operation                  │
        └────────────────────────────────┘
                         │
            ┌────────────┴────────────┐
            │                         │
            ▼ Success                 ▼ Error
        ┌────────────┐        ┌────────────────────┐
        │ Return     │        │ Retryable?         │
        │ Result     │        └────────────────────┘
        └────────────┘                 │
                            ┌────────────┴────────────┐
                            │ Yes                    │ No
                            ▼                        ▼
                    ┌──────────────────┐    ┌──────────────────┐
                    │ Attempt < Max?   │    │ Return Error     │
                    └──────────────────┘    │ (4xx/5xx)        │
                            │               └──────────────────┘
                ┌───────────┴───────────┐
                │ Yes                  │ No
                ▼                      ▼
        ┌──────────────────┐  ┌──────────────────┐
        │ Wait (Backoff)   │  │ Move to DLQ      │
        │ Retry            │  │ Log Error        │
        └──────────────────┘  │ Alert            │
                              └──────────────────┘
```

## 6. Assessment Question Sections

```
┌─────────────────────────────────────────────────────────────┐
│                  28 Assessment Questions                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ SECTION A: PROFILE (2 questions)                            │
│ • Age (4-80)                                                │
│ • Practice hours per week (0-20)                            │
│                                                              │
│ SECTION B: GOALS & GENRES (2 questions)                     │
│ • Learning goals (multiple choice)                          │
│ • Preferred genres (multiple choice)                        │
│                                                              │
│ SECTION C: EXPERIENCE (3 questions)                         │
│ • Previous instruments (multiple choice)                    │
│ • Total experience years (0-20)                             │
│ • Notation reading level (4 options)                        │
│                                                              │
│ SECTION D: PREFERENCES (4 questions)                        │
│ • Noise sensitivity (1-5 scale)                             │
│ • Home space (3 options)                                    │
│ • Budget (4 options)                                        │
│ • Instrument preference (3 options)                         │
│                                                              │
│ SECTION E: LEARNING STYLE (3 questions)                     │
│ • Learning style (3 options)                                │
│ • Performance comfort (1-5 scale)                           │
│ • Practice discipline (1-5 scale)                           │
│                                                              │
│ SECTION F: LOGISTICS (3 questions)                          │
│ • Preferred lesson times (multiple choice)                  │
│ • Session duration (3 options)                              │
│ • Class format (3 options)                                  │
│                                                              │
│ SECTION G: DIRECTION & INTERESTS (6 questions)              │
│ • Learning approach (2 options)                             │
│ • Ensemble role (4 options)                                 │
│ • Physical considerations (multiple choice)                 │
│ • Available instruments (multiple choice)                   │
│ • Notation preference (4 options)                           │
│ • Improvisation interest (1-5 scale)                        │
│ • Grading exam interest (3 options)                         │
│ • Audio recording interest (3 options)                      │
│ • Primary instrument choice (9 options)                     │
│ • Additional notes (free text)                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 7. API Response Status Codes

```
┌─────────────────────────────────────────────────────────────┐
│                    HTTP Status Codes                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ 2xx SUCCESS                                                  │
│ ├─ 200 OK - Request successful                              │
│ ├─ 202 Accepted - Assessment submitted (async processing)   │
│ └─ 204 No Content - Successful, no response body             │
│                                                              │
│ 4xx CLIENT ERROR                                             │
│ ├─ 400 Bad Request - Invalid input data                      │
│ ├─ 401 Unauthorized - Missing/invalid token                 │
│ ├─ 403 Forbidden - Insufficient permissions                 │
│ ├─ 404 Not Found - Resource doesn't exist                    │
│ ├─ 409 Conflict - Resource already exists                    │
│ └─ 429 Too Many Requests - Rate limit exceeded               │
│                                                              │
│ 5xx SERVER ERROR                                             │
│ ├─ 500 Internal Server Error - Unexpected error              │
│ ├─ 502 Bad Gateway - Service unavailable                     │
│ ├─ 503 Service Unavailable - Maintenance/overload            │
│ └─ 504 Gateway Timeout - Request timeout                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 8. Implementation Timeline Gantt Chart

```
Week 1-2: Foundation
├─ Database Setup ████████
├─ Service Scaffolding ████████
└─ API Structure ████████

Week 3-4: Core Workers
├─ Worker 1 ████████
├─ Worker 2 ████████
└─ Worker 3 ████████

Week 5: Integration
├─ API Gateway Integration ████████
├─ Error Handling ████████
└─ Status/Results Endpoints ████████

Week 6: Testing
├─ Unit Tests ████████
├─ Integration Tests ████████
└─ Performance Optimization ████████

Week 7: Deployment
├─ Docker Setup ████████
├─ Production Config ████████
└─ Documentation & Deploy ████████
```

## 9. Technology Stack Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                       │
│                    React / Vue Frontend                      │
└─────────────────────────────────────────────────────────────┘
                             │
┌─────────────────────────────────────────────────────────────┐
│                    API LAYER                                │
│              Express.js HTTP Server                         │
│              JWT Authentication                             │
│              Request Validation (Zod)                       │
└─────────────────────────────────────────────────────────────┘
                             │
┌─────────────────────────────────────────────────────────────┐
│                    BUSINESS LOGIC LAYER                      │
│              Worker Pipeline (3 Workers)                    │
│              AI Integration                                 │
│              Error Handling                                 │
└─────────────────────────────────────────────────────────────┘
                             │
┌─────────────────────────────────────────────────────────────┐
│                    DATA LAYER                               │
│              Supabase (PostgreSQL)                          │
│              Redis (Cache & Queues)                         │
│              OpenAI API (AI Service)                        │
└─────────────────────────────────────────────────────────────┘
```

## 10. Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PRODUCTION ENVIRONMENT                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Load Balancer (Nginx/HAProxy)                        │  │
│  └──────────────────────────────────────────────────────┘  │
│                    │         │         │                    │
│         ┌──────────┴─────────┴─────────┴──────────┐         │
│         │                                         │         │
│         ▼                    ▼                    ▼         │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│  │ Service Pod 1  │  │ Service Pod 2  │  │ Service Pod 3  │
│  │ (Docker)       │  │ (Docker)       │  │ (Docker)       │
│  └────────────────┘  └────────────────┘  └────────────────┘
│         │                    │                    │         │
│         └──────────┬─────────┴─────────┬──────────┘         │
│                    │                   │                    │
│         ┌──────────▼──────┐  ┌────────▼──────────┐         │
│         │ Redis Cluster   │  │ Supabase Database │         │
│         │ (Shared)        │  │ (Managed)         │         │
│         └─────────────────┘  └───────────────────┘         │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Monitoring & Logging (Prometheus, ELK, Sentry)      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

**Visual Reference Guide Complete**
Use these diagrams as quick reference during development and discussions.

