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
  email: `test.student.${Date.now()}@example.com`,
  address: 'Jl. Test No. 123, Jakarta',
  birth_place: 'Jakarta',
  birth_date: '2010-05-15',
  school: 'SMA Test School',
  class: 10,
  guardian_name: 'Test Guardian',
  guardian_wa_number: '+6281234567891',
  experience_level: 'beginner',
  preferred_days: ['Monday', 'Wednesday'],
  preferred_time_range: {
    start: '14:00',
    end: '16:00'
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
  return result.data.booking;
}

async function adminLogin() {
  console.log('\n=== Admin Login ===');

  const result = await makeRequest('POST', `${BASE_URL}:${API_GATEWAY_PORT}/api/auth/login`, ADMIN_CREDENTIALS);
  return result.data;
}

async function adminGetBookings(accessToken) {
  console.log('\n=== Admin Get All Bookings ===');

  const result = await makeRequest('GET', `${BASE_URL}:${API_GATEWAY_PORT}/api/booking/bookings`, null, {
    'Authorization': `Bearer ${accessToken}`
  });
  return result;
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

  const result = await makeRequest('PUT', `${BASE_URL}:${API_GATEWAY_PORT}/api/booking/bookings/${bookingId}`, updateData, {
    'Authorization': `Bearer ${accessToken}`
  });
  return result.data;
}

async function adminConfirmBooking(accessToken, bookingId) {
  console.log('\n=== Admin Confirm Booking ===');

  const result = await makeRequest('POST', `${BASE_URL}:${API_GATEWAY_PORT}/api/booking/${bookingId}/confirm`, {}, {
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
    console.log('Booking object:', JSON.stringify(booking, null, 2));
    const bookingId = booking.id;
    console.log(`Student registration successful. Booking ID: ${bookingId}`);

    // Wait a moment for data to propagate
    await delay(2000);

    // Step 3: Admin login
    const adminAuth = await adminLogin();
    const accessToken = adminAuth.accessToken;
    console.log(`Admin login successful. Token received.`);

    // Step 4: Admin views all bookings
    const bookingsResponse = await adminGetBookings(accessToken);
    console.log('bookingsResponse:', bookingsResponse);
    const bookings = Array.isArray(bookingsResponse) ? bookingsResponse : (bookingsResponse.data.bookings || bookingsResponse.data);
    console.log(`Found ${bookings.length} total bookings`);

    // Find the test booking
    const testBooking = bookings.find(b => b.id === bookingId);
    console.log(`Looking for booking with ID: ${bookingId}`);
    console.log(`First few booking IDs: ${bookings.slice(0, 5).map(b => b.id).join(', ')}`);
    if (!testBooking) {
      throw new Error('Test booking not found in admin view');
    }
    console.log(`Test booking found: Status = ${testBooking.status}`);

    // Step 5: Admin confirms the booking
    await adminConfirmBooking(accessToken, testBooking.id);
    console.log('Booking confirmed successfully');

    // Step 5: Verify final status
    const updatedBookingsResponse = await adminGetBookings(accessToken);
    const updatedBookings = Array.isArray(updatedBookingsResponse) ? updatedBookingsResponse : (updatedBookingsResponse.data.bookings || updatedBookingsResponse.data);
    const finalBooking = updatedBookings.find(b => b.id === bookingId);
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