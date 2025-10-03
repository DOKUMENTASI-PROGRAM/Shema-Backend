# Security Best Practices

## Authentication & Authorization

### 1. Password Security

#### Password Hashing
**Always use bcrypt** with minimum 12 rounds for password hashing:

```javascript
// ✅ Good - Using bcrypt with proper rounds
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 12;

async function hashPassword(password) {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

// Usage in registration
const passwordHash = await hashPassword(req.body.password);
await User.create({ email, password_hash: passwordHash });

// Usage in login
const user = await User.findByEmail(email);
const isValid = await verifyPassword(password, user.password_hash);
```

```python
# Python with bcrypt
import bcrypt

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(password: str, hash: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hash.encode('utf-8'))
```

#### Password Requirements
```javascript
function validatePassword(password) {
  const errors = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return errors;
}
```

### 2. JWT Security

#### Token Generation
```javascript
const jwt = require('jsonwebtoken');

function generateToken(user) {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role
    // ❌ Don't include sensitive data: password, ssn, etc.
  };
  
  const options = {
    expiresIn: '24h',  // Token expires in 24 hours
    issuer: 'music-lesson-api',
    audience: 'music-lesson-client'
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET, options);
}
```

#### JWT Secret Management
```env
# .env file
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long-change-in-production

# Generate strong secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

#### Token Verification Middleware
```javascript
async function authMiddleware(req, res, next) {
  try {
    // Extract token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: { 
          code: 'UNAUTHORIZED', 
          message: 'No token provided' 
        }
      });
    }
    
    const token = authHeader.substring(7);  // Remove 'Bearer ' prefix
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'music-lesson-api',
      audience: 'music-lesson-client'
    });
    
    // Attach user info to request
    req.user = decoded;
    next();
    
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: { 
          code: 'TOKEN_EXPIRED', 
          message: 'Token has expired' 
        }
      });
    }
    
    return res.status(401).json({
      success: false,
      error: { 
        code: 'INVALID_TOKEN', 
        message: 'Invalid token' 
      }
    });
  }
}
```

#### Refresh Token Pattern (Optional)
```javascript
// Generate both access and refresh tokens
function generateTokens(user) {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }  // Short-lived
  );
  
  const refreshToken = jwt.sign(
    { id: user.id, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }  // Long-lived
  );
  
  // Store refresh token in database
  await RefreshToken.create({
    user_id: user.id,
    token: refreshToken,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  });
  
  return { accessToken, refreshToken };
}
```

### 3. Role-Based Access Control (RBAC)

#### Role Check Middleware
```javascript
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { 
          code: 'UNAUTHORIZED', 
          message: 'Authentication required' 
        }
      });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: { 
          code: 'FORBIDDEN', 
          message: `Access denied. Required role: ${allowedRoles.join(' or ')}` 
        }
      });
    }
    
    next();
  };
}

// Usage
router.post('/courses', authMiddleware, requireRole('instructor'), createCourse);
router.delete('/courses/:id', authMiddleware, requireRole('instructor'), deleteCourse);
```

#### Resource Ownership Check
```javascript
async function requireOwnership(req, res, next) {
  try {
    const courseId = req.params.id;
    const course = await Course.findById(courseId);
    
    if (!course) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Course not found' }
      });
    }
    
    // Check if user owns this resource
    if (course.instructor_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: { 
          code: 'FORBIDDEN', 
          message: 'You can only modify your own courses' 
        }
      });
    }
    
    req.course = course;  // Attach to request for use in controller
    next();
  } catch (error) {
    next(error);
  }
}

// Usage
router.put('/courses/:id', authMiddleware, requireRole('instructor'), requireOwnership, updateCourse);
```

---

## Input Validation & Sanitization

### 1. Request Validation

#### Using Joi (Node.js)
```javascript
const Joi = require('joi');

