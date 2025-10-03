# Database Design & Best Practices

## Database Architecture

### Database Per Service Pattern
Each microservice has its own independent database following the **Database Per Service** pattern:

```
Identity Service → identity_db (PostgreSQL/MySQL)
Course Service  → course_db (PostgreSQL/MySQL)
Chat Service    → chat_db (PostgreSQL/MySQL) + Redis (cache)
```

**Benefits**:
- Service independence and autonomy
- Technology flexibility per service
- Easier scaling
- Fault isolation

**Considerations**:
- No direct joins across services
- Eventual consistency required
- Data duplication where necessary

---

## Schema Design

### Identity Service Database (identity_db)

#### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('instructor', 'student')),
    name VARCHAR(200) NOT NULL,
    phone VARCHAR(20),
    bio TEXT,
    profile_image_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(created_at);
```

#### Refresh Tokens Table (optional)
```sql
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
```

---

### Course Service Database (course_db)

#### Courses Table
```sql
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price INTEGER NOT NULL CHECK (price >= 0),
    instructor_id UUID NOT NULL,  -- References user in identity service
    instructor_name VARCHAR(200) NOT NULL,  -- Denormalized for performance
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes >= 30),
    max_students INTEGER DEFAULT 10 CHECK (max_students > 0),
    current_students INTEGER DEFAULT 0 CHECK (current_students >= 0),
    category VARCHAR(50),  -- e.g., 'guitar', 'piano', 'vocal'
    level VARCHAR(20),  -- e.g., 'beginner', 'intermediate', 'advanced'
    schedule JSONB,  -- Array of schedule strings
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- Indexes
CREATE INDEX idx_courses_instructor_id ON courses(instructor_id);
CREATE INDEX idx_courses_category ON courses(category);
CREATE INDEX idx_courses_level ON courses(level);
CREATE INDEX idx_courses_price ON courses(price);
CREATE INDEX idx_courses_created_at ON courses(created_at);
CREATE INDEX idx_courses_deleted_at ON courses(deleted_at);

-- Full-text search index
CREATE INDEX idx_courses_name_search ON courses USING gin(to_tsvector('english', name));
CREATE INDEX idx_courses_description_search ON courses USING gin(to_tsvector('english', description));
```

#### Enrollments Table (optional)
```sql
CREATE TABLE enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    student_id UUID NOT NULL,  -- References user in identity service
    student_name VARCHAR(200) NOT NULL,
    status VARCHAR(20) DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'completed', 'cancelled')),
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    
    UNIQUE(course_id, student_id)
);

CREATE INDEX idx_enrollments_course_id ON enrollments(course_id);
CREATE INDEX idx_enrollments_student_id ON enrollments(student_id);
CREATE INDEX idx_enrollments_status ON enrollments(status);
```

---

### Chat Service Database (chat_db)

#### Chat Sessions Table
```sql
CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,  -- References user in identity service
    title VARCHAR(200),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_created_at ON chat_sessions(created_at);
```

#### Chat Messages Table
```sql
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    tokens_used INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);
```

#### Chat Context Cache (Redis)
```
Key Pattern: chat:context:{session_id}
Value: JSON array of recent messages
TTL: 1 hour

Example:
{
  "messages": [
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": "..."}
  ],
  "message_count": 10,
  "last_updated": "2025-03-01T10:05:00Z"
}
```

---

## Database Best Practices

### 1. Naming Conventions

#### Table Names
- Use **plural** form: `users`, `courses`, `chat_messages`
- Use **snake_case**: `chat_sessions`, `refresh_tokens`
- Be descriptive and clear

#### Column Names
- Use **snake_case**: `user_id`, `created_at`, `password_hash`
- Use meaningful names: `instructor_name` not `i_name`
- Boolean columns: prefix with `is_` or `has_`: `is_active`, `has_verified`
- Timestamps: use `_at` suffix: `created_at`, `updated_at`, `deleted_at`

#### Indexes
- Prefix with `idx_`: `idx_users_email`, `idx_courses_instructor_id`
- Include table name: `idx_courses_created_at`
- Describe indexed columns: `idx_users_email_role`

### 2. Data Types

#### Use Appropriate Types
```sql
-- ✅ Good
id UUID PRIMARY KEY
email VARCHAR(255)
price INTEGER
description TEXT
is_active BOOLEAN
created_at TIMESTAMP

