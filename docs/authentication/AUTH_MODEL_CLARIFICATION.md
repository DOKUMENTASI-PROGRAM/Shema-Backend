# Authentication Model Clarification - Critical Update

## Tanggal: 9 Oktober 2025

## ⚠️ MAJOR ARCHITECTURE CHANGE

Terjadi **miskomunikasi fundamental** mengenai model authentication sistem Shema Music. Berikut klarifikasi yang benar:

---

## ❌ SALAH (Arsitektur Sebelumnya)

### Konsep Yang Salah:
- ✗ Siswa register dan punya akun dengan login
- ✗ Guru register dan punya akun dengan login
- ✗ Firebase Authentication untuk semua user (siswa, guru, admin)
- ✗ Siswa login untuk melihat enrollments mereka
- ✗ Guru login untuk manage jadwal mereka

### Flow Yang Salah:
```
Siswa → Register via Firebase → Login → Browse Course → Enroll
```

---

## ✅ BENAR (Arsitektur Sebenarnya)

### Konsep Yang Benar:
- ✓ **Hanya Admin yang punya akun dan login** (untuk dashboard)
- ✓ **Siswa dan Guru TIDAK punya akun/login** - mereka pasif
- ✓ **Data siswa diambil dari form pendaftaran course**
- ✓ **No authentication** untuk siswa dan guru
- ✓ **Public website** untuk browse course dan daftar

### Flow Yang Benar:
```
Calon Siswa (Guest) → Browse Course (Public) → Isi Form Pendaftaran (Public) → 
Admin Review → Approve → Hubungi via WA → Jadwal Kelas
```

---

## Model Authentication yang Benar

### 1. Admin (Firebase Authentication Required)
```
Role: admin
Authentication Provider: Firebase Authentication
Login Method: Email + Password via Firebase
Firebase Features:
  - Sign in with email/password
  - Forgot password / Reset password via email
  - Email verification
  - Session management
Backend:
  - Verify Firebase ID token
  - Store firebase_uid di Supabase users table
  - Generate additional JWT for API calls (optional)
Access: Dashboard admin untuk manage semua data
Endpoints: Semua endpoint dengan tag [Admin]
```

**Why Firebase?**
- ✅ Built-in forgot password flow (reset via email)
- ✅ Email verification out of the box
- ✅ Secure password hashing automatically
- ✅ Session management handled by Firebase
- ✅ No need to implement password reset logic manually

### 2. Siswa (NO Authentication - NO Firebase)
```
Status: Pasif/Guest
Authentication: NONE - Tidak pakai Firebase Auth
Registration: Via public form saat mendaftar course
Data Collection: Saat submit form pendaftaran
firebase_uid: NULL (tidak punya akun Firebase)
Access: Public endpoints only (browse course, check status pendaftaran)
```

**Why NO Firebase for Students?**
- ✅ Simplify user experience (no account needed)
- ✅ Reduce friction in registration
- ✅ Students don't need to remember passwords
- ✅ Admin handles all communication via WhatsApp

### 3. Guru/Instructor (NO Authentication - NO Firebase)
```
Status: Pasif
Authentication: NONE - Tidak pakai Firebase Auth
Data Management: Dikelola oleh admin via dashboard
Assignment: Admin assign instructor ke schedule
firebase_uid: NULL (tidak punya akun Firebase)
```

**Why NO Firebase for Instructors?**
- ✅ Instructors managed by admin only
- ✅ Schedule sent via WhatsApp/Email
- ✅ No need for instructor self-service portal (out of scope)

---

## Admin Authentication Flow (Firebase)

### Admin Register (One-time Setup)
```typescript
// Frontend: Firebase SDK
import { createUserWithEmailAndPassword } from 'firebase/auth'

const userCredential = await createUserWithEmailAndPassword(
  auth, 
  'admin@shemamusic.com', 
  'SecurePassword123!'
)

// Get Firebase ID token
const idToken = await userCredential.user.getIdToken()

// Backend: Verify token & create admin profile
POST /api/auth/admin/register
Headers: {
  "Authorization": "Bearer {firebase_id_token}"
}
Body: {
  "full_name": "Admin Shema Music",
  "phone_number": "+6281234567890"
}
```

