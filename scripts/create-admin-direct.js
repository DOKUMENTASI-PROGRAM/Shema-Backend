/**
 * Script untuk create admin user di Supabase secara langsung
 */
import 'dotenv/config'
import https from 'https'
import { createClient } from '@supabase/supabase-js'

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || 'AIzaSyAFHpjE_98GkEsyO6e8XsHfjPzQpf5f0uk'
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xlrwvzwpecprhgzfcqxw.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhscnd2endwZWNwcmhnemZjcXh3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTkxMzQwNCwiZXhwIjoyMDc1NDg5NDA0fQ.30-63oLLTrNhN0meFH3Zn5_oTOQ8KBbbHxgj_4ECDp4'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function getFirebaseUserInfo(idToken) {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`
  
  const data = JSON.stringify({ idToken })

  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      let body = ''
      res.on('data', (chunk) => { body += chunk })
      res.on('end', () => {
        try {
          const response = JSON.parse(body)
          if (response.error) {
            reject(new Error(response.error.message))
          } else {
            resolve(response.users?.[0])
          }
        } catch (error) {
          reject(error)
        }
      })
    })

    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

async function getFirebaseToken(email, password) {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`
  
  const data = JSON.stringify({
    email,
    password,
    returnSecureToken: true
  })

  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      let body = ''
      res.on('data', (chunk) => { body += chunk })
      res.on('end', () => {
        try {
          const response = JSON.parse(body)
          if (response.error) {
            reject(new Error(response.error.message))
          } else {
            resolve(response.idToken)
          }
        } catch (error) {
          reject(error)
        }
      })
    })

    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

async function main() {
  try {
    console.log('🔐 Getting Firebase token...')
    const idToken = await getFirebaseToken('k423@gmail.com', 'Kiana423')
    console.log('✅ Firebase token obtained')

    console.log('📋 Getting Firebase user info...')
    const firebaseUser = await getFirebaseUserInfo(idToken)
    console.log('✅ Firebase user info:', firebaseUser.email, 'UID:', firebaseUser.localId)

    // Check if user already exists in Supabase
    console.log('🔍 Checking if user exists in Supabase...')
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('firebase_uid', firebaseUser.localId)
      .maybeSingle()

    if (checkError) {
      console.error('❌ Error checking user:', checkError)
    }

    if (existingUser) {
      console.log('✅ User already exists in Supabase:', existingUser.id)
      console.log('   Email:', existingUser.email)
      console.log('   Role:', existingUser.role)
      return
    }

    // Create user in Supabase
    console.log('📝 Creating user in Supabase...')
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        firebase_uid: firebaseUser.localId,
        email: firebaseUser.email,
        full_name: 'Admin Kiana',
        role: 'admin'
      })
      .select()
      .single()

    if (createError) {
      console.error('❌ Error creating user:', createError)
      return
    }

    console.log('✅ User created successfully!')
    console.log('   ID:', newUser.id)
    console.log('   Email:', newUser.email)
    console.log('   Role:', newUser.role)

  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

main()
