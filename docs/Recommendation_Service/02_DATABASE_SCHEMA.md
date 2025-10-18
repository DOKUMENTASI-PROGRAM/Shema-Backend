# Database Schema - test_assessment & result_test Tables

## 1. test_assessment Table

Stores user assessment data in a single JSON column for simplicity and flexibility.

### Table Definition

```sql
CREATE TABLE test_assessment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(255) NOT NULL, -- Opaque session ID from HttpOnly cookie
  
  -- Assessment data stored as JSON object
  assessment_data JSONB NOT NULL, -- Contains all 28 assessment questions and answers
  
  -- Metadata
  status VARCHAR(50) NOT NULL DEFAULT 'submitted', -- 'submitted', 'processing', 'completed', 'failed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT valid_status CHECK (status IN ('submitted', 'processing', 'completed', 'failed'))
);

-- Indexes for performance
CREATE INDEX idx_test_assessment_session_id ON test_assessment(session_id);
CREATE INDEX idx_test_assessment_status ON test_assessment(status);
CREATE INDEX idx_test_assessment_created_at ON test_assessment(created_at DESC);
CREATE INDEX idx_test_assessment_data_gin ON test_assessment USING GIN (assessment_data);
```

## 2. result_test Table

Stores AI-generated recommendations and analysis results in a single JSON column.

### Table Definition

```sql
CREATE TABLE result_test (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES test_assessment(id) ON DELETE CASCADE,
  session_id VARCHAR(255) NOT NULL, -- Opaque session ID from HttpOnly cookie
  
  -- AI analysis results stored as JSON object
  ai_analysis JSONB NOT NULL, -- Contains all AI recommendations, reasoning, and metadata
  
  -- Metadata
  status VARCHAR(50) NOT NULL DEFAULT 'completed', -- 'pending', 'completed', 'failed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT valid_result_status CHECK (status IN ('pending', 'completed', 'failed'))
);

-- Indexes for performance
CREATE INDEX idx_result_test_assessment_id ON result_test(assessment_id);
CREATE INDEX idx_result_test_session_id ON result_test(session_id);
CREATE INDEX idx_result_test_created_at ON result_test(created_at DESC);
CREATE INDEX idx_result_test_ai_analysis_gin ON result_test USING GIN (ai_analysis);
```

## 3. JSON Data Structures

### test_assessment.assessment_data Structure
```json
{
  "questions": {
    "q01": {"question": "How old are you?", "answer": 25},
    "q02": {"question": "How many hours per week can you practice?", "answer": 5},
    "q03": {"question": "What are your musical goals?", "answer": ["learn_songs", "perform_live"]},
    // ... all 28 questions
    "q28": {"question": "Additional notes", "answer": "I love classical music"}
  },
  "metadata": {
    "submitted_at": "2024-01-15T10:30:00Z",
    "version": "1.0"
  }
}
```

### result_test.ai_analysis Structure
```json
{
  "recommendations": {
    "instruments": ["piano", "guitar"],
    "skill_level": "beginner",
    "class_format": "private",
    "learning_path": "Structured fundamentals with song integration"
  },
  "analysis": {
    "instrument_reasoning": "Based on your goals and experience...",
    "skill_level_reasoning": "Your current experience suggests...",
    "strengths": ["Good practice discipline", "Interest in theory"],
    "areas_for_improvement": ["Technical foundation", "Performance comfort"],
    "potential_challenges": ["Time management", "Physical technique"],
    "success_factors": ["Consistent practice", "Teacher guidance"]
  },
  "practical_advice": {
    "practice_routine": "30 minutes daily, 5 days/week",
    "equipment": "Beginner piano, metronome, theory books",
    "next_steps": "Start with basic technique, learn simple songs"
  },
  "ai_metadata": {
    "model": "gpt-4-turbo",
    "prompt_version": "2.1",
    "confidence_score": 0.89,
    "processing_time_ms": 12500
  }
}
```

## 4. Data Relationships

```
Sessions (Anonymous) ─────────── (N) test_assessment
                                      │
                                      │ (1)
                                      │
                                      └──────────── (N) result_test
```

Note: Session IDs are stored as opaque strings in Redis with HttpOnly cookies for client access. No user authentication required.

## 4. Migration Strategy

### Phase 1: Create Tables
```bash
# Run migration via Supabase CLI
supabase migration new create_assessment_tables
```

### Phase 2: Add Indexes
Indexes are created automatically with table creation.

### Phase 3: Add RLS Policies
```sql
-- For session-based authentication, RLS policies are simplified
-- Access control is handled at the application level via session validation

-- test_assessment RLS - Allow service-level access
ALTER TABLE test_assessment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service can manage assessments"
  ON test_assessment FOR ALL
  USING (true); -- Access controlled by service authentication

-- result_test RLS - Allow service-level access
ALTER TABLE result_test ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service can manage results"
  ON result_test FOR ALL
  USING (true); -- Access controlled by service authentication
```

## 5. Data Retention Policy

- **test_assessment**: Keep for 2 years for analytics
- **result_test**: Keep indefinitely for user reference
- Implement archival process for old records