-- ❌ Bad
id VARCHAR(50)  -- Use UUID instead
price VARCHAR(20)  -- Use INTEGER for numbers
created_at VARCHAR(50)  -- Use TIMESTAMP
```

#### JSON for Semi-Structured Data
```sql
-- Good for arrays and flexible data
schedule JSONB
metadata JSONB

-- Bad for simple data that should be normalized
user_data JSONB  -- Should be separate columns
```

### 3. Constraints & Validation

#### Primary Keys
```sql
-- Use UUID for distributed systems
id UUID PRIMARY KEY DEFAULT gen_random_uuid()

-- Or use auto-increment for single database
id SERIAL PRIMARY KEY
```

#### Foreign Keys
```sql
-- Use foreign keys within same database
course_id UUID REFERENCES courses(id) ON DELETE CASCADE

-- Use soft references across services (no FK constraint)
instructor_id UUID NOT NULL  -- References user in identity service
```

#### Check Constraints
```sql
-- Validate data at database level
price INTEGER CHECK (price >= 0)
role VARCHAR(20) CHECK (role IN ('instructor', 'student'))
duration_minutes INTEGER CHECK (duration_minutes >= 30)
```

#### Unique Constraints
```sql
-- Prevent duplicates
email VARCHAR(255) UNIQUE NOT NULL
UNIQUE(course_id, student_id)  -- Composite unique
```

#### NOT NULL Constraints
```sql
-- Require essential fields
name VARCHAR(200) NOT NULL
email VARCHAR(255) NOT NULL
created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
```

### 4. Indexing Strategy

#### When to Add Indexes
- **Primary keys**: Automatic
- **Foreign keys**: Always index
- **Frequently queried columns**: `email`, `created_at`, `status`
- **Columns in WHERE clauses**: Especially with high cardinality
- **Columns in JOIN conditions**: Cross-service queries
- **Columns in ORDER BY**: Sort operations

#### Index Examples
```sql
-- Single column index
CREATE INDEX idx_users_email ON users(email);

-- Composite index (order matters!)
CREATE INDEX idx_courses_instructor_category ON courses(instructor_id, category);

-- Partial index (for specific conditions)
CREATE INDEX idx_active_courses ON courses(created_at) WHERE deleted_at IS NULL;

-- Full-text search index
CREATE INDEX idx_courses_search ON courses USING gin(to_tsvector('english', name || ' ' || description));
```

#### Index Considerations
- **Don't over-index**: Indexes slow down writes
- **Monitor query performance**: Use EXPLAIN ANALYZE
- **Update statistics**: Run ANALYZE regularly
- **Remove unused indexes**: Check usage with pg_stat_user_indexes

### 5. Timestamps & Soft Deletes

#### Standard Timestamp Columns
```sql
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
deleted_at TIMESTAMP NULL  -- For soft deletes
```

#### Auto-Update Trigger (PostgreSQL)
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_courses_updated_at 
    BEFORE UPDATE ON courses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

#### Soft Delete Pattern
```sql
-- Mark as deleted instead of actually deleting
UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1;

-- Query only active records
SELECT * FROM users WHERE deleted_at IS NULL;

-- Create index for performance
CREATE INDEX idx_users_deleted_at ON users(deleted_at);
```

### 6. Data Migration

#### Migration Files
```
migrations/
├── 001_create_users_table.sql
├── 002_create_courses_table.sql
├── 003_add_user_bio_column.sql
└── 004_create_chat_tables.sql
```

#### Migration Best Practices
- **Always reversible**: Provide rollback scripts
- **Small incremental changes**: One change per migration
- **Test migrations**: Test on development database first
- **Version control**: Commit migrations with code
- **Sequential naming**: Use timestamps or numbers

#### Example Migration
```sql
-- Up Migration: 003_add_user_bio_column.sql
ALTER TABLE users ADD COLUMN bio TEXT;