### Admin Login
```typescript
// Frontend: Firebase SDK
import { signInWithEmailAndPassword } from 'firebase/auth'

const userCredential = await signInWithEmailAndPassword(
  auth,
  'admin@shemamusic.com',
  'SecurePassword123!'
)

// Get Firebase ID token (valid 1 hour)
const idToken = await userCredential.user.getIdToken()

// Backend: Verify token & return user data
POST /api/auth/admin/login
Headers: {
  "Authorization": "Bearer {firebase_id_token}"
}

Response: {
  "success": true,
  "data": {
    "user_id": "uuid",
    "firebase_uid": "firebase_uid_string",
    "full_name": "Admin Shema Music",
    "email": "admin@shemamusic.com",
    "role": "admin"
  },
  "session_token": "optional_backend_jwt_for_api_calls"
}
```

### Admin Forgot Password
```typescript
// Frontend: Firebase SDK (no backend needed)
import { sendPasswordResetEmail } from 'firebase/auth'

await sendPasswordResetEmail(auth, 'admin@shemamusic.com')

// User receives email with reset link
// Click link → Firebase hosted reset page → Set new password
// All handled by Firebase automatically
```

---

## Struktur Form Pendaftaran Course (Public)

### Endpoint
```
POST /api/enrollments (PUBLIC - No Auth, No Firebase)
```

### Request Body Example
```json
{
  // Identitas Siswa
  "full_name": "Budi Santoso",
  "wa_number": "+6281234567890",
  "email": "budi@example.com",
  
  // Course Selection
  "course_id": "6f7a9c8e-2f3a-4a77-9b0a-2f0e8b8c1234",
  
  // Experience & Preferences
  "experience_level": "beginner",
  "time_preferences": "Weekend pagi, Sabtu 09:00-11:00",
  "preferred_days": ["saturday", "sunday"],
  "preferred_time_range": {
    "start": "09:00",
    "end": "11:00"
  },
  "start_date_target": "2025-10-20",
  
  // Guardian Info (untuk siswa dibawah umur)
  "guardian": {
    "name": "Ibu Rina",
    "wa_number": "+628111111111"
  },
  
  // Additional Info
  "instrument_owned": true,
  "notes": "Kalau bisa jangan bentrok pramuka.",
  "referral_source": "instagram",
  
  // Security
  "consent": true,
  "captcha_token": "turnstile-or-recaptcha-token",
  "idempotency_key": "2cfae3c1-1f77-4a83-b0d7-efc1b3d5a0c8"
}
```

### Response
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

---

## Database Schema Impact

### Users Table
```sql
-- users sekarang HANYA untuk admin dan data siswa/guru
-- Siswa/Guru di-create otomatis dari form enrollment
CREATE TABLE users (
  id uuid PRIMARY KEY,
  full_name varchar NOT NULL,
  email citext UNIQUE, -- Dari form enrollment
  firebase_uid text UNIQUE, -- NULL untuk siswa (tidak punya akun Firebase)
  email_verified boolean DEFAULT false,
  provider text, -- NULL untuk siswa
  last_login_at timestamp, -- NULL untuk siswa (tidak pernah login)
  phone_number varchar UNIQUE, -- Dari form enrollment
  wa_number varchar, -- WhatsApp untuk contact
  address text,
  role user_role NOT NULL, -- student | instructor | admin
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);
```

**Key Points**:
- `firebase_uid` = NULL untuk siswa (karena tidak punya akun Firebase)
- `last_login_at` = NULL untuk siswa (tidak pernah login)
- User record dibuat otomatis saat form enrollment di-submit
- Email dari form digunakan untuk create user

