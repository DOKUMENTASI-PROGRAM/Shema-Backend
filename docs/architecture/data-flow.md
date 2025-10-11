# Data Flow Documentation

Dokumen ini menjelaskan alur data lengkap untuk semua fitur utama dalam sistem Shema Music backend.

**⚠️ IMPORTANT**: Sistem menggunakan **hybrid authentication**:
- **Admin**: Firebase Authentication
- **Students & Instructors**: NO authentication (pasif)

## Table of Contents
1. [Admin Login Flow (Firebase)](#1-admin-login-flow-firebase)
2. [Student Enrollment Flow (Public)](#2-student-enrollment-flow-public)
3. [Admin Approve Enrollment Flow](#3-admin-approve-enrollment-flow)
4. [Live Chat Flow (Public)](#4-live-chat-flow-public)
5. [Class Schedule & Attendance Flow](#5-class-schedule--attendance-flow)
6. [Admin Dashboard Data Flow](#6-admin-dashboard-data-flow)

---

## 1. Admin Login Flow (Firebase)

### Architecture Diagram
```
Admin Browser (Firebase SDK) → API Gateway → Auth Service (Firebase Admin SDK) → 
User Service → Supabase → Response
```

### Step-by-Step Process

#### Step 1-3: Firebase Login
1. Admin buka login page di admin dashboard
2. Admin input email & password
3. Frontend call Firebase SDK:
   ```typescript
   import { signInWithEmailAndPassword } from 'firebase/auth'
   
   const userCredential = await signInWithEmailAndPassword(
     auth,
     'admin@shemamusic.com',
     'SecurePassword123!'
   )
   ```

#### Step 4-5: Get Firebase ID Token
4. Firebase returns authenticated user
5. Frontend get ID token:
   ```typescript
   const idToken = await userCredential.user.getIdToken()
   // Token valid selama 1 jam
   ```

#### Step 6-8: Backend Verification
6. Frontend POST ke **API Gateway** `/api/auth/admin/login`:
   ```typescript
   fetch('/api/auth/admin/login', {
     method: 'POST',
     headers: {
       'Authorization': `Bearer ${idToken}`,
       'Content-Type': 'application/json'
     }
   })
   ```

7. **API Gateway** route ke **Auth Service** `http://auth-service:3001/admin/login`

8. **Auth Service** verify Firebase ID token:
   ```typescript
   import admin from 'firebase-admin'
   
   const decodedToken = await admin.auth().verifyIdToken(idToken)
   // decodedToken contains: { uid, email, email_verified, ... }
   ```

#### Step 9-11: Get Admin Profile
9. **Auth Service** call **User Service** `GET /api/users/by-firebase-uid?uid={decodedToken.uid}`

10. **User Service** query Supabase:
    ```typescript
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('firebase_uid', decodedToken.uid)
      .eq('role', 'admin')
      .single()
    
    if (!user) throw new Error('ADMIN_NOT_FOUND')
    ```

11. **Auth Service** update last_login_at:
    ```typescript
    await supabase
      .from('users')
      .update({ last_login_at: new Date() })
      .eq('id', user.id)
    ```

#### Step 12: Return Response
12. **Auth Service** return admin data via API Gateway → Client:
    ```json
    {
      "success": true,
      "data": {
        "user_id": "uuid",
        "firebase_uid": "firebase_uid_string",
        "full_name": "Admin Shema Music",
        "email": "admin@shemamusic.com",
        "role": "admin"
      }
    }
    ```

### Forgot Password Flow (Firebase Automatic)
```
Admin clicks "Forgot Password" → Frontend calls:
  await sendPasswordResetEmail(auth, 'admin@shemamusic.com')
  
→ Firebase sends email automatically (no backend involved)
→ Admin clicks link in email
→ Firebase hosted reset page
→ Admin enters new password
→ Done!
```

### Token Refresh (Firebase Automatic)
Firebase SDK automatically refreshes tokens sebelum expired (1 jam):
```typescript
// Frontend: Force refresh if needed
const freshToken = await auth.currentUser?.getIdToken(true)
```

---

## 2. Student Enrollment Flow (Public)

### Architecture Diagram
```
Guest Browser → API Gateway → Enrollment Service → User Service → 
Course Service → Supabase → Email Notification → Admin Review
```

### Step-by-Step Process

#### Step 1-2: Browse Courses (Public)
1. Calon siswa browse courses (no auth required):
   ```
   GET /api/courses (PUBLIC endpoint)
   ```

2. Calon siswa view course detail:
   ```
   GET /api/courses/:id (PUBLIC endpoint)
   ```

#### Step 3-4: Fill Enrollment Form
3. Calon siswa klik "Daftar" dan isi form lengkap
4. Frontend POST ke **API Gateway** `/api/enrollments` (PUBLIC):
   ```json
   {
     "full_name": "Budi Santoso",
     "wa_number": "+6281234567890",
     "email": "budi@example.com",
     "course_id": "6f7a9c8e-2f3a-4a77-9b0a-2f0e8b8c1234",
     "experience_level": "beginner",
     "time_preferences": "Weekend pagi, Sabtu 09:00-11:00",
     "preferred_days": ["saturday", "sunday"],
     "preferred_time_range": {
       "start": "09:00",
       "end": "11:00"
     },
     "start_date_target": "2025-10-20",
     "guardian": {
       "name": "Ibu Rina",
       "wa_number": "+628111111111"
     },
     "instrument_owned": true,
     "notes": "Kalau bisa jangan bentrok pramuka.",
     "referral_source": "instagram",
     "consent": true,
     "captcha_token": "turnstile-or-recaptcha-token",
     "idempotency_key": "2cfae3c1-1f77-4a83-b0d7-efc1b3d5a0c8"
   }
   ```

#### Step 5-8: Validation
5. **API Gateway** route ke **Enrollment Service** `http://enrollment-service:3004/api/enrollments`

6. **Enrollment Service** validate:
   - ✅ Captcha token valid (call Turnstile/reCAPTCHA API)
   - ✅ Idempotency key tidak duplicate (check Redis)
   - ✅ Email format valid
   - ✅ Consent = true
   - ✅ Required fields ada semua

7. **Enrollment Service** check idempotency di Redis:
   ```typescript
   const exists = await redis.get(`idempotency:${idempotency_key}`)
   if (exists) {
     return { success: false, error: 'DUPLICATE_SUBMISSION' }
   }
   
   // Mark as used (TTL 24 jam)
   await redis.setex(`idempotency:${idempotency_key}`, 86400, 'used')
   ```

8. **Enrollment Service** validate captcha:
   ```typescript
   const captchaResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       secret: TURNSTILE_SECRET_KEY,
       response: captcha_token
     })
   })
   
   const result = await captchaResponse.json()
   if (!result.success) {
     throw new Error('INVALID_CAPTCHA')
   }
   ```

#### Step 9-10: Create/Update User
9. **Enrollment Service** call **User Service** `POST /api/users/find-or-create`:
   ```typescript
   const userResponse = await fetch(`${USER_SERVICE_URL}/api/users/find-or-create`, {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       email,
       full_name,
       wa_number,
       phone_number: wa_number,
       role: 'student'
     })
   })
   ```

10. **User Service** check existing user atau create new:
    ```typescript
    // Check existing
    let { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single()
    
    if (!user) {
      // Create new student user (firebase_uid = NULL)
      const { data: newUser } = await supabase
        .from('users')
        .insert({
          email,
          full_name,
          wa_number,
          phone_number: wa_number,
          role: 'student',
          firebase_uid: null, // Students tidak punya Firebase account
          email_verified: false,
          created_at: new Date()
        })
        .select()
        .single()
      
      user = newUser
    }
    ```

#### Step 11-12: Validate Course & Create Enrollment
11. **Enrollment Service** validate course exists (call Course Service)

12. **Enrollment Service** insert enrollment ke Supabase:
    ```typescript
    const { data: enrollment } = await supabase
      .from('enrollments')
      .insert({
        student_id: user.id,
        course_id,
        registration_date: new Date(),
        status: 'pending',
        experience_level,
        time_preferences,
        preferred_days,
        preferred_time_range,
        start_date_target,
        guardian_name: guardian?.name,
        guardian_wa_number: guardian?.wa_number,
        instrument_owned,
        notes,
        referral_source,
        idempotency_key,
        registration_number: generateRegistrationNumber() // REG-2025-10-001
      })
      .select()
      .single()
    ```

#### Step 13-15: Notification & Response
13. **Enrollment Service** publish event ke Redis:
    ```typescript
    await redis.publish('enrollment.created', JSON.stringify({
      enrollment_id: enrollment.id,
      student_id: user.id,
      student_name: full_name,
      student_email: email,
      student_wa: wa_number,
      course_id,
      registration_number: enrollment.registration_number,
      timestamp: new Date()
    }))
    ```

14. **Email Service** (async listener) send confirmation email

15. **Enrollment Service** return response via API Gateway → Client:
    ```json
    {
      "success": true,
      "data": {
        "enrollment_id": "uuid",
        "registration_number": "REG-2025-10-001",
        "student_data": {
          "full_name": "Budi Santoso",
          "wa_number": "+6281234567890",
          "email": "budi@example.com"
        },
        "course": {
          "id": "uuid",
          "title": "Piano Basics for Beginners",
          "level": "beginner",
          "price_per_session": 500000
        },
        "status": "pending",
        "registration_date": "2025-10-09T12:00:00Z",
        "next_steps": [
          "Admin akan menghubungi Anda via WhatsApp dalam 1x24 jam",
          "Cek email untuk konfirmasi pendaftaran",
          "Siapkan alat musik (jika sudah punya)"
        ]
      },
      "message": "Pendaftaran berhasil! Kami akan menghubungi Anda segera."
    }
    ```

### Database State After Enrollment
```sql
-- users table (student auto-created)
INSERT INTO users VALUES (
  'uuid-generated',
  'Budi Santoso',
  'budi@example.com',
  NULL, -- firebase_uid NULL untuk student
  false, -- email_verified
  NULL, -- provider
  NULL, -- last_login_at (never logged in)
  '+6281234567890', -- phone_number
  '+6281234567890', -- wa_number
  NULL, -- address
  'student', -- role
  NOW(), -- created_at
  NOW() -- updated_at
);

-- enrollments table
INSERT INTO enrollments VALUES (
  'enrollment-uuid',
  'user-uuid',
  'course-uuid',
  'REG-2025-10-001',
  NOW(),
  'pending',
  'beginner',
  'Weekend pagi, Sabtu 09:00-11:00',
  '["saturday", "sunday"]'::jsonb,
  '{"start": "09:00", "end": "11:00"}'::jsonb,
  '2025-10-20',
  true,
  'Kalau bisa jangan bentrok pramuka.',
  'instagram',
  'Ibu Rina',
  '+628111111111',
  'idempotency-uuid',
  NOW(),
  NOW()
);

-- Redis
SET idempotency:2cfae3c1-1f77-4a83-b0d7-efc1b3d5a0c8 "used" EX 86400
```

---

## 3. Admin Approve Enrollment Flow

### Architecture Diagram
```
Admin Dashboard (Firebase Auth) → API Gateway → Enrollment Service → 
User Service → Email/WhatsApp Notification
```

### Step-by-Step Process

#### Step 1-2: Admin Reviews Pending Enrollments
1. Admin login via Firebase (see Flow #1)
2. Admin dashboard call `GET /api/enrollments?status=pending` (Firebase auth required)

#### Step 3-5: Admin Approves
3. Admin review enrollment details
4. Admin clicks "Approve" button
5. Frontend PATCH ke **API Gateway** `/api/enrollments/:id/approve`:
   ```typescript
   fetch(`/api/enrollments/${enrollmentId}/approve`, {
     method: 'PATCH',
     headers: {
       'Authorization': `Bearer ${firebaseIdToken}`,
       'Content-Type': 'application/json'
     }
   })
   ```

#### Step 6-7: Verify Admin & Update Status
6. **API Gateway** route ke **Enrollment Service** (verify Firebase token first)

7. **Enrollment Service** update enrollment status:
   ```typescript
   const { data } = await supabase
     .from('enrollments')
     .update({
       status: 'active',
       updated_at: new Date()
     })
     .eq('id', enrollmentId)
     .select()
     .single()
   ```

#### Step 8-9: Notify Student
8. **Enrollment Service** publish event:
   ```typescript
   await redis.publish('enrollment.approved', JSON.stringify({
     enrollment_id: enrollmentId,
     student_id: enrollment.student_id,
     student_email,
     student_wa,
     course_title,
     registration_number
   }))
   ```

9. **Notification Service** (async):
   - Send email: "Your enrollment has been approved!"
   - Trigger WhatsApp message (via Twilio/WhatsApp Business API)

### Admin Rejection Flow
Similar to approval, but:
- Update status to 'cancelled'
- Publish 'enrollment.rejected' event
- Send rejection reason to student

---

## 4. Live Chat Flow (Public)

### Architecture Diagram
```
Guest WebSocket ↔ API Gateway ↔ Chat Service ↔ Redis Pub/Sub ↔ Admin Dashboard
```

### Step-by-Step Process

#### Step 1-3: Guest Initiates Chat
1. Calon siswa browse website, klik "Live Chat" button
2. Frontend establish WebSocket connection (no auth required):
   ```typescript
   const ws = new WebSocket('wss://api-gateway.com/api/chat/connect')
   ```

3. **API Gateway** upgrade HTTP → WebSocket, forward to **Chat Service**

#### Step 4-6: Create Chat Session
4. **Chat Service** create or retrieve chat session:
   ```typescript
   const { data: session } = await supabase
     .from('chat_sessions')
     .select('*')
     .eq('user_id', null) // Guest session
     .eq('started_at', today)
     .single()
   
   if (!session) {
     const { data: newSession } = await supabase
       .from('chat_sessions')
       .insert({
         user_id: null, // Guest (no user account)
         started_at: new Date(),
         metadata: { ip_address, user_agent }
       })
       .select()
       .single()
   }
   ```

5. **Chat Service** subscribe to Redis channel:
   ```typescript
   redis.subscribe(`chat:session:${sessionId}`)
   ```

6. Send welcome message to guest

#### Step 7-9: Guest Sends Message
7. Guest types message and sends via WebSocket
8. **Chat Service** save message to database:
   ```typescript
   await supabase.from('chat_messages').insert({
     session_id: sessionId,
     role: 'user',
     content: 'Halo, saya mau tanya tentang kelas piano',
     created_at: new Date()
   })
   ```

9. **Chat Service** publish to Redis for real-time broadcast:
   ```typescript
   await redis.publish(`chat:session:${sessionId}`, JSON.stringify({
     type: 'new_message',
     session_id: sessionId,
     role: 'user',
     content: 'Halo, saya mau tanya tentang kelas piano',
     timestamp: new Date()
   }))
   ```

#### Step 10-11: Admin Receives & Replies
10. **Admin Dashboard** subscribe to all active sessions:
    ```typescript
    // Admin WebSocket connection (requires Firebase auth)
    redis.subscribe('chat:session:*')
    
    redis.on('message', (channel, message) => {
      const data = JSON.parse(message)
      // Emit to admin UI
      adminSocket.emit('new_message', data)
    })
    ```

11. Admin replies, same flow reversed:
    - Admin sends message via WebSocket
    - **Chat Service** saves dengan role='assistant'
    - Publish to Redis
    - Guest receives message in real-time

#### Step 12: Close Session
12. After 30 minutes idle or guest closes tab:
    ```typescript
    await supabase
      .from('chat_sessions')
      .update({ 
        ended_at: new Date(),
        metadata: { ...metadata, duration_minutes: 30 }
      })
      .eq('id', sessionId)
    ```

---

## 5. Class Schedule & Attendance Flow

### Architecture Diagram
```
Admin Dashboard → API Gateway → Schedule Service → Course Service → 
User Service → Supabase (class_schedules, schedule_attendees)
```

### Step-by-Step Process

#### Step 1-4: Admin Creates Schedule
1. Admin selects course, instructor, room, date/time
2. Frontend POST `/api/schedules` (Firebase auth required)
3. **Schedule Service** validate:
   - Instructor exists dan role='instructor'
   - Room exists
   - No conflict (room & instructor available)

4. **Schedule Service** insert with anti-overlap check:
   ```typescript
   // PostgreSQL EXCLUDE constraint akan reject jika overlap
   const { data: schedule } = await supabase
     .from('class_schedules')
     .insert({
       course_id,
       instructor_id,
       room_id,
       start_time: new Date('2025-10-20 09:00:00'),
       end_time: new Date('2025-10-20 11:00:00')
     })
     .select()
     .single()
   ```

#### Step 5-6: Assign Students to Schedule
5. Admin views approved enrollments for the course
6. Admin assigns students to schedule:
   ```typescript
   // Frontend: POST /api/schedules/:id/attendees
   {
     "student_ids": ["uuid1", "uuid2", "uuid3"]
   }
   ```

7. **Schedule Service** insert attendees (enforce capacity):
   ```typescript
   for (const studentId of student_ids) {
     await supabase
       .from('schedule_attendees')
       .insert({
         class_schedule_id: scheduleId,
         student_id: studentId,
         attended: null // belum ditandai
       })
   }
   // Trigger enforce_class_capacity akan reject jika penuh
   ```

#### Step 8-9: Mark Attendance (After Class)
8. Admin opens attendance page, view students for schedule
9. Admin mark attendance:
   ```typescript
   // Frontend: PATCH /api/attendance
   {
     "class_schedule_id": "uuid",
     "student_id": "uuid",
     "attended": true
   }
   ```

10. **Attendance Service** update:
    ```typescript
    await supabase
      .from('schedule_attendees')
      .update({ attended: true })
      .eq('class_schedule_id', scheduleId)
      .eq('student_id', studentId)
    ```

11. Publish event untuk analytics:
    ```typescript
    await redis.publish('attendance.marked', JSON.stringify({
      schedule_id: scheduleId,
      student_id: studentId,
      course_id,
      attended: true,
      timestamp: new Date()
    }))
    ```

---

## 6. Admin Dashboard Data Flow

### Architecture Diagram
```
Admin Dashboard → API Gateway → Multiple Services (Parallel) → Aggregated Response
```

### Step-by-Step Process

#### Step 1: Admin Opens Dashboard
1. Admin login via Firebase (authenticated)
2. Frontend requests dashboard data:
   ```typescript
   fetch('/api/admin/dashboard', {
     headers: {
       'Authorization': `Bearer ${firebaseIdToken}`
     }
   })
   ```

#### Step 2-5: API Gateway Aggregates Data
2. **API Gateway** verify Firebase token
3. **API Gateway** makes parallel calls to services:
   ```typescript
   const [enrollments, schedules, chats, analytics] = await Promise.all([
     fetch(`${ENROLLMENT_SERVICE_URL}/api/enrollments?status=pending`),
     fetch(`${SCHEDULE_SERVICE_URL}/api/schedules/today`),
     fetch(`${CHAT_SERVICE_URL}/api/chat/active-sessions`),
     fetch(`${ANALYTICS_SERVICE_URL}/api/stats`)
   ])
   ```

4. **Enrollment Service** query pending enrollments:
   ```typescript
   const { data } = await supabase
     .from('enrollments')
     .select(`
       *,
       users!inner(full_name, email, wa_number),
       courses!inner(title, level, price_per_session)
     `)
     .eq('status', 'pending')
     .order('registration_date', { ascending: true })
   ```

5. **Schedule Service**, **Chat Service**, **Analytics Service** return respective data

#### Step 6: Return Aggregated Response
6. **API Gateway** combine all data:
   ```json
   {
     "stats": {
       "pending_enrollments": 15,
       "active_students": 120,
       "scheduled_classes_today": 8,
       "active_chat_sessions": 3
     },
     "pending_enrollments": [ /* array */ ],
     "today_schedules": [ /* array */ ],
     "active_chats": [ /* array */ ],
     "recent_activity": [ /* array */ ]
   }
   ```

### Key Queries for Dashboard

**Total Students**:
```sql
SELECT COUNT(*) FROM users WHERE role = 'student';
```

**Total Instructors**:
```sql
SELECT COUNT(*) FROM users WHERE role = 'instructor';
```

**Pending Enrollments**:
```sql
SELECT COUNT(*) FROM enrollments WHERE status = 'pending';
```

**Active Enrollments**:
```sql
SELECT COUNT(*) FROM enrollments WHERE status = 'active';
```

**Today's Schedules**:
```sql
SELECT * FROM class_schedules
WHERE DATE(start_time) = CURRENT_DATE
ORDER BY start_time;
```

**Attendance Rate (This Month)**:
```sql
SELECT 
  COUNT(*) FILTER (WHERE attended = true) * 100.0 / COUNT(*) AS attendance_rate
FROM schedule_attendees sa
JOIN class_schedules cs ON cs.id = sa.class_schedule_id
WHERE DATE_TRUNC('month', cs.start_time) = DATE_TRUNC('month', CURRENT_DATE);
```

---

## Security Notes

### Authentication
- ✅ Admin: Firebase ID token verification (1 hour expiry)
- ❌ Students: NO authentication
- ❌ Instructors: NO authentication

### Public Endpoint Protection
- ✅ Captcha validation (Turnstile/reCAPTCHA)
- ✅ Idempotency keys (prevent duplicate submissions)
- ✅ Rate limiting (per IP address)
- ✅ Input validation (Zod/Joi)

### Service-to-Service Communication
- ✅ Internal JWT tokens dengan SERVICE_JWT_SECRET
- ✅ X-Service-Name header untuk tracking

### Data Privacy
- ✅ Student data stored tanpa consent login (GDPR compliance needed)
- ✅ Firebase UID NULL untuk non-admin users
- ✅ Sensitive data (Firebase keys) di environment variables

---

**Last Updated**: October 9, 2025  
**Version**: 2.0 (Updated with Firebase Auth model)  
**Status**: ✅ Aligned with current architecture
