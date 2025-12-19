/**
 * Test script for PUT /admin/students/:id endpoint
 * Tests updating student and related booking data
 */

import 'dotenv/config'
import https from 'https'

const BASE_URL = 'http://localhost:3000';
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || 'AIzaSyAFHpjE_98GkEsyO6e8XsHfjPzQpf5f0uk'

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

async function adminLogin() {
  console.log('🔐 Getting admin token via Firebase...');
  
  // Get Firebase token first
  const firebaseToken = await getFirebaseToken('k423@gmail.com', 'Kiana423')
  console.log('✅ Firebase token obtained');
  
  // Login to auth service
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken: firebaseToken })
  });
  
  const data = await response.json();
  if (!data.success || !data.data?.accessToken) {
    throw new Error(`Login failed: ${JSON.stringify(data)}`);
  }
  console.log('✅ Login successful');
  return data.data.accessToken;
}

async function getExistingStudent(token) {
  console.log('\n📋 Fetching existing students...');
  const response = await fetch(`${BASE_URL}/admin/students`, {
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  if (!data.success || !data.data || data.data.length === 0) {
    throw new Error('No students found');
  }
  
  // Find a student with booking_id
  const studentWithBooking = data.data.find(s => s.booking_id);
  if (studentWithBooking) {
    console.log(`✅ Found student with booking: ${studentWithBooking.display_name} (ID: ${studentWithBooking.id})`);
    console.log(`   Booking ID: ${studentWithBooking.booking_id}`);
    return studentWithBooking;
  }
  
  // If no student with booking, return first student
  console.log(`⚠️  No student with booking found, using first student: ${data.data[0].display_name}`);
  return data.data[0];
}

async function getAvailableSlotIds(token) {
  console.log('\n📅 Fetching available slot IDs...');
  const response = await fetch(`${BASE_URL}/admin/schedules`, {
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  if (data.success && data.data && data.data.length >= 2) {
    console.log(`✅ Found ${data.data.length} schedule slots`);
    return {
      first_choice_slot_id: data.data[0].id,
      second_choice_slot_id: data.data[1].id
    };
  }
  
  // Fallback: try to get from course schedules
  const courseResponse = await fetch(`${BASE_URL}/admin/courses`, {
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  const courseData = await courseResponse.json();
  if (courseData.success && courseData.data && courseData.data.length > 0) {
    const course = courseData.data[0];
    const scheduleResponse = await fetch(`${BASE_URL}/course/courses/${course.id}/schedules`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const scheduleData = await scheduleResponse.json();
    if (scheduleData.success && scheduleData.data && scheduleData.data.length >= 2) {
      console.log(`✅ Found ${scheduleData.data.length} course schedule slots`);
      return {
        first_choice_slot_id: scheduleData.data[0].id,
        second_choice_slot_id: scheduleData.data[1].id
      };
    }
  }
  
  throw new Error('Could not find available slot IDs');
}

async function testUpdateStudent(token, studentId, hasBooking) {
  console.log('\n📝 Testing PUT /admin/students/:id...');
  
  const slotIds = await getAvailableSlotIds(token);
  
  // Update data - testing both student and booking fields
  const updateData = {
    // Student fields
    display_name: `Updated Student ${Date.now()}`,
    level: 'intermediate',
    highlight_quote: 'Updated quote for testing',
    
    // Booking fields (will only update if student has booking_id)
    first_choice_slot_id: slotIds.first_choice_slot_id,
    second_choice_slot_id: slotIds.second_choice_slot_id,
    preferred_days: ['Tuesday', 'Thursday', 'Saturday'],
    preferred_time_range: { start: '10:00', end: '13:00' },
    guardian_name: 'Updated Guardian Name',
    guardian_wa_number: '082345678901',
    notes: 'Updated via test script'
  };

  console.log('📤 Update payload:', JSON.stringify(updateData, null, 2));

  const response = await fetch(`${BASE_URL}/admin/students/${studentId}`, {
    method: 'PUT',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updateData)
  });

  const data = await response.json();
  console.log('\n📥 Response:', JSON.stringify(data, null, 2));

  if (!data.success) {
    throw new Error(`Update failed: ${JSON.stringify(data.error)}`);
  }

  console.log('\n✅ UPDATE TEST PASSED!');
  console.log('───────────────────────────────────────');
  console.log(`✅ Student ID: ${data.data.student?.id}`);
  console.log(`✅ Updated display_name: ${data.data.student?.display_name}`);
  console.log(`✅ Updated level: ${data.data.student?.level}`);
  console.log(`✅ Updated highlight_quote: ${data.data.student?.highlight_quote}`);
  
  if (data.data.booking) {
    console.log('───────────────────────────────────────');
    console.log('📦 BOOKING ALSO UPDATED:');
    console.log(`✅ Booking ID: ${data.data.booking.id}`);
    console.log(`✅ preferred_days: ${JSON.stringify(data.data.booking.preferred_days)}`);
    console.log(`✅ preferred_time_range: ${JSON.stringify(data.data.booking.preferred_time_range)}`);
    console.log(`✅ guardian_name: ${data.data.booking.guardian_name}`);
    console.log(`✅ first_choice_slot_id: ${data.data.booking.first_choice_slot_id}`);
    console.log(`✅ second_choice_slot_id: ${data.data.booking.second_choice_slot_id}`);
  } else if (hasBooking) {
    console.log('⚠️  Warning: Student has booking_id but booking was not updated');
  } else {
    console.log('ℹ️  No booking to update (student has no booking_id)');
  }
  
  console.log('───────────────────────────────────────');
  console.log(`✅ Booking updated: ${data.meta?.bookingUpdated ? 'Yes' : 'No'}`);
  console.log(`✅ Message: ${data.meta?.message}`);

  return data;
}

async function main() {
  console.log('═══════════════════════════════════════');
  console.log('  TEST: PUT /admin/students/:id');
  console.log('  (Update Student and Booking)');
  console.log('═══════════════════════════════════════\n');

  try {
    const token = await adminLogin();
    const student = await getExistingStudent(token);
    await testUpdateStudent(token, student.id, !!student.booking_id);
    
    console.log('\n═══════════════════════════════════════');
    console.log('  🎉 ALL TESTS PASSED!');
    console.log('═══════════════════════════════════════');
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main();
