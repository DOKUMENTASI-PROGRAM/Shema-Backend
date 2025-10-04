# Security Best Practices

## Authentication & Authorization

### 1. Firebase Authentication

#### Firebase Configuration
**Use Firebase Admin SDK** for server-side authentication:

```typescript
// ✅ Good - Firebase Admin SDK initialization
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin
const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  })
});

export const auth = getAuth(app);
```

```typescript
// Or load from service account JSON file
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import * as serviceAccount from './config/firebase-service-account.json';

const app = initializeApp({
  credential: cert(serviceAccount as any)
});

export const auth = getAuth(app);
```

#### Firebase Token Verification (Hono Middleware)
```typescript
import { Context, Next } from 'hono';
import { auth } from '../config/firebase';
import { getUserByFirebaseUid, createUser } from '../services/userService';

export async function firebaseAuthMiddleware(c: Context, next: Next) {
  try {
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'No token provided' }
      }, 401);
    }
    
    const token = authHeader.substring(7);
    
    // Verify Firebase ID token
    const decodedToken = await auth.verifyIdToken(token);
    
    // Sync user with PostgreSQL
    let user = await getUserByFirebaseUid(decodedToken.uid);
    
    if (!user) {
      // Create user if doesn't exist
      user = await createUser({
        firebase_uid: decodedToken.uid,
        email: decodedToken.email!,
        name: decodedToken.name || decodedToken.email!,
        email_verified: decodedToken.email_verified || false
      });
    }
    
    // Set user in context
    c.set('user', user);
    c.set('firebaseUser', decodedToken);
    
    await next();
  } catch (error: any) {
    if (error.code === 'auth/id-token-expired') {
      return c.json({
        success: false,
        error: { code: 'TOKEN_EXPIRED', message: 'Token has expired' }
      }, 401);
    }
    
    return c.json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Invalid token' }
    }, 401);
  }
}
```

#### Client-Side Authentication (Firebase Client SDK)
```typescript
// Client-side: Sign in with email/password
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const auth = getAuth();
const userCredential = await signInWithEmailAndPassword(
  auth, 
  'user@example.com', 
  'password'
);

// Get Firebase ID token
const idToken = await userCredential.user.getIdToken();

// Use token in API requests
fetch('http://localhost:3001/v1/auth/verify', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${idToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ role: 'instructor' })
});
```

#### Password Requirements (Firebase)
Firebase automatically enforces password requirements:
- Minimum 6 characters (configurable in Firebase Console)
- Can enforce email verification before access
- Supports password reset via email
- Built-in rate limiting and breach detection

### 2. Firebase Token Security

#### Token Management
Firebase handles token generation and management automatically:
- **ID Tokens**: Short-lived (1 hour), used for API authentication
- **Refresh Tokens**: Long-lived, automatically refreshes ID tokens
- **Custom Claims**: Can add custom user roles/permissions

```typescript
// Set custom claims (admin/backend only)
import { auth } from '../config/firebase';

export async function setUserRole(uid: string, role: string) {
  await auth.setCustomUserClaims(uid, { role });
}

// Verify token with custom claims
export async function verifyTokenWithRole(token: string) {
  const decodedToken = await auth.verifyIdToken(token);
  
  // Check custom claims
  if (decodedToken.role !== 'instructor') {
    throw new Error('Insufficient permissions');
  }
  
  return decodedToken;
}
```

#### Token Verification Best Practices
```typescript
// ✅ Good - Comprehensive token verification
import { auth } from '../config/firebase';
import { Context, Next } from 'hono';

export async function firebaseAuthMiddleware(c: Context, next: Next) {
  try {
    const token = c.req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return c.json({ error: 'No token provided' }, 401);
    }
    
    // Verify token and check if revoked
    const decodedToken = await auth.verifyIdToken(token, true);
    
    // Check email verification if required
    if (!decodedToken.email_verified) {
      return c.json({ error: 'Email not verified' }, 403);
    }
    
    // Check if user is disabled
    const userRecord = await auth.getUser(decodedToken.uid);
    if (userRecord.disabled) {
      return c.json({ error: 'User account disabled' }, 403);
    }
    
    c.set('firebaseUser', decodedToken);
    await next();
  } catch (error: any) {
    return c.json({ error: 'Invalid token' }, 401);
  }
}
```

#### Automatic Token Refresh (Client-Side)
```typescript
// Firebase SDK automatically refreshes tokens
import { getAuth, onIdTokenChanged } from 'firebase/auth';

const auth = getAuth();

// Listen for token changes
onIdTokenChanged(auth, async (user) => {
  if (user) {
    // Get fresh token automatically
    const token = await user.getIdToken();
    localStorage.setItem('authToken', token);
  } else {
    localStorage.removeItem('authToken');
  }
});
```

### 3. Role-Based Access Control (RBAC)

#### Role Check Middleware (Hono)
```typescript
import { Context, Next } from 'hono';

export function requireRole(...allowedRoles: string[]) {
  return async (c: Context, next: Next) => {
    const user = c.get('user');
    
    if (!user) {
      return c.json({
        success: false,
        error: { 
          code: 'UNAUTHORIZED', 
          message: 'Authentication required' 
        }
      }, 401);
    }
    
    if (!allowedRoles.includes(user.role)) {
      return c.json({
        success: false,
        error: { 
          code: 'FORBIDDEN', 
          message: `Access denied. Required role: ${allowedRoles.join(' or ')}` 
        }
      }, 403);
    }
    
    await next();
  };
}

// Usage with Hono
import { Hono } from 'hono';

const app = new Hono();

app.post('/courses', 
  firebaseAuthMiddleware, 
  requireRole('instructor'), 
  createCourse
);

app.delete('/courses/:id', 
  firebaseAuthMiddleware, 
  requireRole('instructor'), 
  deleteCourse
);
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