-- Down Migration: 003_add_user_bio_column.down.sql
ALTER TABLE users DROP COLUMN bio;
```

### 7. Connection Pooling

#### Node.js (pg library)
```javascript
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,  // Maximum connections in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

#### Python (psycopg2)
```python
from psycopg2 import pool

connection_pool = pool.SimpleConnectionPool(
    minconn=1,
    maxconn=20,
    host=os.getenv('DB_HOST'),
    database=os.getenv('DB_NAME'),
    user=os.getenv('DB_USER'),
    password=os.getenv('DB_PASSWORD')
)
```

### 8. Transactions

#### Use Transactions for Multi-Step Operations
```javascript
// ✅ Good - Using transaction
async function enrollStudent(courseId, studentId) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Check if course has space
    const course = await client.query(
      'SELECT max_students, current_students FROM courses WHERE id = $1 FOR UPDATE',
      [courseId]
    );
    
    if (course.rows[0].current_students >= course.rows[0].max_students) {
      throw new Error('Course is full');
    }
    
    // Create enrollment
    await client.query(
      'INSERT INTO enrollments (course_id, student_id) VALUES ($1, $2)',
      [courseId, studentId]
    );
    
    // Update student count
    await client.query(
      'UPDATE courses SET current_students = current_students + 1 WHERE id = $1',
      [courseId]
    );
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

### 9. Query Optimization

#### Use EXPLAIN ANALYZE
```sql
EXPLAIN ANALYZE
SELECT * FROM courses 
WHERE instructor_id = 'uuid-123' 
  AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 10;
```

#### Avoid N+1 Queries
```javascript
// ❌ Bad - N+1 query problem
const courses = await Course.findAll();
for (const course of courses) {
  course.instructor = await User.findById(course.instructor_id);
}

// ✅ Good - Single query with join or batch fetch
const courses = await Course.findAllWithInstructors();
```

#### Use Pagination
```javascript
// ✅ Always paginate list queries
async function getCourses(page = 1, limit = 10) {
  const offset = (page - 1) * limit;
  
  const result = await pool.query(
    'SELECT * FROM courses WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT $1 OFFSET $2',
    [limit, offset]
  );
  
  const countResult = await pool.query(
    'SELECT COUNT(*) FROM courses WHERE deleted_at IS NULL'
  );
  
  return {
    data: result.rows,
    pagination: {
      page,
      limit,
      total: parseInt(countResult.rows[0].count),
      total_pages: Math.ceil(countResult.rows[0].count / limit)
    }
  };
}
```

### 10. Environment Separation

#### Use Different Databases
```
Development:  localhost:5432/identity_db_dev
Testing:      localhost:5432/identity_db_test
Production:   prod-server:5432/identity_db_prod
```

#### Configuration
```javascript
const dbConfig = {
  development: {
    host: 'localhost',
    database: 'identity_db_dev'
  },
  test: {
    host: 'localhost',
    database: 'identity_db_test'
  },
  production: {
    host: process.env.DB_HOST,
    database: process.env.DB_NAME
  }
};

const config = dbConfig[process.env.NODE_ENV || 'development'];
```

---

## Redis Best Practices

### Key Naming Convention
```
Pattern: {service}:{resource}:{id}:{field}

Examples:
chat:context:session-uuid-123
chat:ratelimit:user-uuid-456:20250301
course:cache:instructor-uuid-789:courses
```

### Set Appropriate TTLs
```javascript
// Chat context: 1 hour
await redis.setex('chat:context:session-123', 3600, JSON.stringify(context));

// Rate limiting: 1 minute
await redis.setex('chat:ratelimit:user-456', 60, messageCount);

// Cache: 5 minutes
await redis.setex('course:cache:list', 300, JSON.stringify(courses));
```

### Handle Connection Errors
```javascript
const redis = require('redis');
const client = redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  retry_strategy: (options) => {
    if (options.error && options.error.code === 'ECONNREFUSED') {
      return new Error('Redis server refused connection');
    }
    if (options.total_retry_time > 1000 * 60 * 60) {
      return new Error('Retry time exhausted');
    }
    if (options.attempt > 10) {
      return undefined;  // Stop retrying
    }
    return Math.min(options.attempt * 100, 3000);  // Exponential backoff
  }
});
```
