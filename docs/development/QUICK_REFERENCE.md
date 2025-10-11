# 🎵 Shema Music Backend - Quick Reference

> **One-page cheat sheet** untuk authentication & architecture

---

## 🔐 Authentication Model (THE MOST IMPORTANT THING!)

```
┌─────────────────────────────────────────────────────┐
│                                                       │
│  🔑 ADMIN          →  Firebase Auth  ✅              │
│     (Dashboard)        - Email/Password              │
│                        - Forgot password built-in    │
│                        - 1-5 accounts                │
│                                                       │
│  👤 STUDENTS       →  NO Auth  ❌                    │
│     (Public)           - Public form only            │
│                        - No login/password           │
│                        - Auto-create user record     │
│                                                       │
│  🎓 INSTRUCTORS    →  NO Auth  ❌                    │
│     (Passive)          - Managed by admin            │
│                        - No self-service portal      │
│                                                       │
└─────────────────────────────────────────────────────┘
```

---

## 📊 Tech Stack

| Component | Technology | Port |
|-----------|-----------|------|
| **Framework** | Hono.js | - |
| **Database** | Supabase (PostgreSQL) | - |
| **Cache/PubSub** | Redis | 6379 |
| **Admin Auth** | Firebase Authentication | - |
| **API Gateway** | Hono.js | 3000 |
| **Auth Service** | Hono.js | 3001 |
| **User Service** | Hono.js | 3002 |
| **Course Service** | Hono.js | 3003 |
| **Enrollment Service** | Hono.js | 3004 |
| **Schedule Service** | Hono.js | 3005 |
| **Chat Service** | Hono.js | 3006 |
| **Room Service** | Hono.js | 3007 |
| **Attendance Service** | Hono.js | 3008 |
| **Analytics Service** | Hono.js | 3009 |

---

## 🗂️ Database Schema (Supabase)

### Core Tables
```sql
users                  -- Admin, students, instructors (firebase_uid for admin only)
├── student_profiles   -- Student-specific data (guardian, school, etc)
└── instructor_profiles -- Instructor bio & specialization

courses                -- Course catalog (piano, guitar, etc)
├── enrollments        -- Student enrollments with preferences
├── class_schedules    -- Scheduled classes (instructor + room + time)
└── schedule_attendees -- Attendance records

rooms                  -- Practice/class rooms
chat_sessions          -- Live chat sessions
chat_messages          -- Chat messages (user/assistant/system)
```

### Key Fields
- `users.firebase_uid` → NULL for students/instructors, has value for admin
- `users.role` → 'student' | 'instructor' | 'admin'
- `enrollments.status` → 'pending' | 'approved' | 'rejected' | 'cancelled'
- `courses.level` → 'beginner' | 'intermediate' | 'advanced'

---

## 🌐 API Endpoint Categories

### 🔓 Public Endpoints (No Auth)
```
GET  /api/courses                    - Browse courses
GET  /api/courses/:id                - Course detail
POST /api/enrollments                - Submit enrollment form ⭐
GET  /api/users/check                - Check enrollment status
GET  /api/schedules                  - View available schedules
GET  /api/rooms                      - View available rooms
WS   /api/chat/connect               - Live chat (guest)
```

### 🔐 Admin Endpoints (Firebase Auth Required)
```
POST /api/auth/admin/login           - Admin login (Firebase token)
GET  /api/auth/admin/me              - Get admin info
POST /api/auth/admin/logout          - Admin logout

GET  /api/users/students             - List students
GET  /api/users/instructors          - List instructors
POST /api/users/instructors          - Create instructor

GET  /api/enrollments                - List all enrollments
PATCH /api/enrollments/:id/approve   - Approve enrollment ⭐
PATCH /api/enrollments/:id/reject    - Reject enrollment

POST /api/courses                    - Create course
PUT  /api/courses/:id                - Update course
DELETE /api/courses/:id              - Delete course

POST /api/schedules                  - Create schedule
PUT  /api/schedules/:id              - Update schedule
DELETE /api/schedules/:id            - Delete schedule

POST /api/attendance                 - Mark attendance
GET  /api/analytics/*                - Dashboard analytics
```

---

## 🚀 Quick Start Commands

### Setup Firebase
```bash
# 1. Create Firebase project at https://console.firebase.google.com
# 2. Enable Email/Password authentication
# 3. Download service account JSON
# 4. Add to backend .env:

FIREBASE_PROJECT_ID=shema-music
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@shema-music.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### Install Dependencies
```bash
# Backend
npm install firebase-admin

# Frontend (Admin Dashboard)
npm install firebase

# Frontend (Public Website)
# No Firebase needed!
```

### Run Services
```bash
# With Docker Compose
docker-compose up -d

# Manual (for development)
cd services/auth && npm run dev      # Port 3001
cd services/user && npm run dev      # Port 3002
cd services/course && npm run dev    # Port 3003
# ... etc
```

### Create Admin Account
```bash
# Run script
tsx scripts/create-admin.ts

# Or manually in Firebase Console → Authentication → Add User
# Then add to Supabase users table with role='admin'
```

---

## 📝 Student Enrollment Flow

```
1. Student browses courses
   ↓
2. Click "Daftar" on course detail
   ↓
