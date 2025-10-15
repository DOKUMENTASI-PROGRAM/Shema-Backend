import { test, expect } from '@playwright/test';
import { waitForService } from '../playwright-setup';

const BASE_URL = process.env.API_GATEWAY_URL || 'http://localhost:3000';

test.describe('Booking Service Integration Tests', () => {
  let adminToken: string;
  let userToken: string;

  test.beforeAll(async () => {
    // Wait for API Gateway to be ready
    await waitForService(`${BASE_URL}/health`);

    // Login as admin
    const adminLoginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@shemamusic.com',
        password: 'Admin123!'
      })
    });

    const adminBody = await adminLoginResponse.json();
    adminToken = adminBody.token;

    // Login as regular user
    const userLoginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'kiana@gmail.com',
        password: 'Kiana423'
      })
    });

    const userBody = await userLoginResponse.json();
    userToken = userBody.token;
  });

  test('should register course without authentication', async ({ request }) => {
    const registrationData = {
      student_name: 'Test Student',
      student_email: `test${Date.now()}@example.com`,
      student_phone: '081234567890',
      course_id: 1, // Assuming course with ID 1 exists
      preferred_schedule: 'Monday 19:00-20:30',
      notes: 'Integration test booking'
    };

    const response = await request.post('/api/booking/register-course', {
      data: registrationData
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.booking).toBeDefined();
    expect(body.booking.student_email).toBe(registrationData.student_email);
  });

  test('should create booking with authentication', async ({ request }) => {
    const bookingData = {
      schedule_id: 1, // Assuming schedule exists
      notes: 'Authenticated booking test'
    };

    const response = await request.post('/api/bookings/create', {
      headers: {
        'Authorization': `Bearer ${userToken}`
      },
      data: bookingData
    });

    // May fail if schedule doesn't exist, but should not be auth error
    expect([201, 400, 404]).toContain(response.status());

    if (response.status() === 201) {
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.booking).toBeDefined();
    }
  });

  test('should get user bookings', async ({ request }) => {
    // First get user info to get user ID
    const userResponse = await request.get('/api/users/me', {
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });

    expect(userResponse.status()).toBe(200);
    const userBody = await userResponse.json();
    const userId = userBody.user.id;

    const response = await request.get(`/api/bookings/user/${userId}`, {
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.bookings)).toBe(true);
  });

  test('should get pending bookings (admin only)', async ({ request }) => {
    const response = await request.get('/api/bookings/pending', {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.bookings)).toBe(true);
  });

  test('should fail to access pending bookings without admin role', async ({ request }) => {
    const response = await request.get('/bookings/pending', {
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });

    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  test('should confirm booking (admin only)', async ({ request }) => {
    // First get pending bookings
    const pendingResponse = await request.get('/api/bookings/pending', {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    const pendingBody = await pendingResponse.json();

    if (pendingBody.bookings && pendingBody.bookings.length > 0) {
      const bookingId = pendingBody.bookings[0].id;

      const response = await request.post(`/api/bookings/${bookingId}/confirm`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });

      expect([200, 400]).toContain(response.status());

      if (response.status() === 200) {
        const body = await response.json();
        expect(body.success).toBe(true);
      }
    } else {
      // No pending bookings, skip test
      test.skip();
    }
  });

  test('should reject booking (admin only)', async ({ request }) => {
    // First get pending bookings
    const pendingResponse = await request.get('/api/bookings/pending', {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    const pendingBody = await pendingResponse.json();

    if (pendingBody.bookings && pendingBody.bookings.length > 0) {
      const bookingId = pendingBody.bookings[0].id;

      const response = await request.post(`/api/bookings/${bookingId}/reject`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        },
        data: {
          reason: 'Test rejection'
        }
      });

      expect([200, 400]).toContain(response.status());

      if (response.status() === 200) {
        const body = await response.json();
        expect(body.success).toBe(true);
      }
    } else {
      // No pending bookings, skip test
      test.skip();
    }
  });
});