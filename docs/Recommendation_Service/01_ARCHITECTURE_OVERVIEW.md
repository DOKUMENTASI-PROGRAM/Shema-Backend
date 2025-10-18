# Class Recommendation Service - Architecture Overview

## 1. System Overview

The Class Recommendation Service is a microservice designed to help users determine their ideal music class registration by analyzing their preferences, experience, and learning style through an MBTI-like assessment questionnaire.

### Key Objectives
- Collect user assessment data through a structured questionnaire
- Process answers using AI-powered analysis
- Generate personalized recommendations for:
  - Musical instrument selection
  - Skill level assessment
  - Class format preferences
  - Learning focus areas

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React/Vue)                     │
│                  - Display Assessment Questions                  │
│                  - Collect User Answers                          │
│                  - Show Recommendations                          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY (Port 3000)                     │
│              - Route requests to services                        │
│              - Authentication & Authorization                   │
│              - Request/Response transformation                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│     RECOMMENDATION SERVICE (Port 3005) - Orchestrator           │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Orchestrator: Answer Receiver & Persistence               │  │
│  │ - Receives answers from API endpoint                      │  │
│  │ - Validates input data                                   │  │
│  │ - Saves data to test_assessment table                     │  │
│  │ - Publishes "assessment_submitted" event to broker       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ HTTP Server                                               │  │
│  │ - POST /api/assessment/submit - Submit answers            │  │
│  │ - GET /api/assessment/:id/status - Check status           │  │
│  │ - GET /api/assessment/:id/results - Get results           │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼ (Message Broker: Kafka/RabbitMQ)
┌─────────────────────────────────────────────────────────────────┐
│              AI-WORKER SERVICE - Consumer                       │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ AI Processor: Event Consumer                              │  │
│  │ - Consumes "assessment_submitted" event                   │  │
│  │ - Builds prompt from event data                           │  │
│  │ - Calls external AI service                               │  │
│  │ - Saves results to result_test table                      │  │
│  │ - Publishes "recommendation_completed" event              │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                ┌────────────┼────────────┐
                ▼            ▼            ▼
         ┌──────────┐  ┌──────────┐  ┌──────────┐
         │ Message  │  │ Supabase │  │   AI     │
         │  Broker  │  │ Database │  │ Service  │
         └──────────┘  └──────────┘  └──────────┘
```

## 3. Service Architecture Pattern

### Event-Driven Microservices with Orchestrator Pattern

The recommendation system uses an **event-driven architecture** with:
- **Recommendation Service (Orchestrator)**: Handles frontend endpoints, validation, persistence, and event publishing
- **AI-Worker Service (Consumer)**: Processes AI requests asynchronously via message broker
- **Message Broker (Kafka/RabbitMQ)**: Decouples services and enables scalability

### Event Flow

```
Frontend Request
      │
      ▼
┌─────────────────────────────────────────┐
│ Orchestrator: Answer Receiver           │
│ - Validates answers                     │
│ - Saves to test_assessment table        │
│ - Publishes "assessment_submitted" event│
└─────────────────────────────────────────┘
      │
      ▼ (Message Broker)
┌─────────────────────────────────────────┐
│ AI-Worker: Event Consumer               │
│ - Consumes "assessment_submitted"       │
│ - Builds AI prompt                      │
│ - Calls AI service                      │
│ - Saves results to result_test table    │
│ - Publishes "recommendation_completed"  │
└─────────────────────────────────────────┘
      │
      ▼ (Optional: Event Response)
┌─────────────────────────────────────────┐
│ Orchestrator: Event Listener            │
│ - Listens for completion events         │
│ - Updates status/cache if needed        │
└─────────────────────────────────────────┘
```

## 4. Integration with Existing Architecture

The service integrates with:
- **API Gateway**: Routes requests and handles authentication
- **Message Broker (Kafka/RabbitMQ)**: Handles event publishing/consuming
- **Supabase**: Database for persistence
- **Supabase**: Stores assessment data and results
- **External AI Service**: Provides recommendation analysis

## 5. Key Design Principles

1. **Asynchronous Processing**: Workers communicate via Redis queues
2. **Resilience**: Failed messages are retried with exponential backoff
3. **Scalability**: Workers can be scaled independently
4. **Observability**: All operations are logged and monitored
5. **Data Integrity**: Transactions ensure consistent state
6. **Security**: Input validation and authentication on all endpoints

