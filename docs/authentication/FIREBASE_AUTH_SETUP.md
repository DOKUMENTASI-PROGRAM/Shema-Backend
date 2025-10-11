# Firebase Authentication Setup Guide

> **Quick Reference**: Setup Firebase Auth untuk Admin Dashboard Shema Music

---

## 🎯 Objective

Setup Firebase Authentication **ONLY for Admin** dashboard access with forgot password feature.

**WHO needs Firebase**:
- ✅ Admin (dashboard access)
- ❌ Students (public form only)
- ❌ Instructors (managed by admin)

---

## 📋 Prerequisites

- [ ] Firebase account (free)
- [ ] Node.js project (Hono.js backend + frontend)
- [ ] Supabase database already setup

---

## 🔧 Step 1: Create Firebase Project

### 1.1 Go to Firebase Console
```
https://console.firebase.google.com/
```

### 1.2 Create New Project
- Project name: `shema-music`
- Enable Google Analytics: Optional
- Choose default account

### 1.3 Enable Authentication
1. Go to **Build** → **Authentication**
2. Click **Get started**
3. Click **Sign-in method** tab
4. Enable **Email/Password**
5. ✅ Email/Password: **Enabled**
6. ❌ Email link (passwordless): Disabled

### 1.4 Configure Authorized Domains
1. Go to **Authentication** → **Settings** → **Authorized domains**
2. Add your domains:
   - `localhost` (already added)
   - `shemamusic.com` (your production domain)
   - `admin.shemamusic.com` (admin subdomain)

---

## 🔑 Step 2: Get Firebase Credentials

### 2.1 Frontend Credentials (Public)
1. Go to **Project settings** (⚙️ icon)
2. Scroll to **Your apps** section
3. Click **Add app** → **Web** (</> icon)
4. App nickname: `shema-music-admin-dashboard`
5. ❌ Don't check "Also set up Firebase Hosting"
6. Click **Register app**
7. **Copy the config object**:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "shema-music.firebaseapp.com",
  projectId: "shema-music",
  storageBucket: "shema-music.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdefghijklmnop"
};
```

### 2.2 Backend Credentials (Private)
1. Go to **Project settings** → **Service accounts**
2. Click **Generate new private key**
3. Click **Generate key** (downloads JSON file)
4. **Keep this file SECRET** (add to .gitignore)

JSON content example:
```json
{
  "type": "service_account",
  "project_id": "shema-music",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@shema-music.iam.gserviceaccount.com",
  "client_id": "123456789012345678901",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
}
```

---

## 💻 Step 3: Backend Integration

### 3.1 Install Firebase Admin SDK
```bash
cd services/auth
npm install firebase-admin
```

### 3.2 Add Environment Variables
```env
# services/auth/.env
FIREBASE_PROJECT_ID=shema-music
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@shema-music.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
```

⚠️ **Important**: Wrap private key in quotes and keep `\n` characters

### 3.3 Initialize Firebase Admin
```typescript
// services/auth/src/config/firebase-admin.ts
import admin from 'firebase-admin'

// Initialize only once
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    })
  })
}

export default admin
```

### 3.4 Create Token Verification Middleware
```typescript
// services/auth/src/middleware/verify-firebase-token.ts
import { Context, Next } from 'hono'
import admin from '../config/firebase-admin'

export async function verifyFirebaseToken(c: Context, next: Next) {
  try {
    // Extract token from Authorization header
    const authHeader = c.req.header('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ error: 'Missing or invalid Authorization header' }, 401)
    }

    const idToken = authHeader.substring(7) // Remove "Bearer "

    // Verify token with Firebase Admin SDK
    const decodedToken = await admin.auth().verifyIdToken(idToken)

    // Attach to context for use in route handlers
    c.set('firebaseUser', {
      uid: decodedToken.uid,
      email: decodedToken.email,
      email_verified: decodedToken.email_verified
    })

    await next()
  } catch (error) {
    console.error('Firebase token verification failed:', error)
    return c.json({ 
      error: 'Invalid or expired token',
      code: 'AUTH_TOKEN_INVALID'
    }, 401)
  }
}
```

### 3.5 Implement Admin Login Endpoint
```typescript
// services/auth/src/routes/admin-auth.ts
import { Hono } from 'hono'
import { verifyFirebaseToken } from '../middleware/verify-firebase-token'
import { supabase } from '../config/supabase'

const router = new Hono()