3. Fill public form:
   - full_name
   - wa_number (WhatsApp)
   - email
   - course_id
   - experience_level
   - time_preferences
   - preferred_days
   - preferred_time_range
   - start_date_target
   - guardian info (if under 18)
   - instrument_owned
   - notes
   - referral_source
   - consent ✅
   - captcha_token ✅
   - idempotency_key (prevent duplicate)
   ↓
4. POST /api/enrollments (PUBLIC)
   ↓
5. Backend:
   - Validate captcha
   - Check idempotency_key
   - Create/update user (firebase_uid=NULL)
   - Create enrollment record (status='pending')
   - Send confirmation email
   ↓
6. Response:
   - enrollment_id
   - registration_number (e.g., REG-2025-10-001)
   - next_steps
   ↓
7. Admin reviews in dashboard (Firebase auth)
   ↓
8. Admin approves enrollment
   ↓
9. Admin contacts student via WhatsApp
   ↓
10. Student enrolled! 🎉
```

---

## 🔒 Security Checklist

### Public Endpoints
- [x] Captcha validation (Turnstile/reCAPTCHA)
- [x] Idempotency keys (prevent duplicate submissions)
- [x] Rate limiting (per IP)
- [x] Input validation (Zod/Joi)
- [x] CORS configuration
- [x] Content-Type validation

### Admin Endpoints
- [x] Firebase ID token verification
- [x] Role check (must be 'admin')
- [x] Token expiration check (1 hour)
- [x] HTTPS only (production)
- [x] Audit logging
- [x] CORS restricted to admin domain

---

## 💡 Common Tasks

### Add New Admin
```typescript
// Script: scripts/create-admin.ts
const firebaseUser = await admin.auth().createUser({
  email: 'newadmin@shemamusic.com',
  password: 'SecurePassword123!',
  emailVerified: true
})

await supabase.from('users').insert({
  firebase_uid: firebaseUser.uid,
  full_name: 'New Admin',
  email: 'newadmin@shemamusic.com',
  role: 'admin',
  email_verified: true
})
```

### Reset Admin Password
```typescript
// Frontend: Just call Firebase SDK
await sendPasswordResetEmail(auth, 'admin@shemamusic.com')
// Admin receives email with reset link automatically
```

### Check Enrollment Status (Public)
```bash
# By email
GET /api/users/check?email=student@example.com

# By registration number
GET /api/users/check?registration_number=REG-2025-10-001
```

### Approve Enrollment (Admin)
```bash
PATCH /api/enrollments/:id/approve
Authorization: Bearer {firebase_id_token}
```

---

## 🐛 Troubleshooting

### Firebase Token Invalid
```typescript
// Frontend: Force token refresh
const token = await auth.currentUser?.getIdToken(true)
```

### CORS Error
```typescript
// Backend: Add CORS middleware
import { cors } from 'hono/cors'

app.use('/api/*', cors({
  origin: ['http://localhost:5173', 'https://shemamusic.com'],
  credentials: true
}))
```

### Student Can't Submit Form
```
1. Check captcha is valid
2. Check idempotency_key is unique
3. Check email format
4. Check consent is true
5. Check rate limit not exceeded
```

### Admin Can't Login
```
1. Check Firebase credentials in .env
2. Verify user exists in Firebase Console
3. Verify user has role='admin' in Supabase
4. Check firebase_uid matches
5. Try password reset
```

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `AUTH_MODEL_CLARIFICATION.md` | ⚠️ **Read first!** Authentication model explained |
| `AUTH_OPTIONS_COMPARISON.md` | Why Firebase Auth vs alternatives |
| `FIREBASE_AUTH_SETUP.md` | Step-by-step Firebase setup guide |
| `api-endpoints.md` | Complete API documentation (200+ endpoints) |
| `SCHEMA_ALIGNMENT_SUMMARY.md` | Database schema alignment changes |

---

## 🎯 Key Principles

1. **Admin-only authentication** → Firebase Auth for forgot password
2. **Students = passive users** → No login, better UX
3. **Public form registration** → Low friction enrollment
4. **WhatsApp primary communication** → Admin contacts students
5. **Microservices architecture** → Independent, scalable services
6. **Supabase for data** → PostgreSQL with nice UI
7. **Redis for events** → Real-time communication & caching
8. **Docker for deployment** → Easy orchestration

---

## ❓ FAQ

**Q: Why Firebase Auth only for admin?**  
A: Admin needs forgot password feature. Firebase provides this free.

**Q: Why don't students need accounts?**  
A: Better UX! No password to remember, faster registration.

**Q: How much does Firebase cost?**  
A: $0/month for our use case (only ~5 admin accounts, free tier is 50k MAU).

**Q: Can students check their enrollment status?**  
A: Yes! Public endpoint: `/api/users/check?email=...` or by registration number.

**Q: How does admin contact students?**  
A: Via WhatsApp (stored in enrollment form as `wa_number`).

**Q: What if admin forgets password?**  
A: Click "Forgot Password" → Firebase sends email → Click link → Set new password. Done!

---

**Last Updated**: October 9, 2025  
**Version**: 1.0  
**Status**: ✅ Production Ready  
**For Questions**: See `AUTH_MODEL_CLARIFICATION.md`
