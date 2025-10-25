# Migration Summary: Express.js to Hono + Firebase Authentication

## Overview
This document summarizes the architectural changes from the original Express.js + JWT approach to the new Hono + Firebase Authentication stack.

**Last Updated**: October 4, 2025

---

## Technology Stack Changes

### Before (Original Design)
- **Framework**: Express.js
- **Runtime**: Node.js with npm
- **Language**: JavaScript
- **Authentication**: Custom JWT implementation with bcrypt
- **Password Storage**: PostgreSQL with password_hash
- **Token Management**: Manual JWT generation and verification

### After (New Design)
- **Framework**: Hono (Ultra-fast Edge-first web framework)
- **Runtime**: Bun 1.0+ (Fast all-in-one JavaScript runtime)
- **Language**: TypeScript
- **Authentication**: Firebase Authentication + Firebase Admin SDK
- **User Data**: PostgreSQL stores user profiles linked to Firebase UID
- **Token Management**: Firebase handles tokens automatically

---

## Key Architectural Changes

### 1. Authentication Flow

**Old Flow (Express.js + JWT)**:
```
Client → Send email/password
       → Backend validates against PostgreSQL
       → bcrypt verifies password
       → Backend generates JWT
       → Client stores JWT
       → JWT sent in subsequent requests
```

**New Flow (Hono + Firebase)**:
```
Client → Authenticate with Firebase (email/password, Google, etc.)
       → Firebase returns ID Token
       → Client sends ID Token to backend
       → Backend verifies token with Firebase Admin SDK
       → Backend syncs user data to PostgreSQL
       → Firebase automatically refreshes tokens
```

### 2. Database Schema Changes

**Old `users` Table**:
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,  -- Stored passwords
    role VARCHAR(20),
    ...
);
```

**New `users` Table**:
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    firebase_uid VARCHAR(128) UNIQUE NOT NULL,  -- Links to Firebase
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(20),
    -- No password_hash - Firebase handles auth
    ...
);
```

### 3. Middleware Changes

**Old Middleware (Express.js)**:
```javascript
async function authMiddleware(req, res, next) {
    const token = req.headers.authorization;
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
}
```

**New Middleware (Hono)**:
```typescript
import { Context, Next } from 'hono';
import { auth } from '../config/firebase';

export async function firebaseAuthMiddleware(c: Context, next: Next) {
    const token = c.req.header('Authorization')?.replace('Bearer ', '');
    const decodedToken = await auth.verifyIdToken(token!);
    
    // Sync with PostgreSQL
    const user = await getUserByFirebaseUid(decodedToken.uid);
    c.set('user', user);
    
    await next();
}
```

### 4. Controller Changes

**Old Controller (Express.js)**:
```javascript
async function createCourse(req, res) {
    const course = await courseService.create(req.body);
    res.status(201).json({ success: true, data: course });
}
```

**New Controller (Hono)**:
```typescript
import { Context } from 'hono';

export async function createCourse(c: Context) {
    const courseData = await c.req.json();
    const course = await courseService.create(courseData);
    return c.json({ success: true, data: course }, 201);
}
```

---

## Benefits of New Architecture

### 1. Security Improvements
- ✅ **No password storage**: Firebase handles all password management
- ✅ **Built-in security**: Firebase includes rate limiting, breach detection
- ✅ **Email verification**: Built-in email verification flow
- ✅ **Password reset**: Automatic password reset emails
- ✅ **Multi-factor auth**: Easy to add 2FA later
- ✅ **OAuth integration**: Google, Facebook, GitHub login ready

### 2. Development Speed
- ✅ **Less code**: No bcrypt, JWT, token refresh logic
- ✅ **Firebase Admin SDK**: Handles complex auth scenarios
- ✅ **Auto token refresh**: Client SDK refreshes tokens automatically
- ✅ **Type safety**: Full TypeScript support with Hono
- ✅ **Bun speed**: 4x faster package installation than npm
- ✅ **Built-in tools**: Bun includes bundler, test runner, package manager

### 3. Performance
- ✅ **Hono is faster**: Ultra-fast routing and middleware
- ✅ **Bun runtime**: 3x faster than Node.js, uses JavaScriptCore
- ✅ **Fast startup**: Bun starts 4x faster than Node.js
- ✅ **Edge-ready**: Can deploy to Cloudflare Workers, Deno Deploy
- ✅ **Small bundle**: Hono is extremely lightweight
- ✅ **Firebase CDN**: Global token verification

### 4. Scalability
- ✅ **Firebase scales**: Handles millions of users automatically
- ✅ **No token storage**: No need for token blacklist/whitelist
- ✅ **Distributed**: Firebase works across regions
- ✅ **PostgreSQL focused**: Only stores business data

---

## Migration Checklist

### Environment Setup
- [x] Create Firebase project
- [x] Download Firebase Admin SDK service account key
- [x] Configure environment variables with Firebase credentials
- [x] Remove JWT_SECRET from environment (no longer needed)

### Database Migration
- [x] Add `firebase_uid` column to users table
- [x] Remove `password_hash` column
- [x] Remove `refresh_tokens` table (no longer needed)
- [x] Add index on `firebase_uid`

### Code Changes
- [x] Replace Express.js with Hono
- [x] Replace JWT middleware with Firebase token verification
- [x] Update controllers to use Hono Context instead of Express req/res
- [x] Remove bcrypt password hashing logic
- [x] Remove JWT generation logic
- [x] Add Firebase Admin SDK initialization

