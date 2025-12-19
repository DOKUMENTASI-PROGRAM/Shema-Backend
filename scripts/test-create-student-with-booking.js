/**
 * Test Script: Create Student with Auto-Booking
 * 
 * This script tests the updated POST /admin/students endpoint
 * which now creates both a booking (with status='confirmed') and a student record.
 */

import 'dotenv/config'
import https from 'https'

const ADMIN_SERVICE_URL = 'http://localhost:3002'
const API_GATEWAY_URL = 'http://localhost:3000'
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || 'AIzaSyAFHpjE_98GkEsyO6e8XsHfjPzQpf5f0uk'

// Test data - will be populated with real slot IDs from database
const testStudentData = {
  display_name: 'Test Student Auto Booking',
  email: `test.student.auto.${Date.now()}@example.com`,
  course_id: null, // Will be fetched from database
  // Required scheduling fields
  first_choice_slot_id: null, // Will be fetched from database
  second_choice_slot_id: null, // Will be fetched from database
  preferred_days: ['Monday', 'Wednesday', 'Friday'],
  preferred_time_range: { start: '14:00', end: '17:00' },
  // Optional fields
  experience_level: 'beginner',
  has_instrument: true,
  guardian_name: 'Test Guardian',
  guardian_wa_number: '081234567890',
  applicant_address: 'Jl. Test Address No. 123',
  applicant_birth_place: 'Jakarta',
  applicant_birth_date: '2010-05-15',
  applicant_school: 'SMP Test School',
  applicant_class: 8,
  notes: 'Created via test script for auto-booking feature'
}

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

async function getAdminToken() {
  console.log('🔐 Getting admin token via Firebase...')
  
  // Get Firebase token first
  const firebaseToken = await getFirebaseToken('k423@gmail.com', 'Kiana423')
  console.log('✅ Firebase token obtained')
  
  // Login to auth service (path without /api prefix for gateway)
  const response = await fetch(`${API_GATEWAY_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken: firebaseToken })
  })

  const text = await response.text()
  console.log('Auth response status:', response.status)
  
  let data
  try {
    data = JSON.parse(text)
  } catch (e) {
    throw new Error('Failed to parse auth response: ' + text.substring(0, 200))
  }
  
  if (!data.success || !data.data?.accessToken) {
    throw new Error('Failed to get admin token: ' + JSON.stringify(data))
  }

  console.log('✅ Admin session token obtained')
  return data.data.accessToken
}

async function getCourseId(token) {
  console.log('📚 Fetching available courses...')
  
  const response = await fetch(`${API_GATEWAY_URL}/courses`, {
    method: 'GET',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json' 
    }
  })

  const data = await response.json()
  const courses = data.data?.courses || data.data
  if (!data.success || !courses?.length) {
    throw new Error('No courses found: ' + JSON.stringify(data))
  }

  const course = courses[0]
  console.log(`✅ Using course: ${course.title} (${course.id})`)
  return course.id
}

async function getAvailableSlotIds(token) {
  console.log('📅 Fetching available schedule slots...')
  
  // Query class_schedules table directly via admin service or booking service
  const response = await fetch(`${API_GATEWAY_URL}/admin/schedules`, {
    method: 'GET',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json' 
    }
  })

  const data = await response.json()
  
  // If no schedules endpoint, use dummy UUIDs (for testing)
  if (!data.success || !data.data?.length) {
    console.log('⚠️ No schedules found, using generated UUIDs for testing')
    // Generate random UUIDs for testing
    const uuid1 = crypto.randomUUID()
    const uuid2 = crypto.randomUUID()
    return { first: uuid1, second: uuid2 }
  }

  const schedules = data.data
  console.log(`✅ Found ${schedules.length} schedule slots`)
  return { 
    first: schedules[0]?.id || crypto.randomUUID(), 
    second: schedules[1]?.id || schedules[0]?.id || crypto.randomUUID() 
  }
}

async function createStudentWithBooking(token, studentData) {
  console.log('\n📝 Creating student with auto-booking...')
  console.log('Request body:', JSON.stringify(studentData, null, 2))

  const response = await fetch(`${ADMIN_SERVICE_URL}/api/admin/students`, {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json' 
    },
    body: JSON.stringify(studentData)
  })

  const data = await response.json()
  console.log('\n📥 Response status:', response.status)
  console.log('Response body:', JSON.stringify(data, null, 2))

  return { status: response.status, data }
}

async function testDuplicateEmail(token, studentData) {
  console.log('\n🔄 Testing duplicate email prevention...')
  
  const response = await fetch(`${ADMIN_SERVICE_URL}/api/admin/students`, {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json' 
    },
    body: JSON.stringify(studentData)
  })

  const data = await response.json()
  console.log('📥 Duplicate test response status:', response.status)
  console.log('Response:', JSON.stringify(data, null, 2))

  if (response.status === 409 && data.error?.code === 'DUPLICATE_STUDENT') {
    console.log('✅ Duplicate prevention works correctly!')
    return true
  } else {
    console.log('❌ Duplicate prevention failed!')
    return false
  }
}

async function cleanupTestData(studentId, bookingId) {
  console.log('\n🧹 Cleaning up test data...')
  
  // Note: This would require direct database access or admin delete endpoints
  console.log(`   Would delete student: ${studentId}`)
  console.log(`   Would delete booking: ${bookingId}`)
  console.log('   (Cleanup skipped - run manually if needed)')
}

async function main() {
  console.log('=' .repeat(60))
  console.log('🧪 TEST: POST /admin/students with Auto-Booking')
  console.log('=' .repeat(60))

  try {
    // Step 1: Get admin token
    const token = await getAdminToken()

    // Step 2: Get a valid course ID
    const courseId = await getCourseId(token)
    testStudentData.course_id = courseId

    // Step 3: Get available slot IDs
    const slotIds = await getAvailableSlotIds(token)
    testStudentData.first_choice_slot_id = slotIds.first
    testStudentData.second_choice_slot_id = slotIds.second

    // Step 4: Create student with booking
    const { status, data } = await createStudentWithBooking(token, testStudentData)

    if (status === 201 && data.success) {
      console.log('\n✅ SUCCESS: Student and booking created!')
      console.log('   Student ID:', data.data.student.id)
      console.log('   Booking ID:', data.data.booking.id)
      console.log('   Booking Status:', data.data.booking.status)

      // Verify booking status is 'confirmed'
      if (data.data.booking.status === 'confirmed') {
        console.log('✅ Booking status is correctly set to "confirmed"')
      } else {
        console.log('❌ Booking status is NOT "confirmed":', data.data.booking.status)
      }

      // Verify student has booking_id
      if (data.data.student.booking_id === data.data.booking.id) {
        console.log('✅ Student is correctly linked to booking')
      } else {
        console.log('❌ Student is NOT linked to booking correctly')
      }

      // Step 4: Test duplicate prevention
      await testDuplicateEmail(token, testStudentData)

      // Step 5: Cleanup (optional)
      // await cleanupTestData(data.data.student.id, data.data.booking.id)

    } else {
      console.log('\n❌ FAILED: Could not create student')
      console.log('   Error:', data.error)
    }

  } catch (error) {
    console.error('\n❌ TEST ERROR:', error.message)
    console.error(error)
  }

  console.log('\n' + '=' .repeat(60))
  console.log('🏁 Test completed')
  console.log('=' .repeat(60))
}

main()