const createCourseSchema = Joi.object({
  name: Joi.string().min(3).max(200).required(),
  description: Joi.string().max(2000).optional(),
  price: Joi.number().integer().min(0).required(),
  duration_minutes: Joi.number().integer().min(30).max(300).required(),
  max_students: Joi.number().integer().min(1).max(50).optional(),
  category: Joi.string().valid('guitar', 'piano', 'vocal', 'drums', 'other').required(),
  level: Joi.string().valid('beginner', 'intermediate', 'advanced').required(),
  schedule: Joi.array().items(Joi.string()).min(1).required()
});

function validateRequest(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
          }))
        }
      });
    }
    
    req.validatedBody = value;  // Use validated data
    next();
  };
}

// Usage
router.post('/courses', authMiddleware, validateRequest(createCourseSchema), createCourse);
```

### 2. SQL Injection Prevention

#### Always Use Parameterized Queries
```javascript
// ✅ Good - Parameterized query
async function findUserByEmail(email) {
  const result = await pool.query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
  return result.rows[0];
}

// ❌ Bad - String concatenation (VULNERABLE!)
async function findUserByEmail(email) {
  const result = await pool.query(
    `SELECT * FROM users WHERE email = '${email}'`  // DON'T DO THIS!
  );
  return result.rows[0];
}
```

### 3. XSS Prevention

#### Sanitize User Input
```javascript
const validator = require('validator');

function sanitizeInput(input) {
  if (typeof input === 'string') {
    // Escape HTML entities
    return validator.escape(input);
  }
  return input;
}

// Sanitize all string fields in object
function sanitizeObject(obj) {
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = validator.escape(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}
```

#### Content Security Policy (CSP) Headers
```javascript
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;"
  );
  next();
});
```

---

## API Security

### 1. Rate Limiting

#### Rate Limiter Middleware
```javascript
const rateLimit = require('express-rate-limit');

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,  // 1 minute
  max: 100,  // 100 requests per minute
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Strict rate limiter for chat endpoints
const chatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,  // 1 minute
  max: 20,  // 20 messages per minute
  message: {
    success: false,
    error: {
      code: 'CHAT_RATE_LIMIT_EXCEEDED',
      message: 'Too many chat messages. Please wait before sending another message.',
      retry_after: 60
    }
  },
  keyGenerator: (req) => req.user.id,  // Per-user limit
  skip: (req) => !req.user  // Skip if not authenticated
});

// Usage
app.use('/v1/', apiLimiter);
app.use('/v1/chat/', chatLimiter);
```

#### Custom Rate Limiter with Redis
```javascript
const redis = require('redis');
const client = redis.createClient();

async function rateLimiter(req, res, next) {
  const key = `ratelimit:${req.user.id}:${Date.now() / 60000 | 0}`;
  
  try {
    const current = await client.incr(key);
    
    if (current === 1) {
      await client.expire(key, 60);  // Expire after 1 minute
    }
    
    if (current > 20) {
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests',
          retry_after: 60
        }
      });
    }
    
    res.setHeader('X-RateLimit-Limit', 20);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, 20 - current));
    
    next();
  } catch (error) {
    // If Redis fails, allow request but log error
    console.error('Rate limiter error:', error);
    next();
  }
}
```

### 2. CORS Configuration

#### Secure CORS Setup
```javascript
const cors = require('cors');

const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:5173'
    ];
    
    // Allow requests with no origin (mobile apps, Postman)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,  // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400  // Cache preflight for 24 hours
};

app.use(cors(corsOptions));
```

### 3. Security Headers

#### Using Helmet
```javascript
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  },
  hsts: {
    maxAge: 31536000,  // 1 year
    includeSubDomains: true,
    preload: true
  }
}));

// Additional security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});
```

---

## Environment & Configuration Security

### 1. Environment Variables

#### Never Commit Secrets
```gitignore
# .gitignore
.env
.env.local
.env.production
*.pem
*.key
secrets/
```

#### Environment Variable Management
```javascript
// config/index.js
require('dotenv').config();

const requiredEnvVars = [
  'JWT_SECRET',
  'DATABASE_URL',
  'OPENAI_API_KEY'
];

// Validate required environment variables
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

