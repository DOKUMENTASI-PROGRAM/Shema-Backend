import { test, expect } from '@playwright/test';
import { waitForService } from '../playwright-setup';

const BASE_URL = process.env.API_GATEWAY_URL || 'http://localhost:3000';

test.describe('Auth Service Integration Tests', () => {
  test.beforeAll(async () => {
    // Wait for API Gateway to be ready
    await waitForService(`${BASE_URL}/health`);
  });

  test('should register a new admin user', async ({ request }) => {
    const testEmail = `testadmin${Date.now()}@example.com`;

    const response = await request.post('/api/auth/register', {
      data: {
        email: testEmail,
        password: 'TestPass123!',
        role: 'admin'
      }
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.user.email).toBe(testEmail);
    expect(body.user.role).toBe('admin');
  });

  test('should login with correct credentials', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: {
        email: 'admin@shemamusic.com',
        password: 'Admin123!'
      }
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(body.data.accessToken).toBeDefined();
    expect(body.data.refreshToken).toBeDefined();
  });

  test('should fail login with wrong credentials', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: {
        email: 'admin@shemamusic.com',
        password: 'wrongpassword'
      }
    });

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toBeDefined();
  });

  test('should refresh token', async ({ request }) => {
    // First login to get tokens
    const loginResponse = await request.post('/auth/login', {
      data: {
        email: 'admin@shemamusic.com',
        password: 'Admin123!'
      }
    });

    const loginBody = await loginResponse.json();
    const refreshToken = loginBody.refreshToken;

    const response = await request.post('/auth/refresh', {
      data: { refreshToken }
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.token).toBeDefined();
    expect(body.refreshToken).toBeDefined();
  });

  test('should logout successfully', async ({ request }) => {
    // First login to get token
    const loginResponse = await request.post('/auth/login', {
      data: {
        email: 'admin@shemamusic.com',
        password: 'Admin123!'
      }
    });

    const loginBody = await loginResponse.json();
    const token = loginBody.token;

    const response = await request.post('/auth/logout', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
  });

  test('should get user profile with valid token', async ({ request }) => {
    // First login to get token
    const loginResponse = await request.post('/auth/login', {
      data: {
        email: 'admin@shemamusic.com',
        password: 'Admin123!'
      }
    });

    const loginBody = await loginResponse.json();
    const token = loginBody.token;

    const response = await request.get('/users/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.user).toBeDefined();
    expect(body.user.email).toBe('admin@shemamusic.com');
  });

  test('should fail to access protected route without token', async ({ request }) => {
    const response = await request.get('/users/me');

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toBeDefined();
  });
});