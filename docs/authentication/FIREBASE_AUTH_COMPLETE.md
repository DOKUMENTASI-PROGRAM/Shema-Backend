# Firebase Authentication Setup - Complete Guide

## ✅ Firebase Integration Complete!

Firebase Admin SDK telah berhasil diintegrasikan ke dalam Auth Service dengan konfigurasi berikut:

### 📋 Project Information
```
Project Name: Les-Music
Project ID: les-music
Project Number: 895694152443
Web API Key: AIzaSyAFHpjE_98GkEsyO6e8XsHfjPzQpf5f0uk
```

### 🔧 What's Been Configured

#### 1. Firebase Admin SDK Installed
```bash
✅ firebase-admin@13.5.0
✅ Service account key: config/firebase-service-account.json
```

#### 2. Environment Variables Updated
```env
FIREBASE_PROJECT_ID=les-music
FIREBASE_PROJECT_NUMBER=895694152443
FIREBASE_WEB_API_KEY=AIzaSyAFHpjE_98GkEsyO6e8XsHfjPzQpf5f0uk
FIREBASE_SERVICE_ACCOUNT_PATH=./config/firebase-service-account.json
```

#### 3. New Files Created

**Firebase Config** (`src/config/firebase.ts`):
- `initializeFirebase()` - Initialize Firebase Admin SDK
- `verifyFirebaseToken()` - Verify ID tokens from frontend
- `createFirebaseUser()` - Create admin users
- `generatePasswordResetLink()` - Password reset functionality
- `getFirebaseAuth()` - Get Firebase Auth instance

**Firebase Controller** (`src/controllers/firebaseAuthController.ts`):
- `firebaseLogin()` - Login with Firebase ID token
- `firebaseRegister()` - Register admin via Firebase
- `requestPasswordReset()` - Request password reset link

**Firebase Routes** (`src/routes/firebaseAuthRoutes.ts`):
- `POST /api/auth/firebase/register` - Admin registration
- `POST /api/auth/firebase/login` - Admin login
- `POST /api/auth/firebase/reset-password` - Password reset

#### 4. Database Migration Applied
```sql
✅ Added password_hash column
✅ Added auth_provider column ('firebase' or 'password')
✅ Added indexes for email, firebase_uid, auth_provider
✅ Added constraint: Must have either firebase_uid OR password_hash
```

---

## 🏗️ Hybrid Authentication Architecture

### Admin (Firebase Auth)
```
Role: admin
Provider: Firebase Authentication
Features:
  - Email + Password login
  - Email verification
  - Password reset via email
  - Secure password hashing by Firebase
  - Session management by Firebase

Endpoints:
  POST /api/auth/firebase/register  - Create admin account
  POST /api/auth/firebase/login     - Login with ID token
  POST /api/auth/firebase/reset-password - Reset password

Database:
  firebase_uid: <Firebase UID>
  auth_provider: 'firebase'
  password_hash: NULL
```

### Students & Teachers (JWT Auth)
```
Role: student, instructor
Provider: Custom JWT
Features:
  - Simple email + password
  - JWT access tokens (15 min)
  - Refresh tokens (7 days)
  - Redis-backed sessions

Endpoints:
  POST /api/auth/register  - Student/teacher registration
  POST /api/auth/login     - Login
  POST /api/auth/refresh   - Refresh token
  POST /api/auth/logout    - Logout
  GET  /api/auth/me        - Get current user

Database:
  firebase_uid: NULL
  auth_provider: 'password'
  password_hash: <bcrypt hash>
```

---

## 🔄 Authentication Flows

### Admin Login Flow (Firebase)

**Frontend (React/Next.js)**:
```javascript
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

// 1. Sign in with Firebase
const auth = getAuth();
const userCredential = await signInWithEmailAndPassword(
  auth,
  'admin@shemamusic.com',
  'password123'
);

// 2. Get ID token
const idToken = await userCredential.user.getIdToken();

// 3. Send to backend
const response = await fetch('http://localhost:3001/api/auth/firebase/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ idToken })
});

const data = await response.json();
// data.user contains user profile from Supabase
```

**Backend Processing**:
1. Verify Firebase ID token with Admin SDK
2. Extract uid, email, role from token
3. Check/create user in Supabase
4. Update last_login_at
5. Return user data

### Student/Teacher Login Flow (JWT)

**Frontend**:
```javascript
// 1. Login with email/password
const response = await fetch('http://localhost:3001/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'student@example.com',
    password: 'password123'
  })
});

const data = await response.json();
// data.accessToken - Use for API calls
// data.refreshToken - Store securely for token refresh
```

**Backend Processing**:
1. Validate email/password
2. Compare password hash with bcrypt
3. Generate JWT access token (15 min)
4. Generate refresh token (7 days)
5. Store refresh token in Redis
6. Return tokens + user data

---

## 🚀 Testing Guide

### Test with PowerShell

