# API Specifications - Recommendation Service Endpoints

## Base URL
```
http://localhost:3000/api/assessment
http://localhost:3000/api/results
```

## 1. Submit Assessment Answers

### Endpoint
```
POST /api/assessment
```

### Authentication
- **Session-based**: Via X-Session-ID header or query parameter
- **No login required**: Session validated via Redis
- **Header**: `X-Session-ID: <session_id>`
- **TTL**: Managed by Redis session store

### Request Body

```json
{
  "age": 25,
  "practice_hours_per_week": 5,
  "goals": ["Tampil di panggung/cover", "Hobi/relax"],
  "preferred_genres": ["Pop", "Jazz"],
  "previous_instruments": ["Gitar Akustik"],
  "total_experience_years": 3,
  "notation_reading_level": "intermediate",
  "mastered_techniques": ["Jaga tempo/ritme stabil", "Chord dasar/progresi umum"],
  "noise_sensitivity": 3,
  "home_space_availability": "adequate",
  "initial_budget": "Rp2 – 6 juta",
  "instrument_preference": "expressive",
  "learning_style": "exploratory",
  "performance_comfort": 4,
  "practice_discipline": 3,
  "preferred_lesson_times": ["Weekday malam", "Weekend"],
  "preferred_session_duration": "60",
  "class_format_preference": "small_group",
  "learning_approach": "favorite_songs",
  "ensemble_role": "melody",
  "physical_considerations": [],
  "available_instruments": ["Gitar akustik"],
  "notation_preference": "tab",
  "improvisation_interest": 4,
  "grading_exam_interest": "maybe",
  "audio_recording_interest": "simple",
  "primary_instrument_choice": "Gitar Akustik",
  "additional_notes": "Ingin belajar fingerstyle"
}
```

### Response (201 Created)

```json
{
  "success": true,
  "assessment_id": "550e8400-e29b-41d4-a716-446655440001",
  "status": "processing",
  "message": "Assessment submitted successfully. AI analysis in progress."
}
```

### Error Responses

**400 Bad Request**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": {}
  }
}
```

**401 Unauthorized**
```json
{
  "success": false,
  "error": {
    "code": "SESSION_MISSING",
    "message": "Session ID is required"
  }
}
```

## 2. Get Assessment Results

### Endpoint
```
GET /api/results/:session_id
```

### Authentication
- **Session-based**: Via X-Session-ID header or query parameter
- **No login required**: Session validated via Redis

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "assessment": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "session_id": "session_123",
      "assessment_data": { /* full assessment data */ },
      "status": "completed",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:35:00Z"
    },
    "result": {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "assessment_id": "550e8400-e29b-41d4-a716-446655440000",
      "session_id": "session_123",
      "ai_analysis": { /* full AI analysis */ },
      "status": "completed",
      "created_at": "2024-01-15T10:35:00Z",
      "updated_at": "2024-01-15T10:35:00Z"
    }
  },
  "message": "Results retrieved successfully"
}
```

### Response (200 OK) - Processing

```json
{
  "success": true,
  "data": {
    "assessment": { /* assessment data */ },
    "result": null
  },
  "message": "Assessment found, results still processing"
}
```
```

## 3. Get Assessment Results

### Endpoint
```
GET /api/assessment/:assessment_id/results
```

### Authentication
- **Session-based**: Automatic via HttpOnly cookie
- **No login required**: Session created on first request

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "assessment_id": "550e8400-e29b-41d4-a716-446655440000",
    "result_id": "550e8400-e29b-41d4-a716-446655440002",
    "ai_analysis": {
      "recommendations": {
        "instruments": ["Gitar Akustik", "Piano"],
        "skill_level": "intermediate",
        "class_format": "small_group",
        "learning_path": "Start with fingerstyle techniques..."
      },
      "analysis": {
        "instrument_reasoning": "Based on your experience with acoustic guitar...",
        "skill_level_reasoning": "Your 3 years of experience...",
        "strengths": ["Good rhythm sense", "Consistent practice"],
        "areas_for_improvement": ["Music theory", "Sight reading"],
        "learning_style_match": "You prefer exploratory learning...",
        "potential_challenges": ["Time management", "Motivation"],
        "success_factors": ["Regular practice", "Group learning"]
      },
      "practical_advice": {
        "practice_routine": "30 minutes daily, 5 days a week",
        "equipment": "Invest in a quality capo and tuner",
        "genre_focus": "Focus on Pop and Jazz genres",
        "next_steps": "Book a trial class with our instructors"
      },
      "ai_metadata": {
        "model": "gpt-4",
        "prompt_version": "2.1",
        "confidence_score": 0.92,
        "processing_time_ms": 12500
      }
    },
    "status": "completed",
    "created_at": "2024-01-15T10:35:00Z"
  }
}
```

### Error Response (404 Not Found)

```json
{
  "success": false,
  "error": "NOT_FOUND",
  "message": "Assessment or results not found"
}
```

## 4. Get User's Assessment History

### Endpoint
```
GET /api/assessment/history
```

### Query Parameters
- `limit`: Number of records (default: 10, max: 100)
- `offset`: Pagination offset (default: 0)

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "total": 5,
    "assessments": [
      {
        "assessment_id": "550e8400-e29b-41d4-a716-446655440000",
        "status": "completed",
        "created_at": "2024-01-15T10:30:00Z",
        "has_results": true
      }
    ]
  }
}
```

## 5. Error Handling

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| VALIDATION_ERROR | 400 | Invalid input data |
| UNAUTHORIZED | 401 | Missing/invalid session |
| FORBIDDEN | 403 | User not authorized for resource |
| NOT_FOUND | 404 | Resource not found |
| CONFLICT | 409 | Resource already exists |
| RATE_LIMIT | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Server error |
| SERVICE_UNAVAILABLE | 503 | AI service unavailable |

## 6. Rate Limiting

- **Limit**: 10 requests per minute per user
- **Header**: `X-RateLimit-Remaining`
- **Retry-After**: Provided on 429 response

## 7. Request/Response Headers

### Request Headers
```
Content-Type: application/json
Cookie: sid=<opaque_session_id>  # Set automatically by browser
X-Request-ID: <unique_request_id>
```

### Response Headers
```
Content-Type: application/json
X-Request-ID: <unique_request_id>
X-Response-Time: <milliseconds>
```