### Enrollments Table (Extended)
```sql
-- Enrollments sekarang menyimpan semua data dari form
CREATE TABLE enrollments (
  id uuid PRIMARY KEY,
  student_id uuid REFERENCES users(id),
  course_id uuid REFERENCES courses(id),
  registration_number varchar UNIQUE, -- REG-2025-10-001
  registration_date timestamp DEFAULT now(),
  status enrollment_status DEFAULT 'pending',
  
  -- Data dari form pendaftaran
  experience_level text,
  time_preferences text,
  preferred_days jsonb, -- ["saturday", "sunday"]
  preferred_time_range jsonb, -- {"start": "09:00", "end": "11:00"}
  start_date_target date,
  instrument_owned boolean,
  notes text,
  referral_source text,
  
  -- Guardian info (optional)
  guardian_name varchar,
  guardian_wa_number varchar,
  
  -- Metadata
  idempotency_key uuid UNIQUE, -- Prevent duplicate submission
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);
```

---

## Endpoint Classification

### 🌐 Public Endpoints (No Authentication)
```
GET  /api/courses              - Browse courses
GET  /api/courses/:id          - Course detail
POST /api/enrollments          - Submit enrollment form
GET  /api/users/check          - Check enrollment status by email/reg number
GET  /api/schedules            - View available schedules
WS   /api/chat/connect         - Live chat dengan admin
```

### 🔐 Admin-Only Endpoints (Authentication Required)
```
POST   /api/auth/login               - Admin login
GET    /api/auth/me                  - Admin info
POST   /api/auth/logout              - Admin logout
GET    /api/users/students           - List students
GET    /api/users/instructors        - List instructors
POST   /api/users/instructors        - Create instructor
PATCH  /api/enrollments/:id/approve  - Approve enrollment
PATCH  /api/enrollments/:id/reject   - Reject enrollment
POST   /api/courses                  - Create course
PUT    /api/courses/:id              - Update course
DELETE /api/courses/:id              - Delete course
POST   /api/schedules                - Create schedule
POST   /api/attendance               - Mark attendance
GET    /api/analytics/*              - Dashboard analytics
```

---

## User Journey

### Calon Siswa Journey (No Login)
```
1. Visit Website
   └─> Browse courses (public)
       └─> View course detail (public)
           └─> Fill enrollment form (public)
               └─> Receive registration number
                   └─> Check status via email/reg number (public)
                       └─> Wait for admin contact via WA
```

### Admin Journey (With Login)
```
1. Login to Dashboard
   └─> View pending enrollments
       ├─> Review student data
       ├─> Check preferred time
       ├─> Contact student via WA
       └─> Approve enrollment
           └─> Assign to schedule
               └─> Mark attendance
```

### Instructor Journey (Passive - No Login)
```
1. Admin creates instructor profile
   └─> Admin assigns instructor to schedules
       └─> Instructor receives schedule via WA/Email
           └─> Instructor teaches class
               └─> Admin marks attendance
```

---

## Security Implications

### Removed Features
- ❌ Student authentication/login system
- ❌ Instructor authentication/login system
- ❌ Firebase Auth for students/instructors (ONLY for admin)
- ❌ JWT tokens for students/instructors
- ❌ Student dashboard/portal
- ❌ Instructor dashboard/portal

### Firebase Authentication Usage
- ✅ **Firebase Auth for Admin ONLY**
  - Admin register/login via Firebase
  - Firebase ID token verification di backend
  - Forgot password via Firebase (auto email reset)
  - Email verification for admin accounts
  
### Added Security (Public Endpoints)
- ✅ **Captcha validation** (Turnstile/reCAPTCHA) untuk form enrollment
- ✅ **Idempotency keys** untuk prevent duplicate submissions
- ✅ **Rate limiting** pada public endpoints
- ✅ **Email confirmation** untuk enrollment (no verification required)
- ✅ **Admin-only access** to sensitive data via Firebase Auth

### Privacy Considerations
- Student data stored without user consent to login
- GDPR/Privacy Policy compliance required
- Email untuk notification dan status check only
- WhatsApp sebagai primary communication channel

---

## Communication Flow

### Admin → Student
```
Medium: WhatsApp (Primary)
Backup: Email

Events yang trigger communication:
- Enrollment approved
- Schedule assigned
- Class reminder (1 day before)
- Payment reminder
- Class cancellation
```

### Student → Admin
```
Medium: Live Chat (Public WebSocket)
Backup: Email, WhatsApp

Use Cases:
- Inquiry before enrollment
- Ask questions about course
- Check enrollment status
- Request schedule change
```