### Client-Side Changes
- [ ] Integrate Firebase Client SDK
- [ ] Replace login API calls with Firebase authentication
- [ ] Store and use Firebase ID tokens instead of custom JWT
- [ ] Implement automatic token refresh

### Testing
- [ ] Update tests to mock Firebase Admin SDK
- [ ] Test Firebase token verification
- [ ] Test user sync between Firebase and PostgreSQL
- [ ] Integration tests with Firebase Local Emulator

---

## API Endpoint Changes

### Old Endpoints
```
POST /v1/auth/instructor/login
POST /v1/auth/student/login
GET  /v1/me
```

### New Endpoints
```
POST /v1/auth/verify          # Verify Firebase token & sync user
PATCH /v1/auth/profile        # Update user profile
GET  /v1/me                   # Get current user (unchanged)
```

**Note**: Login now happens on client-side with Firebase SDK, not via backend API.

---

## Example: Complete Authentication Flow

### 1. Client Registration (Firebase)
```typescript
// Client-side
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';

const auth = getAuth();
const userCredential = await createUserWithEmailAndPassword(
    auth, 
    'user@example.com', 
    'password123'
);

const idToken = await userCredential.user.getIdToken();
```

### 2. Sync User with Backend
```typescript
// Client sends token to backend
const response = await fetch('http://localhost:3001/v1/auth/verify', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({ role: 'instructor' })
});

const { user } = await response.json();
```

### 3. Backend Verification and Sync
```typescript
// Backend: Verify token and create/update user in PostgreSQL
app.post('/v1/auth/verify', firebaseAuthMiddleware, async (c) => {
    const firebaseUser = c.get('firebaseUser');
    const { role } = await c.req.json();
    
    let user = await getUserByFirebaseUid(firebaseUser.uid);
    
    if (!user) {
        user = await createUser({
            firebase_uid: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.name || firebaseUser.email,
            role: role,
            email_verified: firebaseUser.email_verified
        });
    }
    
    return c.json({ success: true, data: { user } });
});
```

### 4. Subsequent API Requests
```typescript
// All subsequent requests include Firebase ID token
const courses = await fetch('http://localhost:3002/v1/courses', {
    headers: {
        'Authorization': `Bearer ${idToken}`
    }
});
```

---

## Configuration Files

### package.json (Bun Dependencies)
```json
{
    "dependencies": {
        "hono": "^4.0.0",
        "firebase-admin": "^12.0.0",
        "pg": "^8.11.0"
    },
    "devDependencies": {
        "typescript": "^5.3.0",
        "@types/node": "^20.0.0",
        "bun-types": "^1.0.0"
    },
    "scripts": {
        "dev": "bun --watch src/index.ts",
        "build": "bun build src/index.ts --outdir dist --target bun",
        "start": "bun run src/index.ts",
        "test": "bun test",
        "test:watch": "bun test --watch"
    }
}
```

**Note**: 
- No need for `tsx`, `nodemon`, or `ts-node` - Bun runs TypeScript natively
- No need for `jest` or `vitest` - Bun has built-in test runner
- Bun's `--watch` flag provides hot reload

### .env (Firebase Configuration)
```env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/identity_db

# Firebase Configuration
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Or use service account file
FIREBASE_SERVICE_ACCOUNT_PATH=./config/firebase-service-account.json
```

---

## Documentation Updated

The following documentation files have been updated:

1. ✅ **01-project-overview.md** - Updated technology stack
2. ✅ **02-architecture.md** - Updated service structures and flow diagrams
3. ✅ **03-api-endpoints.md** - Updated authentication endpoints
4. ✅ **04-development-workflow.md** - Updated setup instructions
5. ✅ **05-database.md** - Updated schema with firebase_uid
6. ✅ **06-security.md** - Firebase security practices
7. ✅ **07-docker.md** - Hono Dockerfile with TypeScript
8. ⏳ **08-testing.md** - Firebase testing strategies (in progress)

---

## Troubleshooting

### Common Issues

**Issue**: Firebase token verification fails
```
Solution: Ensure Firebase service account credentials are correct and properly formatted. 
Check that FIREBASE_PRIVATE_KEY newlines are correctly escaped.
```

**Issue**: User not found after Firebase authentication
```
Solution: Ensure /v1/auth/verify endpoint is called after Firebase login to sync user to PostgreSQL.
```

**Issue**: CORS errors with Firebase
```
Solution: Configure CORS in Hono to allow Firebase Auth requests:
app.use('*', cors({ origin: ['http://localhost:3000'], credentials: true }))
```

**Issue**: Token expired errors
```
Solution: Firebase tokens expire after 1 hour. Use Firebase Client SDK's automatic token 
refresh or manually refresh using user.getIdToken(true).
```

---

## Next Steps

1. Implement Identity Service with Hono + Firebase
2. Implement Course Service with Firebase auth middleware
3. Implement Chat Service with Firebase auth middleware
4. Set up Firebase Local Emulator for testing
5. Update client application to use Firebase Client SDK
6. Deploy Firebase security rules
7. Set up Firebase monitoring and logging

---

## References

- [Hono Documentation](https://hono.dev/)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [Firebase Client SDK](https://firebase.google.com/docs/web/setup)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
