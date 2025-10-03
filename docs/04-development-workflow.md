# Development Workflow

## Initial Setup

### Prerequisites
- Node.js 18+ or Python 3.10+ (depending on your choice)
- Docker & Docker Compose
- Git
- PostgreSQL (if running locally without Docker)
- Redis (if running locally without Docker)
- OpenAI API Key

### Environment Setup

#### 1. Clone Repository
```bash
git clone https://github.com/DOKUMENTASI-PROGRAM/Back-End.git
cd Back-End
```

#### 2. Create Environment Files
Each service needs its own `.env` file:

**Identity Service** (`services/identity-service/.env`):
```env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/identity_db
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h
```

**Course Service** (`services/course-service/.env`):
```env
NODE_ENV=development
PORT=3002
DATABASE_URL=postgresql://user:password@localhost:5432/course_db
JWT_SECRET=your-super-secret-jwt-key-change-in-production
IDENTITY_SERVICE_URL=http://localhost:3001
```

**Chat Service** (`services/chat-service/.env`):
```env
NODE_ENV=development
PORT=3003
DATABASE_URL=postgresql://user:password@localhost:5432/chat_db
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=sk-your-openai-api-key-here
JWT_SECRET=your-super-secret-jwt-key-change-in-production
CHATGPT_MODEL=gpt-3.5-turbo
MAX_CONTEXT_MESSAGES=10
RATE_LIMIT_MESSAGES_PER_MINUTE=20
```

**API Gateway** (`services/api-gateway/.env`):
```env
NODE_ENV=development
PORT=8080
IDENTITY_SERVICE_URL=http://localhost:3001
COURSE_SERVICE_URL=http://localhost:3002
CHAT_SERVICE_URL=http://localhost:3003
```

---

## Running with Docker (Recommended)

### Start All Services
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f identity-service
docker-compose logs -f course-service
docker-compose logs -f chat-service
```

### Check Service Status
```bash
# List all running containers
docker-compose ps

# Check health of services
docker-compose ps --services --filter "status=running"
```

### Rebuild Services
```bash
# Rebuild all services
docker-compose build

# Rebuild specific service
docker-compose build identity-service

# Rebuild and restart
docker-compose up -d --build
```

### Stop Services
```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes data)
docker-compose down -v
```

---

## Running Locally (Development)

### Identity Service
```bash
cd services/identity-service

# Install dependencies (Node.js)
npm install

# Or for Python
pip install -r requirements.txt

# Run database migrations
npm run migrate
# Or: python manage.py migrate

# Start development server
npm run dev
# Or: python app.py

# Service runs on http://localhost:3001
```

### Course Service
```bash
cd services/course-service

npm install
npm run migrate
npm run dev

# Service runs on http://localhost:3002
```

### Chat Service
```bash
cd services/chat-service

npm install
npm run migrate
npm run dev

# Service runs on http://localhost:3003
```

### API Gateway
```bash
cd services/api-gateway

npm install
npm run dev

# Gateway runs on http://localhost:8080
```

---

## Code Organization Conventions

### Layer Responsibilities

#### Controllers
- Handle HTTP requests and responses
- Parse and validate input parameters
- Call service layer methods
- Format responses with appropriate status codes
- **Keep them thin** - no business logic here

Example:
```javascript
// ✅ Good - Thin controller
async function createCourse(req, res) {
  try {
    const courseData = req.body;
    const instructorId = req.user.id; // From auth middleware
    
    const course = await courseService.createCourse(courseData, instructorId);
    
    return res.status(201).json({
      success: true,
      data: course
    });
  } catch (error) {
    return handleError(res, error);
  }
}

// ❌ Bad - Business logic in controller
async function createCourse(req, res) {
  const courseData = req.body;
  
  // Don't do validation and business logic here
  if (courseData.price < 0) {
    return res.status(400).json({ error: "Invalid price" });
  }
  
  // Don't query database directly from controller
  const course = await Course.create(courseData);
  return res.json(course);
}
```

#### Services
- Contain business logic and rules
- Interact with models/repositories
- Handle data transformations
- Implement business validations
- **Follow single responsibility principle**

Example:
```javascript
// ✅ Good - Business logic in service
async function createCourse(courseData, instructorId) {
  // Validation
  if (courseData.price < 0) {
    throw new ValidationError("Price must be positive");
  }
  
  // Business rule
  if (courseData.duration_minutes < 30) {
    throw new ValidationError("Course must be at least 30 minutes");
  }
  
  // Check instructor course limit
  const instructorCourseCount = await courseRepository.countByInstructor(instructorId);
  if (instructorCourseCount >= 10) {
    throw new BusinessError("Instructor has reached maximum course limit");
  }
  
  // Create course
  const course = await courseRepository.create({
    ...courseData,
    instructor_id: instructorId
  });
  
  return course;
}
```

#### Models
- Define data structures and schemas
- Handle database interactions
- Implement data validation
- Define relationships between entities

Example:
```javascript
// ✅ Good - Model with validation
class Course {
  static schema = {
    id: { type: 'uuid', primaryKey: true },
    name: { type: 'string', required: true, maxLength: 200 },
    price: { type: 'integer', required: true, min: 0 },
    instructor_id: { type: 'uuid', required: true, foreignKey: 'User' }
  };
  