---

## Data Collection Point

### Registration Form adalah SATU-SATUNYA cara collect data siswa
```
Form Fields Required:
├── Personal Info
│   ├── full_name (required)
│   ├── wa_number (required)
│   └── email (required)
├── Course Selection
│   └── course_id (required)
├── Experience
│   └── experience_level (required)
├── Schedule Preferences
│   ├── preferred_days (required)
│   ├── preferred_time_range (required)
│   └── start_date_target (optional)
├── Guardian Info (conditional)
│   ├── guardian.name
│   └── guardian.wa_number
├── Additional
│   ├── instrument_owned
│   ├── notes
│   └── referral_source
└── Security
    ├── consent (required)
    ├── captcha_token (required)
    └── idempotency_key (required)
```

---

## Migration Tasks

### Backend Changes Required
1. ✅ **Implement Firebase Auth for Admin ONLY**
   - Firebase Admin SDK integration
   - Verify Firebase ID tokens
   - Map firebase_uid to admin users
   - Handle forgot password (delegated to Firebase)

2. ✅ **Keep students/instructors WITHOUT Firebase Auth**
   - Set firebase_uid = NULL for non-admin users
   - Create user records from public form submissions
   
3. ✅ Update enrollment endpoint to accept full form data
4. ✅ Implement captcha validation (Turnstile/reCAPTCHA)
5. ✅ Implement idempotency key checking
6. ✅ Create user automatically from enrollment form
7. ✅ Add guardian info to student_profiles
8. ✅ Add enrollment preferences to enrollments table
9. ✅ Update chat to work without authentication
10. ✅ Add email notification system
11. ✅ Add WhatsApp notification integration (optional)

### Frontend Changes Required
1. ✅ **Setup Firebase SDK for Admin Authentication**
   - Initialize Firebase in admin dashboard
   - Implement admin login with Firebase
   - Implement forgot password flow (Firebase UI or custom)
   - Store Firebase ID token for API calls
   
2. ✅ Remove student login/register pages (no Firebase for students)
3. ✅ Remove instructor login/register pages (no Firebase for instructors)
4. ✅ Remove student dashboard
5. ✅ Remove instructor dashboard
6. ✅ Create comprehensive enrollment form (public, no auth)
7. ✅ Add captcha widget to form
8. ✅ Create enrollment status check page (public)
9. ✅ Update chat to work as guest (no auth)
10. ✅ Admin dashboard with Firebase login

### Database Migration
```sql
-- Add new columns to enrollments
ALTER TABLE enrollments ADD COLUMN registration_number VARCHAR UNIQUE;
ALTER TABLE enrollments ADD COLUMN experience_level TEXT;
ALTER TABLE enrollments ADD COLUMN time_preferences TEXT;
ALTER TABLE enrollments ADD COLUMN preferred_days JSONB;
ALTER TABLE enrollments ADD COLUMN preferred_time_range JSONB;
ALTER TABLE enrollments ADD COLUMN start_date_target DATE;
ALTER TABLE enrollments ADD COLUMN instrument_owned BOOLEAN;
ALTER TABLE enrollments ADD COLUMN notes TEXT;
ALTER TABLE enrollments ADD COLUMN referral_source TEXT;
ALTER TABLE enrollments ADD COLUMN guardian_name VARCHAR;
ALTER TABLE enrollments ADD COLUMN guardian_wa_number VARCHAR;
ALTER TABLE enrollments ADD COLUMN idempotency_key UUID UNIQUE;

-- Allow NULL firebase_uid for students
ALTER TABLE users ALTER COLUMN firebase_uid DROP NOT NULL;

-- Add indexes for common queries
CREATE INDEX idx_enrollments_registration_number ON enrollments(registration_number);
CREATE INDEX idx_enrollments_status ON enrollments(status);
CREATE INDEX idx_enrollments_idempotency ON enrollments(idempotency_key);
```

---

## Testing Checklist

