/**
 * E2E Testing Script for Shema Music Platform
 * Tests the complete flow of student course registration and admin management
 */

const axios = require('axios');
const { randomUUID } = require('crypto');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost';
const API_GATEWAY_PORT = process.env.API_GATEWAY_PORT || '3000';

// Test data
const TEST_STUDENT = {
  full_name: 'Test Student',
  wa_number: '+6281234567890',
  email: `test.student.${Date.now()}@example.com`,
  experience_level: 'beginner',
  time_preferences: 'Learn basic guitar chords',
  preferred_days: ['Monday', 'Wednesday'],
  preferred_time_range: {
    start: '14:00',
    end: '16:00'
  },
  guardian: {
    name: 'Test Guardian',
    wa_number: '+6281234567891'
  },
  instrument_owned: false,
  notes: 'Eager to learn music',
  referral_source: 'website',
  consent: true,
  captcha_token: 'test-captcha-token',
  idempotency_key: randomUUID()
};

const ADMIN_CREDENTIALS = {
  email: 'admin@shemamusic.com',
  password: 'Admin123!'
};

// Utility functions
async function makeRequest(method, url, data = null, headers = {}) {
  try {
    const config = {
      method,
      url,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      data
    };

    console.log(`\n[${method}] ${url}`);
    if (data) console.log('Request:', JSON.stringify(data, null, 2));

    const response = await axios(config);

    console.log(`Response (${response.status}):`, JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error(`Error [${method}] ${url}:`, error.response?.data || error.message);
    if (error.response?.data?.error?.details) {
      console.error('Validation details:', JSON.stringify(error.response.data.error.details, null, 2));
    }
    throw error;
  }
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test functions
async function getAvailableCourses() {
  console.log('\n=== Getting Available Courses ===');
  const courses = await makeRequest('GET', `${BASE_URL}:${API_GATEWAY_PORT}/api/courses`);
  return courses.data.courses;
}

async function registerStudentForCourse(courseId) {
  console.log('\n=== Student Course Registration ===');

  const registrationData = {
    ...TEST_STUDENT,
    course_id: courseId
  };

  const result = await makeRequest('POST', `${BASE_URL}:${API_GATEWAY_PORT}/api/booking/register-course`, registrationData);
  return result.data;
}

async function adminLogin() {
  console.log('\n=== Admin Login ===');

  const result = await makeRequest('POST', `${BASE_URL}:${API_GATEWAY_PORT}/api/auth/login`, ADMIN_CREDENTIALS);
  return result.data;
}

async function adminGetBookings(accessToken) {
  console.log('\n=== Admin Get All Bookings ===');

  const result = await makeRequest('GET', `${BASE_URL}:${API_GATEWAY_PORT}/api/bookings`, null, {
    'Authorization': `Bearer ${accessToken}`
  });
  return result.data;
}

async function adminUpdateBookingStatus(accessToken, bookingId, status, scheduleData = null) {
  console.log(`\n=== Admin Update Booking ${status ? 'Status to ' + status : 'Schedule'} ===`);

  const updateData = {};
  if (status) {
    updateData.status = status;
  }
  if (scheduleData) {
    updateData.preferred_days = scheduleData.preferred_days;
    updateData.preferred_time_range = scheduleData.preferred_time_range;
  }

  const result = await makeRequest('PUT', `${BASE_URL}:${API_GATEWAY_PORT}/api/bookings/${bookingId}`, updateData, {
    'Authorization': `Bearer ${accessToken}`
  });
  return result.data;
}

async function adminConfirmBooking(accessToken, bookingId) {
  console.log('\n=== Admin Confirm Booking ===');

  const result = await makeRequest('POST', `${BASE_URL}:${API_GATEWAY_PORT}/api/bookings/${bookingId}/confirm`, {}, {
    'Authorization': `Bearer ${accessToken}`
  });
  return result.data;
}

// Main test flow
async function runE2ETest() {
  try {
    console.log('🚀 Starting E2E Test for Shema Music Platform');
    console.log('=' .repeat(50));

    // Step 1: Get available courses
    const courses = await getAvailableCourses();
    if (!courses || courses.length === 0) {
      throw new Error('No courses available for testing');
    }

    const testCourse = courses[0];
    console.log(`Selected course for testing: ${testCourse.title} (ID: ${testCourse.id})`);

    // Step 2: Student registers for course
    const booking = await registerStudentForCourse(testCourse.id);
    console.log(`Student registration successful. Booking ID: ${booking.id}`);

    // Wait a moment for data to propagate
    await delay(2000);

    // Step 3: Admin login
    const adminAuth = await adminLogin();
    const accessToken = adminAuth.accessToken;
    console.log(`Admin login successful. Token received.`);

    // Step 4: Admin views all bookings
    const bookings = await adminGetBookings(accessToken);
    console.log(`Found ${bookings.length} total bookings`);

    // Find the test booking
    const testBooking = bookings.find(b => b.id === booking.id);
    if (!testBooking) {
      throw new Error('Test booking not found in admin view');
    }
    console.log(`Test booking found: Status = ${testBooking.status}`);

    // Step 5: Admin updates booking status and assigns schedule
    const scheduleData = {
      preferred_days: ['Tuesday', 'Thursday'],
      preferred_time_range: {
        start: '15:00',
        end: '17:00'
      }
    };

    await adminUpdateBookingStatus(accessToken, testBooking.id, null, scheduleData);
    console.log('Booking schedule updated');

    // Step 6: Admin confirms the booking
    await adminConfirmBooking(accessToken, testBooking.id);
    console.log('Booking confirmed successfully');

    // Step 7: Verify final status
    const updatedBookings = await adminGetBookings(accessToken);
    const finalBooking = updatedBookings.find(b => b.id === booking.id);
    console.log(`Final booking status: ${finalBooking.status}`);

    console.log('\n✅ E2E Test Completed Successfully!');
    console.log('=' .repeat(50));

  } catch (error) {
    console.error('\n❌ E2E Test Failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  runE2ETest();
}

module.exports = { runE2ETest };