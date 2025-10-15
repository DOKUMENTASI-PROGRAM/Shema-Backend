# Auth Service Data Flow Report

## Overview
Auth Service menangani autentikasi menggunakan Firebase Authentication dengan penyimpanan data user di Supabase. Service ini hanya untuk admin users.

## Endpoints dan Data Flow

### 1. POST /auth/firebase/register
**Purpose:** Registrasi admin baru via Firebase

**Data Flow:**
1. **Input Validation:** Validasi email, password, full_name
2. **Email Check:** Cek apakah email sudah ada di Supabase `users` table
3. **Firebase User Creation:** Buat user di Firebase Auth
4. **Supabase User Creation:** Insert user data ke `users` table dengan:
   - email, full_name, firebase_uid, role='admin'
   - email_verified, provider, timestamps
5. **Response:** Return user data tanpa sensitive info

**Database Tables:** `users` (public schema)

### 2. POST /auth/firebase/login
**Purpose:** Login admin via Firebase token

**Data Flow:**
1. **Token Verification:** Verifikasi Firebase ID token dengan Firebase Admin SDK
2. **User Lookup:** Cari user berdasarkan `firebase_uid` di Supabase
3. **User Creation (if not exists):** Jika user belum ada, buat di Supabase
4. **Last Login Update:** Update `last_login_at` di database
5. **Redis Cache:** Simpan mapping Firebase UID ke user ID (TTL 7 hari)
6. **Response:** Return user data dan Firebase info

**Database Tables:** `users` (public schema)
**Cache:** Redis `firebase_uid:{uid}`

### 3. GET /auth/firebase/verify/:token
**Purpose:** Verifikasi Firebase token

**Data Flow:**
1. **Token Verification:** Verifikasi token dengan Firebase
2. **User Lookup:** Cari user berdasarkan Firebase UID
3. **Response:** Return verification status dan user data

**Database Tables:** `users` (public schema)

### 4. POST /auth/logout
**Purpose:** Logout user

**Data Flow:**
1. **Token Extraction:** Ambil access token dari header
2. **Token Blacklist:** Tambahkan token ke Redis blacklist (TTL sesuai token expiry)
3. **Response:** Success message

**Cache:** Redis blacklist `blacklist:{token}`

### 5. POST /auth/refresh
**Purpose:** Refresh access token

**Data Flow:**
1. **Refresh Token Validation:** Validasi refresh token dari Redis
2. **User Lookup:** Cari user data dari database
3. **New Token Generation:** Generate access token dan refresh token baru
4. **Redis Update:** Update refresh token di Redis
5. **Response:** Return new tokens

**Database Tables:** `users` (public schema)
**Cache:** Redis `refresh_token:{userId}`

## Legacy Endpoints (Deprecated)
- POST /auth/register (menggunakan password_hash yang tidak ada di schema)
- POST /auth/login (menggunakan password_hash)
- GET /auth/me

**Note:** Gunakan Firebase auth endpoints untuk implementasi saat ini.

## Error Handling
- Zod validation errors untuk input validation
- Firebase auth errors untuk token verification
- Supabase errors untuk database operations
- Redis errors (non-blocking, logged only)

## Security Features
- Firebase token verification
- JWT token generation dengan expiration
- Redis token blacklist untuk logout
- Role-based access (admin only)
- Password strength validation (untuk legacy)

## Dependencies
- Firebase Admin SDK untuk auth
- Supabase untuk data persistence
- Redis untuk caching dan token management
- Zod untuk validation