### Firebase Authentication (Admin)
- [ ] Admin register via Firebase (createUserWithEmailAndPassword)
- [ ] Admin login via Firebase (signInWithEmailAndPassword)
- [ ] Get Firebase ID token
- [ ] Backend verify Firebase ID token
- [ ] Admin forgot password (sendPasswordResetEmail)
- [ ] Admin reset password via Firebase email link
- [ ] Token refresh when expired (Firebase SDK auto-handles)
- [ ] Admin logout (signOut)

### Public Endpoints (No Auth, No Firebase)
- [ ] Browse courses list (no auth required)
- [ ] View course detail (no auth required)
- [ ] Submit enrollment form with all fields (no auth)
- [ ] Submit with duplicate email (should use existing user record)
- [ ] Submit with duplicate idempotency_key (should reject)
- [ ] Submit without captcha (should reject)
- [ ] Submit without consent (should reject)
- [ ] Check enrollment status by email (no auth)
- [ ] Check enrollment status by registration number (no auth)
- [ ] Connect to live chat as guest (no auth)

### Admin Endpoints (Firebase Auth Required)
- [ ] View pending enrollments (with Firebase token)
- [ ] Approve enrollment (with Firebase token)
- [ ] Reject enrollment (with Firebase token)
- [ ] View student list with enrollment data
- [ ] Create instructor (admin creates, no Firebase for instructor)
- [ ] Assign instructor to schedule
- [ ] Mark attendance
- [ ] Access denied if Firebase token invalid/expired

### Notifications
- [ ] Email sent after enrollment submitted
- [ ] Email sent after enrollment approved
- [ ] WhatsApp notification (if integrated)

---

## API Documentation Status

### Updated Files
- ✅ `docs/api-endpoints.md` - Main API documentation
- ✅ `docs/AUTH_MODEL_CLARIFICATION.md` - This document
- ⏳ `docs/architecture-overview.md` - Needs update
- ⏳ `docs/data-flow.md` - Needs update
- ⏳ `docs/SCHEMA_ALIGNMENT_SUMMARY.md` - Needs update

---

## Authentication Flow Diagrams

### Admin Authentication Flow (Firebase)
```
┌─────────────┐
│ Admin Login │
│   Page      │
└──────┬──────┘
       │ email + password
       ▼
┌─────────────────────┐
│ Firebase Auth SDK   │
│ signInWithEmail...  │
└──────┬──────────────┘
       │ Success → Firebase ID Token (1 hour valid)
       ▼
┌─────────────────────┐
│ Backend API         │
│ POST /auth/login    │
│ Header: Bearer {token}
└──────┬──────────────┘
       │ 1. Verify token with Firebase Admin SDK
       │ 2. Extract firebase_uid
       │ 3. Query Supabase users table
       ▼
┌─────────────────────┐
│ Return User Profile │
│ + Session Token     │
└─────────────────────┘
```

### Admin Forgot Password Flow (Firebase)
```
┌──────────────────┐
│ Forgot Password  │
│     Page         │
└────────┬─────────┘
         │ email
         ▼
┌──────────────────────────┐
│ Firebase Auth SDK        │
│ sendPasswordResetEmail() │
└────────┬─────────────────┘
         │ Firebase sends email automatically
         │ (No backend involvement)
         ▼
┌──────────────────────────┐
│ User Email Inbox         │
│ Click "Reset Password"   │
└────────┬─────────────────┘
         │ Opens Firebase hosted page
         ▼
┌──────────────────────────┐
│ Firebase Reset UI        │
│ Enter new password       │
└────────┬─────────────────┘
         │ Password updated in Firebase
         ▼
┌──────────────────────────┐
│ Redirect to Login Page   │
└──────────────────────────┘
```

