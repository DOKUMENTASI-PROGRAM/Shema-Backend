import { test, expect } from '@playwright/test';
import { waitForService } from '../playwright-setup';

const BASE_URL = process.env.API_GATEWAY_URL || 'http://localhost:3000';

test.describe('API Gateway Aggregation Endpoints Tests', () => {
  let adminToken: string;
  let userToken: string;
  let userId: string;

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
    userId = userBody.user.id;
  });

  test('should get dashboard stats (admin only)', async ({ request }) => {
    const response = await request.get('/api/dashboard/stats', {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.stats).toBeDefined();

    // Check that stats contain expected fields
    expect(body.stats).toHaveProperty('totalUsers');
    expect(body.stats).toHaveProperty('totalCourses');
    expect(body.stats).toHaveProperty('totalBookings');
    expect(body.stats).toHaveProperty('activeSessions');
    expect(body.stats).toHaveProperty('revenue');

    // Check that numeric fields are numbers
    expect(typeof body.stats.totalUsers).toBe('number');
    expect(typeof body.stats.totalCourses).toBe('number');
    expect(typeof body.stats.totalBookings).toBe('number');
  });

  test('should get admin dashboard data', async ({ request }) => {
    const response = await request.get('/api/dashboard/admin', {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.dashboard).toBeDefined();

    // Check dashboard structure
    expect(body.dashboard).toHaveProperty('stats');
    expect(body.dashboard).toHaveProperty('recentBookings');
    expect(body.dashboard).toHaveProperty('recentSessions');
    expect(body.dashboard).toHaveProperty('topCourses');

    // Check arrays
    expect(Array.isArray(body.dashboard.recentBookings)).toBe(true);
    expect(Array.isArray(body.dashboard.recentSessions)).toBe(true);
    expect(Array.isArray(body.dashboard.topCourses)).toBe(true);
  });

  test('should get full user profile', async ({ request }) => {
    const response = await request.get(`/api/profile/${userId}/full`, {
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.profile).toBeDefined();

    // Check profile aggregation
    expect(body.profile).toHaveProperty('user');
    expect(body.profile).toHaveProperty('enrollments');
    expect(body.profile).toHaveProperty('bookings');
    expect(body.profile).toHaveProperty('chatHistory');

    // Check user data
    expect(body.profile.user.id).toBe(userId);
    expect(body.profile.user.email).toBe('kiana@gmail.com');

    // Check arrays
    expect(Array.isArray(body.profile.enrollments)).toBe(true);
    expect(Array.isArray(body.profile.bookings)).toBe(true);
    expect(Array.isArray(body.profile.chatHistory)).toBe(true);
  });

  test('should fail dashboard stats without admin role', async ({ request }) => {
    const response = await request.get('/api/dashboard/stats', {
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });

    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toBeDefined();
  });

  test('should fail admin dashboard without admin role', async ({ request }) => {
    const response = await request.get('/api/dashboard/admin', {
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });

    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toBeDefined();
  });

  test('should fail to access other user profile', async ({ request }) => {
    // Try to access admin profile as regular user
    const response = await request.get(`/api/profile/${userId}/full`, {
      headers: {
        'Authorization': `Bearer ${adminToken}` // Wrong token for this user
      }
    });

    // Should fail because admin token doesn't match userId
    expect([403, 404]).toContain(response.status());
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  test('should return 404 for non-existent user profile', async ({ request }) => {
    const response = await request.get('/api/profile/non-existent-id/full', {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  test('should handle aggregation errors gracefully', async ({ request }) => {
    // Test with invalid user ID format
    const response = await request.get('/api/profile/invalid-id-format/full', {
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });

    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body.success).toBe(false);
  });
});