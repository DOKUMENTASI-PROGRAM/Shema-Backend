/**
 * Register admin user to Supabase
 */
import 'dotenv/config'
import https from 'https'

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || 'AIzaSyAFHpjE_98GkEsyO6e8XsHfjPzQpf5f0uk'
const API_GATEWAY_URL = 'http://localhost:3000'

async function getFirebaseToken(email, password) {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`
  
  const data = JSON.stringify({
    email: email,
    password: password,
    returnSecureToken: true
  })

  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
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
    console.log('🔐 Getting Firebase token for admin...')
    const firebaseToken = await getFirebaseToken('k423@gmail.com', 'Kiana423')
    console.log('✅ Firebase token obtained')

    console.log('📝 Registering admin to Supabase...')
    const response = await fetch(`${API_GATEWAY_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idToken: firebaseToken,
        full_name: 'Admin Kiana',
        role: 'admin'
      })
    })

    const data = await response.json()
    console.log('Response:', JSON.stringify(data, null, 2))

    if (data.success) {
      console.log('✅ Admin registered successfully!')
    } else {
      console.log('⚠️ Registration response:', data)
    }
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

main()