// Admin Login - Verify Firebase token and return user data
router.post('/login', verifyFirebaseToken, async (c) => {
  const firebaseUser = c.get('firebaseUser')

  try {
    // Check if user exists in Supabase
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('firebase_uid', firebaseUser.uid)
      .eq('role', 'admin')
      .single()

    if (error || !user) {
      return c.json({
        error: 'Admin account not found',
        code: 'ADMIN_NOT_FOUND'
      }, 404)
    }

    // Update last login
    await supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id)

    return c.json({
      success: true,
      data: {
        user_id: user.id,
        firebase_uid: user.firebase_uid,
        full_name: user.full_name,
        email: user.email,
        role: user.role
      }
    })
  } catch (error) {
    console.error('Admin login error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Get current admin info
router.get('/me', verifyFirebaseToken, async (c) => {
  const firebaseUser = c.get('firebaseUser')

  const { data: user } = await supabase
    .from('users')
    .select('id, full_name, email, role, firebase_uid')
    .eq('firebase_uid', firebaseUser.uid)
    .single()

  if (!user) {
    return c.json({ error: 'User not found' }, 404)
  }

  return c.json({ success: true, data: user })
})

export default router
```

### 3.6 Register Routes
```typescript
// services/auth/src/index.ts
import { Hono } from 'hono'
import adminAuthRoutes from './routes/admin-auth'

const app = new Hono()

app.route('/api/auth/admin', adminAuthRoutes)

export default {
  port: process.env.PORT || 3001,
  fetch: app.fetch
}
```

---

## 🎨 Step 4: Frontend Integration (Admin Dashboard)

### 4.1 Install Firebase SDK
```bash
cd frontend/admin-dashboard
npm install firebase
```

### 4.2 Add Environment Variables
```env
# frontend/admin-dashboard/.env
VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_FIREBASE_AUTH_DOMAIN=shema-music.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=shema-music
VITE_FIREBASE_STORAGE_BUCKET=shema-music.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdefghijklmnop

# Backend API
VITE_API_URL=http://localhost:3000
```

### 4.3 Initialize Firebase
```typescript
// frontend/admin-dashboard/src/config/firebase.ts
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app)
export default app
```

### 4.4 Create Auth Service
```typescript
// frontend/admin-dashboard/src/services/auth.service.ts
import { 
  signInWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  User 
} from 'firebase/auth'
import { auth } from '../config/firebase'

const API_URL = import.meta.env.VITE_API_URL

export class AuthService {
  // Admin Login
  static async login(email: string, password: string) {
    try {
      // 1. Sign in with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      // 2. Get Firebase ID token
      const idToken = await user.getIdToken()

      // 3. Call backend to get user profile
      const response = await fetch(`${API_URL}/api/auth/admin/login`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Login failed')
      }

      const data = await response.json()

      return {
        success: true,
        user: data.data,
        firebaseUser: user,
        idToken
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  // Logout
  static async logout() {
    try {
      await signOut(auth)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  // Forgot Password
  static async sendPasswordReset(email: string) {
    try {
      await sendPasswordResetEmail(auth, email)
      return { 
        success: true, 
        message: 'Password reset email sent. Please check your inbox.' 
      }
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message 
      }
    }
  }

  // Get current user
  static getCurrentUser(): User | null {
    return auth.currentUser
  }

  // Get current ID token
  static async getIdToken(): Promise<string | null> {
    const user = auth.currentUser
    if (!user) return null
    return await user.getIdToken()
  }
}
```

### 4.5 Create Login Page
```typescript
// frontend/admin-dashboard/src/pages/Login.tsx
import { useState } from 'react'
import { AuthService } from '../services/auth.service'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await AuthService.login(email, password)

    if (result.success) {
      // Store user data in localStorage or context
      localStorage.setItem('admin_user', JSON.stringify(result.user))
      navigate('/dashboard')
    } else {
      setError(result.error || 'Login failed')
    }

    setLoading(false)
  }

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email first')
      return
    }

    const result = await AuthService.sendPasswordReset(email)
    if (result.success) {
      alert('Password reset email sent! Check your inbox.')
    } else {
      setError(result.error || 'Failed to send reset email')
    }
  }

  return (
    <div className="login-container">
      <h1>Admin Login</h1>
      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? 'Loading...' : 'Login'}
        </button>
      </form>
      <button onClick={handleForgotPassword} className="forgot-password">
        Forgot Password?
      </button>
    </div>
  )
}
```

---

## ✅ Step 5: Testing

### 5.1 Create Test Admin Account

**Option A: Via Firebase Console**
1. Go to **Authentication** → **Users**
2. Click **Add user**
3. Email: `admin@shemamusic.com`
4. Password: Generate or enter
5. Click **Add user**
6. **Manually add to Supabase**:

```sql
INSERT INTO users (id, firebase_uid, full_name, email, role, email_verified)
VALUES (
  gen_random_uuid(),
  'COPY_FIREBASE_UID_HERE', -- Get from Firebase Console
  'Admin Shema Music',
  'admin@shemamusic.com',
  'admin',
  true
);
```

**Option B: Via Code (Recommended)**
```typescript
// Create script: scripts/create-admin.ts
import admin from 'firebase-admin'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function createAdmin() {
  try {
    // 1. Create Firebase user
    const firebaseUser = await admin.auth().createUser({
      email: 'admin@shemamusic.com',
      password: 'SecurePassword123!',
      emailVerified: true
    })

    console.log('✅ Firebase user created:', firebaseUser.uid)

    // 2. Create Supabase user
    const { data, error } = await supabase
      .from('users')
      .insert({
        firebase_uid: firebaseUser.uid,
        full_name: 'Admin Shema Music',
        email: 'admin@shemamusic.com',
        role: 'admin',
        email_verified: true
      })
      .select()
      .single()

    if (error) throw error

    console.log('✅ Supabase user created:', data.id)
    console.log('\n🎉 Admin account created successfully!')
    console.log('Email:', 'admin@shemamusic.com')
    console.log('Password:', 'SecurePassword123!')
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

createAdmin()
```

Run script:
```bash
tsx scripts/create-admin.ts
```

### 5.2 Test Login Flow
1. Open admin dashboard: `http://localhost:5173/login`
2. Enter email: `admin@shemamusic.com`
3. Enter password: `SecurePassword123!`
4. Click **Login**
5. Should redirect to dashboard
6. Check browser console for Firebase token
7. Check Network tab for `/api/auth/admin/login` request

### 5.3 Test Forgot Password
1. Click **Forgot Password?**
2. Enter email: `admin@shemamusic.com`
3. Click **Send Reset Email**
4. Check email inbox
5. Click reset link
6. Enter new password
7. Try login with new password

---

## 🐛 Troubleshooting

### Error: "Firebase: Error (auth/invalid-api-key)"
**Solution**: Check `.env` file has correct `VITE_FIREBASE_API_KEY`

### Error: "Firebase Admin SDK: Failed to parse private key"
**Solution**: Wrap private key in quotes and ensure `\n` characters are preserved:
```env
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
```

### Error: "Admin account not found"
**Solution**: Make sure admin user exists in Supabase `users` table with:
- `firebase_uid` matching Firebase
- `role = 'admin'`

### Error: "Token expired"
**Solution**: Firebase tokens expire after 1 hour. Frontend should automatically refresh:
```typescript
// Add token refresh logic
auth.currentUser?.getIdToken(true) // Force refresh
```

### Error: "CORS error when calling backend"
**Solution**: Add CORS middleware in backend:
```typescript
import { cors } from 'hono/cors'

app.use('/api/*', cors({
  origin: ['http://localhost:5173'],
  credentials: true
}))
```

---

## 📚 Additional Resources

- [Firebase Auth Documentation](https://firebase.google.com/docs/auth)
- [Firebase Admin SDK Documentation](https://firebase.google.com/docs/admin/setup)
- [Firebase Security Rules](https://firebase.google.com/docs/rules)
- [Firebase Pricing](https://firebase.google.com/pricing) - Free tier details

---

## ✅ Checklist

- [ ] Firebase project created
- [ ] Email/Password authentication enabled
- [ ] Frontend config copied to `.env`
- [ ] Backend service account JSON downloaded
- [ ] Backend environment variables set
- [ ] Firebase Admin SDK initialized
- [ ] Token verification middleware created
- [ ] Admin login endpoint implemented
- [ ] Frontend Firebase SDK installed
- [ ] Auth service created in frontend
- [ ] Login page created
- [ ] Test admin account created
- [ ] Login flow tested successfully
- [ ] Forgot password tested successfully
- [ ] Token refresh working
- [ ] CORS configured

---

**Last Updated**: October 9, 2025  
**Version**: 1.0  
**Status**: ✅ Production Ready
