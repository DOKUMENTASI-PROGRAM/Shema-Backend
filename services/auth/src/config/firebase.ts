/**
 * Firebase Admin SDK Configuration
 * 
 * Project: Les-Music
 * Project ID: les-music
 * Project Number: 895694152443
 * 
 * Used for:
 * - Verifying Firebase ID tokens from frontend
 * - Managing users (admin only)
 * - Custom claims for role-based access
 */

import admin from 'firebase-admin'
import { readFileSync } from 'fs'
import { join } from 'path'

let firebaseApp: admin.app.App | null = null

/**
 * Initialize Firebase Admin SDK
 */
export function initializeFirebase(): admin.app.App | null {
  if (firebaseApp) {
    return firebaseApp
  }

  // Load service account from file
  const serviceAccountPath = join(__dirname, '../../config/firebase-service-account.json')

  try {
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf-8'))

    // Initialize Firebase Admin
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: 'les-music'
    })

    console.log('✅ Firebase Admin SDK initialized successfully')
    console.log(`   Project ID: ${serviceAccount.project_id}`)
    console.log(`   Client Email: ${serviceAccount.client_email}`)

    return firebaseApp
  } catch (error) {
    console.warn('⚠️  Firebase service account file not found, Firebase auth disabled')
    console.warn('   Path checked:', serviceAccountPath)
    console.warn('   This is normal for development/testing without Firebase setup')
    console.warn('   Error:', error.message)
    return null
  }
}

/**
 * Get Firebase Admin Auth instance
 */
export function getFirebaseAuth(): admin.auth.Auth {
  if (!firebaseApp) {
    initializeFirebase()
  }
  return admin.auth()
}

/**
 * Get Firebase Admin Firestore instance (if needed)
 */
export function getFirestore(): admin.firestore.Firestore {
  if (!firebaseApp) {
    initializeFirebase()
  }
  return admin.firestore()
}

/**
 * Verify Firebase ID token
 * @param idToken - Firebase ID token from client
 * @returns Decoded token with user info
 */
export async function verifyFirebaseToken(idToken: string) {
  try {
    const auth = getFirebaseAuth()
    const decodedToken = await auth.verifyIdToken(idToken)
    
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
      role: decodedToken.role as string | undefined, // Custom claim
      provider: decodedToken.firebase.sign_in_provider
    }
  } catch (error: any) {
    if (error.code === 'auth/id-token-expired') {
      throw new Error('AUTH_FIREBASE_TOKEN_EXPIRED')
    } else if (error.code === 'auth/argument-error') {
      throw new Error('AUTH_FIREBASE_TOKEN_INVALID')
    }
    throw new Error('AUTH_FIREBASE_TOKEN_VERIFICATION_FAILED')
  }
}

/**
 * Create Firebase user (admin only)
 * @param email - User email
 * @param password - User password
 * @param displayName - User full name
 * @param role - User role (admin)
 */
export async function createFirebaseUser(
  email: string,
  password: string,
  displayName: string,
  role: 'admin' = 'admin'
) {
  try {
    const auth = getFirebaseAuth()
    
    // Create user
    const userRecord = await auth.createUser({
      email,
      password,
      displayName,
      emailVerified: false
    })

    // Set custom claims for role
    await auth.setCustomUserClaims(userRecord.uid, { role })

    // Send email verification
    const link = await auth.generateEmailVerificationLink(email)
    console.log(`📧 Email verification link: ${link}`)

    return {
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName,
      emailVerified: userRecord.emailVerified,
      role
    }
  } catch (error: any) {
    if (error.code === 'auth/email-already-exists') {
      throw new Error('AUTH_EMAIL_ALREADY_EXISTS')
    }
    throw error
  }
}

/**
 * Update Firebase user role
 * @param uid - Firebase UID
 * @param role - New role
 */
export async function updateFirebaseUserRole(uid: string, role: string) {
  const auth = getFirebaseAuth()
  await auth.setCustomUserClaims(uid, { role })
}

/**
 * Delete Firebase user
 * @param uid - Firebase UID
 */
export async function deleteFirebaseUser(uid: string) {
  const auth = getFirebaseAuth()
  await auth.deleteUser(uid)
}

/**
 * Get Firebase user by UID
 * @param uid - Firebase UID
 */
export async function getFirebaseUserByUid(uid: string) {
  const auth = getFirebaseAuth()
  return await auth.getUser(uid)
}

/**
 * Get Firebase user by email
 * @param email - User email
 */
export async function getFirebaseUserByEmail(email: string) {
  const auth = getFirebaseAuth()
  return await auth.getUserByEmail(email)
}

/**
 * Generate password reset link
 * @param email - User email
 */
export async function generatePasswordResetLink(email: string) {
  const auth = getFirebaseAuth()
  return await auth.generatePasswordResetLink(email)
}

// Export Firebase Admin for direct access if needed
export { admin }