### Student Registration Flow (NO Firebase)
```
┌─────────────────┐
│ Browse Courses  │
│  (Public Page)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Course Detail   │
│ Click "Daftar"  │
└────────┬────────┘
         │
         ▼
┌────────────────────────┐
│ Enrollment Form        │
│ - full_name            │
│ - wa_number            │
│ - email                │
│ - course_id            │
│ - preferences...       │
│ - captcha              │
└────────┬───────────────┘
         │ POST /api/enrollments (PUBLIC)
         ▼
┌────────────────────────┐
│ Backend                │
│ 1. Validate captcha    │
│ 2. Check idempotency   │
│ 3. Create/update user  │
│    (firebase_uid=NULL) │
│ 4. Create enrollment   │
│ 5. Send email notif    │
└────────┬───────────────┘
         │
         ▼
┌────────────────────────┐
│ Success Response       │
│ Registration Number    │
│ Next Steps Info        │
└────────────────────────┘
         │
         ▼
┌────────────────────────┐
│ Admin Reviews via      │
│ Dashboard (Firebase)   │
│ Contact via WhatsApp   │
└────────────────────────┘
```

---

## Questions & Answers

### Q: Kenapa admin pakai Firebase tapi siswa tidak?
**A**: 
- **Admin perlu forgot password feature** → Firebase provides this out of the box
- **Admin perlu secure authentication** → Firebase handles password hashing & security
- **Siswa tidak perlu login** → Simple public form registration is enough
- **Trade-off**: Admin experience vs Student experience

### Q: Apakah harus bayar untuk Firebase Authentication?
**A**: 
- Firebase Auth **FREE** untuk first 50,000 monthly active users
- Project Shema Music unlikely to hit this limit (hanya admin yang login, mungkin 1-5 accounts)
- **Cost: $0/month** untuk use case ini

### Q: Bagaimana siswa melihat jadwal mereka?
**A**: Siswa tidak perlu login. Admin menghubungi via WhatsApp dengan info jadwal. Alternatively, bisa buat public endpoint untuk check jadwal by registration number (no auth).

### Q: Bagaimana instructor tahu jadwal mereka?
**A**: Admin send schedule via WhatsApp/Email. Instructor tidak perlu login. Alternatively, bisa buat simple view-only page dengan magic link token.

### Q: Apakah siswa bisa update preferensi waktu mereka?
**A**: Tidak via login system. Siswa kontak admin via live chat atau WhatsApp untuk perubahan.

### Q: Bagaimana payment tracking?
**A**: Payment dihandle manual oleh admin. Record payment di dashboard admin. No online payment gateway (out of scope).

### Q: Apakah perlu email verification untuk siswa?
**A**: 
- **Tidak wajib** untuk siswa enrollment
- Bisa kirim confirmation email dengan registration number
- Email verification **OPTIONAL** (admin review lebih penting)
- Untuk **admin**: Firebase automatically handles email verification

### Q: Bagaimana cara admin reset password?
**A**: 
1. Admin click "Forgot Password" di login page
2. Enter email address
3. Firebase sends reset email (automatic)
4. Click link in email
5. Enter new password di Firebase hosted page
6. Done! (No backend code needed)

### Q: Apakah bisa pakai provider lain selain email/password untuk admin?
**A**: 
- Yes! Firebase supports Google, Microsoft, GitHub, etc.
- Bisa enable di Firebase Console → Authentication → Sign-in methods
- Backend code tidak perlu diubah (Firebase Admin SDK handles all providers)

### Q: Field `firebase_uid` di database digunakan untuk apa?
**A**: 
- **Admin users**: Store Firebase UID untuk link ke Firebase account
- **Student/Instructor users**: NULL (mereka tidak punya Firebase account)
- Query: `WHERE firebase_uid IS NULL` = non-admin users
- Query: `WHERE firebase_uid IS NOT NULL` = admin users

---

## Firebase Setup Requirements

### 1. Firebase Project Configuration
```bash
# Create Firebase project di Firebase Console
# Enable Authentication → Email/Password provider
# Get Firebase config credentials:
```

```javascript
// Frontend: firebase-config.js
export const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "shema-music.firebaseapp.com",
  projectId: "shema-music",
  storageBucket: "shema-music.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
}
```

### 2. Backend: Firebase Admin SDK
```typescript
// Backend: services/auth/src/firebase-admin.ts
import admin from 'firebase-admin'

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  })
})

// Verify Firebase ID token
export async function verifyFirebaseToken(idToken: string) {
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken)
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      email_verified: decodedToken.email_verified
    }
  } catch (error) {
    throw new Error('INVALID_FIREBASE_TOKEN')
  }
}
```

