/**
 * Booking Service - Complete Integration Tests
 * Tests course registration endpoint using remote Supabase (production)
 */

import { supabase } from '../src/config/supabase';
import { redisClient } from '../src/config/redis';
import { v4 as uuidv4 } from 'uuid';

const BOOKING_SERVICE_URL = process.env.BOOKING_SERVICE_URL || 'http://localhost:3004';

describe('Booking Service - HTTP Integration Tests', () => {
  let testUserId: string;
  let testCourseId: string;
  let testBookingId: string;

  const testEmail = `test-booking-${Date.now()}@shema-music.com`;

  beforeAll(async () => {
    console.log('\n🔧 Setting up Booking Integration Tests...');
    console.log(`📍 Testing against: ${process.env.SUPABASE_URL}`);
    console.log(`🔗 Booking Service URL: ${BOOKING_SERVICE_URL}`);

    // Connect to Redis
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }

    // Create a test course for booking
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .insert({
        title: 'Test Piano Course',
        description: 'A test course for integration testing',
        instrument: 'piano',
        level: 'beginner',
        price: 500000,
        duration_minutes: 60,
        is_active: true
      })
      .select()
      .single();

    if (courseError) {
      console.error('Failed to create test course:', courseError);
      throw courseError;
    }

    testCourseId = course.id;
    console.log(`✅ Created test course: ${testCourseId}`);

    // Clean up any existing test data
    await supabase.from('bookings').delete().eq('user_id', testUserId);
    await supabase.from('users').delete().eq('email', testEmail);
  });

  afterAll(async () => {
    console.log('\n🧹 Cleaning up Booking test data...');

    // Clean up bookings
    if (testBookingId) {
      await supabase.from('bookings').delete().eq('id', testBookingId);
      console.log(`✅ Deleted test booking: ${testBookingId}`);
    }

    // Clean up user
    if (testUserId) {
      await supabase.from('student_profiles').delete().eq('user_id', testUserId);
      await supabase.from('users').delete().eq('id', testUserId);
      console.log(`✅ Deleted test user: ${testUserId}`);
    }

    // Clean up course
    if (testCourseId) {
      await supabase.from('courses').delete().eq('id', testCourseId);
      console.log(`✅ Deleted test course: ${testCourseId}`);
    }

    await redisClient.quit();
    console.log('✅ Booking tests cleanup complete\n');
  });

  describe('POST /api/bookings/register-course', () => {
    it('should register for a course successfully (new user)', async () => {
      const registrationData = {
        // Personal Information
        full_name: 'Test Student User',
        wa_number: '+6281234567890',
        email: testEmail,

        // Course Information
        course_id: testCourseId,

        // Preferences
        experience_level: 'beginner',
        time_preferences: 'Prefer afternoon sessions',
        preferred_days: ['monday', 'wednesday', 'friday'],
        preferred_time_range: {
          start: '14:00',
          end: '18:00'
        },
        start_date_target: '2025-11-01',

        // Guardian Information (optional for adults)
        guardian: {
          name: 'Test Guardian',
          wa_number: '+6281234567899'
        },

        // Additional Details
        instrument_owned: true,
        notes: 'Looking forward to learning piano',
        referral_source: 'instagram',

        // Consent & Security
        consent: true,
        captcha_token: 'test-captcha-token-' + Date.now(),
        idempotency_key: uuidv4()
      };

      const response = await fetch(`${BOOKING_SERVICE_URL}/api/bookings/register-course`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationData),
      });

      expect(response.status).toBe(201);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('booking');
      expect(data.data.booking.status).toBe('pending');
      expect(data.data.booking.course_id).toBe(testCourseId);

      testBookingId = data.data.booking.id;
      testUserId = data.data.booking.user_id;

      console.log('✅ Course registration successful (new user)');
      console.log(`📋 Booking ID: ${testBookingId}`);
      console.log(`👤 User ID: ${testUserId}`);
    });

    it('should reject duplicate registration with same idempotency key', async () => {
      const idempotencyKey = uuidv4();

      const registrationData = {
        full_name: 'Another Test User',
        wa_number: '+6281234567891',
        email: `test-duplicate-${Date.now()}@shema-music.com`,
        course_id: testCourseId,
        experience_level: 'beginner',
        preferred_days: ['tuesday'],
        preferred_time_range: {
          start: '10:00',
          end: '12:00'
        },
        consent: true,
        captcha_token: 'test-captcha-' + Date.now(),
        idempotency_key: idempotencyKey
      };

      // First request
      const response1 = await fetch(`${BOOKING_SERVICE_URL}/api/bookings/register-course`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationData),
      });

      expect(response1.status).toBe(201);

      // Second request with same idempotency key
      const response2 = await fetch(`${BOOKING_SERVICE_URL}/api/bookings/register-course`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationData),
      });

      expect(response2.status).toBe(409);
      const data = await response2.json();

      expect(data.success).toBe(false);
      expect(data.error.code).toBe('DUPLICATE_REQUEST');

      console.log('✅ Duplicate idempotency key rejected');

      // Cleanup
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('email', registrationData.email)
        .single();

      if (user) {
        await supabase.from('bookings').delete().eq('user_id', user.id);
        await supabase.from('student_profiles').delete().eq('user_id', user.id);
        await supabase.from('users').delete().eq('id', user.id);
      }
    });

    it('should reject registration with invalid course ID', async () => {
      const registrationData = {
        full_name: 'Test Invalid Course',
        wa_number: '+6281234567892',
        email: `test-invalid-${Date.now()}@shema-music.com`,
        course_id: uuidv4(), // Non-existent course ID
        experience_level: 'beginner',
        preferred_days: ['monday'],
        preferred_time_range: {
          start: '10:00',
          end: '12:00'
        },
        consent: true,
        captcha_token: 'test-captcha-' + Date.now(),
        idempotency_key: uuidv4()
      };

      const response = await fetch(`${BOOKING_SERVICE_URL}/api/bookings/register-course`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationData),
      });

      expect(response.status).toBe(404);
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.error.code).toBe('COURSE_NOT_FOUND');

      console.log('✅ Invalid course ID rejected');
    });

    it('should reject registration with invalid email format', async () => {
      const registrationData = {
        full_name: 'Test Invalid Email',
        wa_number: '+6281234567893',
        email: 'invalid-email-format', // Invalid email
        course_id: testCourseId,
        experience_level: 'beginner',
        preferred_days: ['monday'],
        preferred_time_range: {
          start: '10:00',
          end: '12:00'
        },
        consent: true,
        captcha_token: 'test-captcha-' + Date.now(),
        idempotency_key: uuidv4()
      };

      const response = await fetch(`${BOOKING_SERVICE_URL}/api/bookings/register-course`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationData),
      });

      expect(response.status).toBe(400);
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');

      console.log('✅ Invalid email format rejected');
    });

    it('should reject registration with invalid WA number format', async () => {
      const registrationData = {
        full_name: 'Test Invalid WA',
        wa_number: '081234567890', // Missing +62 prefix
        email: `test-invalid-wa-${Date.now()}@shema-music.com`,
        course_id: testCourseId,
        experience_level: 'beginner',
        preferred_days: ['monday'],
        preferred_time_range: {
          start: '10:00',
          end: '12:00'
        },
        consent: true,
        captcha_token: 'test-captcha-' + Date.now(),
        idempotency_key: uuidv4()
      };

      const response = await fetch(`${BOOKING_SERVICE_URL}/api/bookings/register-course`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationData),
      });

      expect(response.status).toBe(400);
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');

      console.log('✅ Invalid WA number format rejected');
    });

    it('should reject registration without consent', async () => {
      const registrationData = {
        full_name: 'Test No Consent',
        wa_number: '+6281234567894',
        email: `test-no-consent-${Date.now()}@shema-music.com`,
        course_id: testCourseId,
        experience_level: 'beginner',
        preferred_days: ['monday'],
        preferred_time_range: {
          start: '10:00',
          end: '12:00'
        },
        consent: false, // No consent
        captcha_token: 'test-captcha-' + Date.now(),
        idempotency_key: uuidv4()
      };

      const response = await fetch(`${BOOKING_SERVICE_URL}/api/bookings/register-course`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationData),
      });

      expect(response.status).toBe(400);
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');

      console.log('✅ Missing consent rejected');
    });

    it('should reject registration with empty preferred days', async () => {
      const registrationData = {
        full_name: 'Test Empty Days',
        wa_number: '+6281234567895',
        email: `test-empty-days-${Date.now()}@shema-music.com`,
        course_id: testCourseId,
        experience_level: 'beginner',
        preferred_days: [], // Empty array
        preferred_time_range: {
          start: '10:00',
          end: '12:00'
        },
        consent: true,
        captcha_token: 'test-captcha-' + Date.now(),
        idempotency_key: uuidv4()
      };

      const response = await fetch(`${BOOKING_SERVICE_URL}/api/bookings/register-course`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationData),
      });

      expect(response.status).toBe(400);
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');

      console.log('✅ Empty preferred days rejected');
    });

    it('should reject registration for existing user with pending booking', async () => {
      // User already has a pending booking from first test
      const registrationData = {
        full_name: 'Test Student User',
        wa_number: '+6281234567890',
        email: testEmail, // Same email as first test
        course_id: testCourseId, // Same course
        experience_level: 'beginner',
        preferred_days: ['thursday'],
        preferred_time_range: {
          start: '15:00',
          end: '17:00'
        },
        consent: true,
        captcha_token: 'test-captcha-' + Date.now(),
        idempotency_key: uuidv4()
      };

      const response = await fetch(`${BOOKING_SERVICE_URL}/api/bookings/register-course`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationData),
      });

      expect(response.status).toBe(409);
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.error.code).toBe('PENDING_BOOKING_EXISTS');

      console.log('✅ Duplicate pending booking rejected');
    });
  });

  describe('Booking Data Validation', () => {
    it('should verify booking has correct expiration time (3 days)', async () => {
      if (!testBookingId) {
        console.log('⚠️ Skipping: No test booking available');
        return;
      }

      const { data: booking } = await supabase
        .from('bookings')
        .select('created_at, expires_at')
        .eq('id', testBookingId)
        .single();

      expect(booking).toBeTruthy();

      const createdAt = new Date(booking.created_at);
      const expiresAt = new Date(booking.expires_at);
      const diffInDays = (expiresAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

      expect(diffInDays).toBeCloseTo(3, 1); // Within 0.1 day tolerance

      console.log('✅ Booking expiration time is correctly set to 3 days');
      console.log(`📅 Created: ${createdAt.toISOString()}`);
      console.log(`📅 Expires: ${expiresAt.toISOString()}`);
    });

    it('should verify student profile was created', async () => {
      if (!testUserId) {
        console.log('⚠️ Skipping: No test user available');
        return;
      }

      const { data: profile } = await supabase
        .from('student_profiles')
        .select('*')
        .eq('user_id', testUserId)
        .single();

      expect(profile).toBeTruthy();
      expect(profile.user_id).toBe(testUserId);
      expect(profile.experience_level).toBe('beginner');

      console.log('✅ Student profile created successfully');
    });
  });
});
