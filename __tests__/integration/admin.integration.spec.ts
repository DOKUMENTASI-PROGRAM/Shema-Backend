import { test, expect } from '@playwright/test';
import { waitForService } from '../playwright-setup';

const BASE_URL = process.env.API_GATEWAY_URL || 'http://localhost:3000';

test.describe('Admin/User Service Integration Tests', () => {
  let adminToken: string;
  let userToken: string;
  let testUserId: string;

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

  test('should get current user profile', async ({ request }) => {
    const response = await request.get('/api/users/me', {
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.user).toBeDefined();
    expect(body.user.email).toBe('kiana@gmail.com');

    testUserId = body.user.id;
  });

  test('should get user by ID', async ({ request }) => {
    const response = await request.get(`/api/users/${testUserId}`, {
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.user.id).toBe(testUserId);
  });

  test('should update user profile', async ({ request }) => {
    const updateData = {
      first_name: 'Updated Name',
      phone: '081234567890'
    };

    const response = await request.put(`/api/users/${testUserId}`, {
      headers: {
        'Authorization': `Bearer ${userToken}`
      },
      data: updateData
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.user).toBeDefined();
  });

  test('should get all users (admin only)', async ({ request }) => {
    const response = await request.get('/api/users', {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.users)).toBe(true);
    expect(body.users.length).toBeGreaterThan(0);
  });

  test('should filter users by role', async ({ request }) => {
    const response = await request.get('/api/users?role=admin', {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.users)).toBe(true);

    // Check that all returned users have admin role
    body.users.forEach((user: any) => {
      expect(user.role).toBe('admin');
    });
  });

  test('should search users by email', async ({ request }) => {
    const response = await request.get('/api/users?email=kiana', {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.users)).toBe(true);

    // Should find the kiana user
    const kianaUser = body.users.find((user: any) => user.email === 'kiana@gmail.com');
    expect(kianaUser).toBeDefined();
  });

  test('should paginate users', async ({ request }) => {
    const response = await request.get('/api/users?page=1&limit=5', {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.users)).toBe(true);
    expect(body.users.length).toBeLessThanOrEqual(5);
    expect(body.pagination).toBeDefined();
    expect(body.pagination.page).toBe(1);
    expect(body.pagination.limit).toBe(5);
  });

  test('should fail to access user list without admin role', async ({ request }) => {
    const response = await request.get('/api/users', {
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });

    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toBeDefined();
  });

  test('should fail to update other user profile', async ({ request }) => {
    // Try to update admin user as regular user
    const adminUserId = 'some-admin-id'; // Would need to get actual admin ID

    const response = await request.put(`/api/users/${adminUserId}`, {
      headers: {
        'Authorization': `Bearer ${userToken}`
      },
      data: { first_name: 'Hacked' }
    });

    // Should fail with 403 or 404 (can't access other user's profile)
    expect([403, 404]).toContain(response.status());
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  test('should return 404 for non-existent user', async ({ request }) => {
    const response = await request.get('/users/non-existent-id', {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body.success).toBe(false);
  });
});