module.exports = {
  jwtSecret: process.env.JWT_SECRET,
  databaseUrl: process.env.DATABASE_URL,
  openaiApiKey: process.env.OPENAI_API_KEY,
  nodeEnv: process.env.NODE_ENV || 'development'
};
```

### 2. API Key Security

#### Rotate API Keys Regularly
```javascript
// Store API keys with creation date
const apiKeys = {
  openai: {
    key: process.env.OPENAI_API_KEY,
    created_at: '2025-01-01',
    rotate_after_days: 90
  }
};

// Check if key needs rotation
function checkKeyRotation() {
  const daysSinceCreation = (Date.now() - new Date(apiKeys.openai.created_at)) / (1000 * 60 * 60 * 24);
  if (daysSinceCreation > apiKeys.openai.rotate_after_days) {
    console.warn('WARNING: OpenAI API key needs rotation!');
  }
}
```

#### Never Log Sensitive Data
```javascript
// ✅ Good - Redact sensitive data
function logRequest(req) {
  logger.info({
    method: req.method,
    path: req.path,
    userId: req.user?.id,
    // Don't log: password, token, apiKey, etc.
  });
}

// ❌ Bad - Logging sensitive data
function logRequest(req) {
  logger.info(req.body);  // May contain passwords!
}
```

---

## HTTPS & TLS

### 1. Enforce HTTPS in Production

```javascript
// Redirect HTTP to HTTPS
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && !req.secure) {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
});

// Strict Transport Security
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});
```

### 2. TLS Configuration (Nginx/Reverse Proxy)

```nginx
server {
    listen 443 ssl http2;
    server_name api.musiclesson.com;
    
    ssl_certificate /etc/ssl/certs/cert.pem;
    ssl_certificate_key /etc/ssl/private/key.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## ChatGPT API Security

### 1. Context Limitation

```javascript
const MAX_CONTEXT_MESSAGES = 10;
const MAX_MESSAGE_LENGTH = 1000;

async function prepareContext(sessionId) {
  // Retrieve recent messages from database
  const messages = await ChatMessage.find({
    session_id: sessionId
  })
  .orderBy('created_at', 'desc')
  .limit(MAX_CONTEXT_MESSAGES);
  
  // Limit message length
  return messages.reverse().map(msg => ({
    role: msg.role,
    content: msg.content.substring(0, MAX_MESSAGE_LENGTH)
  }));
}
```

### 2. Cost Management

```javascript
// Track token usage
async function sendChatMessage(sessionId, userMessage) {
  const context = await prepareContext(sessionId);
  
  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [...context, { role: 'user', content: userMessage }],
    max_tokens: 500,  // Limit response length
    temperature: 0.7
  });
  
  // Log token usage for monitoring
  await logTokenUsage({
    session_id: sessionId,
    tokens_used: response.usage.total_tokens,
    cost: calculateCost(response.usage.total_tokens)
  });
  
  return response.choices[0].message.content;
}
```

---

## Security Checklist

### Pre-Deployment Checklist
- [ ] All passwords hashed with bcrypt (min 12 rounds)
- [ ] JWT secrets are strong and stored securely
- [ ] Environment variables configured (no hardcoded secrets)
- [ ] HTTPS enforced in production
- [ ] Rate limiting enabled on all endpoints
- [ ] CORS configured for production domains only
- [ ] Security headers configured (helmet)
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (input sanitization)
- [ ] Authentication required on protected routes
- [ ] Role-based access control implemented
- [ ] Error messages don't leak sensitive information
- [ ] Logging configured (no sensitive data logged)
- [ ] Database connection pooling configured
- [ ] API keys rotated and monitored

### Regular Security Tasks
- [ ] Review and rotate API keys quarterly
- [ ] Update dependencies monthly (check for vulnerabilities)
- [ ] Review access logs for suspicious activity
- [ ] Monitor rate limiting effectiveness
- [ ] Review and update CORS allowed origins
- [ ] Audit user permissions and roles
- [ ] Test authentication and authorization flows
- [ ] Backup databases regularly