  static async findById(id) {
    return await db.query('SELECT * FROM courses WHERE id = $1', [id]);
  }
  
  static async create(data) {
    // Model-level validation
    this.validate(data);
    return await db.query('INSERT INTO courses ...', data);
  }
}
```

#### Middleware
- Process requests before controllers
- Implement authentication and authorization
- Validate request format
- Handle CORS and security headers
- Log requests
- **Implement proper error handling**

Example:
```javascript
// ✅ Good - Auth middleware
async function authMiddleware(req, res, next) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'No token provided' }
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' }
    });
  }
}
```

---

## Development Best Practices

### MVC Pattern Rules
1. **Never put business logic in controllers** - move it to services
2. **Services should not import controllers** - maintain unidirectional dependency
3. **Controllers should not directly access models** - go through services
4. **Models should be database-agnostic** at the service layer

### Dependency Flow
```
Client → Routes → Middleware → Controller → Service → Model → Database
                                    ↓
                                 Response
```

### Error Handling Strategy
```javascript
// Custom error classes
class ValidationError extends Error {
  constructor(message, details) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
    this.details = details;
  }
}

class UnauthorizedError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UnauthorizedError';
    this.statusCode = 401;
  }
}

// Global error handler middleware
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const response = {
    success: false,
    error: {
      code: err.name || 'INTERNAL_ERROR',
      message: err.message
    }
  };
  
  if (err.details) {
    response.error.details = err.details;
  }
  
  // Log error (but not sensitive data)
  logger.error({
    error: err.name,
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });
  
  res.status(statusCode).json(response);
}
```

### Dependency Injection
```javascript
// ✅ Good - Dependency injection
class CourseService {
  constructor(courseRepository, userRepository) {
    this.courseRepository = courseRepository;
    this.userRepository = userRepository;
  }
  
  async createCourse(data, instructorId) {
    // Use injected dependencies
    const instructor = await this.userRepository.findById(instructorId);
    return await this.courseRepository.create(data);
  }
}

// Usage
const courseRepository = new CourseRepository(db);
const userRepository = new UserRepository(db);
const courseService = new CourseService(courseRepository, userRepository);
```

---

## Common Development Tasks

### Adding a New Endpoint
1. Define route in `routes/` folder
2. Create controller method in `controllers/`
3. Implement business logic in `services/`
4. Add/update model if needed in `models/`
5. Add validation middleware if needed
6. Write tests for the endpoint
7. Update API documentation

### Database Migration
```bash
# Create new migration
npm run migrate:create -- add_courses_table

# Run migrations
npm run migrate:up

# Rollback migration
npm run migrate:down

# Check migration status
npm run migrate:status
```

### Adding Dependencies
```bash
# Install for specific service
cd services/identity-service
npm install package-name

# Or for Python
pip install package-name
pip freeze > requirements.txt
```

### Code Formatting
```bash
# Format code (if using Prettier/Black)
npm run format

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

---

## Debugging

### View Logs
```bash
# Docker logs
docker-compose logs -f service-name

# Local logs
tail -f logs/app.log
```

### Debug Specific Service
```bash
# Attach debugger (Node.js)
node --inspect=0.0.0.0:9229 app.js

# Python debugger
python -m pdb app.py
```

### Database Inspection
```bash
# Connect to PostgreSQL in Docker
docker-compose exec postgres psql -U user -d database_name

# Common SQL queries
SELECT * FROM users LIMIT 10;
SELECT * FROM courses WHERE instructor_id = 'uuid';
```

### Redis Inspection
```bash
# Connect to Redis in Docker
docker-compose exec redis redis-cli

# Common Redis commands
KEYS *
GET key_name
TTL key_name
```

---

## Git Workflow

### Branch Strategy
- `master` - Production-ready code
- `develop` - Integration branch
- `feature/feature-name` - Feature branches
- `bugfix/bug-name` - Bug fix branches

### Commit Message Convention
```
<type>(<scope>): <subject>

Examples:
feat(course): add course creation endpoint
fix(auth): resolve JWT token expiration issue
docs(api): update endpoint documentation
refactor(chat): improve context management
test(course): add integration tests for course service
```

### Common Git Commands
```bash
# Create feature branch
git checkout -b feature/course-enrollment

# Commit changes
git add .
git commit -m "feat(course): add enrollment functionality"

# Push to remote
git push origin feature/course-enrollment

# Update from develop
git checkout develop
git pull
git checkout feature/course-enrollment
git merge develop
```