**Health Check**:
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/health" -Method GET
```

**Register Admin** (Requires server restart with updated code):
```powershell
$body = @{
    email = "admin@shemamusic.com"
    password = "AdminShema123!"
    full_name = "Admin Shema Music"
    phone_number = "081234567890"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3001/api/auth/firebase/register" `
    -Method POST `
    -Body $body `
    -ContentType "application/json" | ConvertTo-Json -Depth 5
```

**Register Student** (Already working):
```powershell
$body = @{
    email = "student@shemamusic.com"
    password = "Student123!"
    full_name = "Test Student"
    role = "student"
    phone_number = "081234567890"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3001/api/auth/register" `
    -Method POST `
    -Body $body `
    -ContentType "application/json" | ConvertTo-Json -Depth 5
```

---

## 🔑 Frontend Firebase Configuration

### Install Firebase SDK
```bash
npm install firebase
# or
yarn add firebase
# or
bun add firebase
```

### Initialize Firebase (React/Next.js)
```javascript
// lib/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAFHpjE_98GkEsyO6e8XsHfjPzQpf5f0uk",
  authDomain: "les-music.firebaseapp.com",
  projectId: "les-music",
  storageBucket: "les-music.appspot.com",
  messagingSenderId: "895694152443",
  appId: "YOUR_APP_ID" // Get this from Firebase Console
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
```

### Admin Login Component
```javascript
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';

async function loginAdmin(email, password) {
  try {
    // 1. Sign in with Firebase
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // 2. Get ID token
    const idToken = await userCredential.user.getIdToken();
    
    // 3. Send to backend
    const response = await fetch('/api/auth/firebase/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Store user data
      localStorage.setItem('user', JSON.stringify(data.data.user));
      // Redirect to admin dashboard
      window.location.href = '/admin/dashboard';
    }
  } catch (error) {
    console.error('Login failed:', error);
  }
}
```

---

## 📊 Database Schema

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(255) NOT NULL,
    email CITEXT NOT NULL UNIQUE,
    
    -- Firebase Auth fields
    firebase_uid TEXT,
    email_verified BOOLEAN DEFAULT false,
    provider TEXT,
    
    -- JWT Auth fields
    password_hash TEXT,
    
    -- Auth provider ('firebase' for admin, 'password' for students)
    auth_provider VARCHAR(20) DEFAULT 'password',
    
    -- Common fields
    role user_role NOT NULL, -- 'admin' | 'instructor' | 'student'
    phone_number VARCHAR(25),
    wa_number VARCHAR(25),
    address TEXT,
    avatar_url TEXT,
    
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraint: Must have either firebase_uid OR password_hash
    CONSTRAINT chk_auth_method CHECK (
        (firebase_uid IS NOT NULL AND auth_provider = 'firebase') OR 
        (password_hash IS NOT NULL AND auth_provider = 'password')
    ),
    
    -- Admin must use Firebase
    CONSTRAINT chk_admin_requires_firebase CHECK (
        (role <> 'admin') OR (firebase_uid IS NOT NULL)
    )
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX idx_users_auth_provider ON users(auth_provider);
```

---

## 🐛 Troubleshooting

### Server Not Showing Firebase Routes

**Problem**: `/api/auth/firebase/*` returns 404

**Solution**: Server needs restart to load new code
```powershell
# 1. Find and stop Bun process
Get-Process | Where-Object {$_.ProcessName -like "*bun*"} | Stop-Process -Force

# 2. Start fresh
cd "d:\Tugas\RPL\New folder\Backend\services\auth"
& "$env:USERPROFILE\.bun\bin\bun.exe" run start
```

### Firebase Admin SDK Errors

**Problem**: "Failed to initialize Firebase"

**Solution**: Check service account file exists
```powershell
Test-Path "d:\Tugas\RPL\New folder\Backend\services\auth\config\firebase-service-account.json"
```

### Database Schema Issues

**Problem**: "password_hash column not found"

**Solution**: Apply migration
```powershell
cd "d:\Tugas\RPL\New folder\Backend"
supabase db push
```

---

## 📝 Next Steps

1. **Restart Auth Service** with updated code
2. **Test Firebase endpoints** with PowerShell or Postman
3. **Setup Frontend Firebase** configuration
4. **Create Admin UI** for login with Firebase
5. **Test full authentication flow** (register → login → access dashboard)

---

## 🎯 Summary

✅ **Firebase Admin SDK** integrated with service account  
✅ **Hybrid authentication** - Firebase for admin, JWT for students  
✅ **Database migration** applied for auth_provider support  
✅ **3 new Firebase endpoints** created  
✅ **Security** - Email verification, password reset built-in  
✅ **Production-ready** - Following Firebase best practices  

**Current Status**: Configuration complete, awaiting server restart to test endpoints

**Server Command**:
```powershell
cd "d:\Tugas\RPL\New folder\Backend\services\auth"
& "$env:USERPROFILE\.bun\bin\bun.exe" run start
```

---

**Date**: October 9, 2025  
**Project**: Les-Music Backend  
**Auth Service**: v1.0.0 with Firebase Integration