### 3. Frontend: Firebase SDK Usage
```typescript
// Admin Dashboard: auth/login.ts
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth'
import { initializeApp } from 'firebase/app'
import { firebaseConfig } from './firebase-config'

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)

// Admin Login
export async function adminLogin(email: string, password: string) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    const idToken = await userCredential.user.getIdToken()
    
    // Send to backend for profile data
    const response = await fetch('/api/auth/admin/login', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      }
    })
    
    const data = await response.json()
    return { success: true, user: data.user, idToken }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

// Forgot Password (No backend needed)
export async function sendPasswordReset(email: string) {
  try {
    await sendPasswordResetEmail(auth, email)
    return { success: true, message: 'Password reset email sent' }
  } catch (error) {
    return { success: false, error: error.message }
  }
}
```

### 4. Environment Variables

**Backend (.env)**:
```env
# Firebase Admin SDK
FIREBASE_PROJECT_ID=shema-music
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@shema-music.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Supabase (for data storage)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

**Frontend (.env)**:
```env
# Firebase SDK (public keys)
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=shema-music.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=shema-music
VITE_FIREBASE_STORAGE_BUCKET=shema-music.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
```

---

## Next Steps (Priority Order)

### Phase 1: Core Functionality (Week 1-2)
1. **Setup Firebase Authentication**
   - Create Firebase project
   - Enable Email/Password authentication
   - Setup Firebase Admin SDK di backend
   - Setup Firebase SDK di frontend (admin dashboard only)
   
2. **Implement Admin Auth Flow**
   - Admin register via Firebase
   - Admin login with Firebase ID token verification
   - Forgot password flow (Firebase handles it)
   - Store firebase_uid di Supabase users table
   
3. **Public Enrollment System**
   - Update enrollment endpoint dengan full form fields
   - Implement captcha validation
   - Implement idempotency key checking
   - Auto-create user from enrollment (firebase_uid = NULL)
   - Add email notification basic
   - Update admin dashboard untuk review enrollments

### Phase 2: Communication (Week 3)
1. WhatsApp notification integration (optional)
2. Live chat tanpa authentication
3. Public enrollment status check page
4. Email templates untuk notifications

### Phase 3: Admin Tools (Week 4)
1. Enhanced admin dashboard
2. Bulk operations untuk enrollments
3. Schedule management tools
4. Attendance tracking
5. Basic analytics

---

## TL;DR (Too Long; Didn't Read)

### ✅ What Changed:
1. **Admin**: Uses **Firebase Authentication** (for forgot password feature)
2. **Students**: **NO authentication** - public registration form only
3. **Instructors**: **NO authentication** - managed by admin only

### 🔑 Key Points:
- **Only 1 authentication system**: Firebase (for admin dashboard only)
- **Public endpoints**: Course browsing, enrollment form, chat
- **Admin endpoints**: Protected by Firebase ID token
- **Forgot password**: Handled automatically by Firebase (no custom code)
- **`firebase_uid` field**: Admin = has value, Students/Instructors = NULL

### 📦 What to Install:
**Backend**:
```bash
npm install firebase-admin
```

**Frontend (Admin Dashboard)**:
```bash
npm install firebase
```

**Frontend (Public Website)**:
```bash
# No Firebase needed! Just vanilla form submission
```

### 🚀 Quick Start:
1. Create Firebase project → Enable Email/Password auth
2. Get Firebase config → Add to frontend `.env`
3. Get Firebase service account → Add to backend `.env`
4. Implement admin login with Firebase SDK
5. Verify token di backend with Firebase Admin SDK
6. Done! Forgot password works automatically

### 💰 Cost:
- Firebase Auth: **FREE** (up to 50,000 MAU)
- Expected usage: ~1-5 admin accounts
- **Total cost: $0/month**

---

**Document Version**: 3.0 (Updated with Firebase clarification)  
**Date**: October 9, 2025  
**Impact**: CRITICAL - Architecture Change  
**Firebase Usage**: Admin authentication ONLY  
**Requires**: Full review and approval before implementation  
**Approved By**: [Pending]
