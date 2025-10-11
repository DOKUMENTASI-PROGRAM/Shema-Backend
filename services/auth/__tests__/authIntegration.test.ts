import { supabase } from '../src/config/supabase';
import { redisClient } from '../src/config/redis';

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';

/**
 * Auth Service - Complete Integration Tests
 * Tests all authentication endpoints using remote Supabase (production)
 */
describe('Auth Service - HTTP Integration Tests', () => {
  const testUser = {
    email: `test-integration-${Date.now()}@shema-music.com`,
    password: 'TestPassword123!',
    full_name: 'Test Integration User',
    role: 'admin' as const,
    phone_number: '+6281234567890'
  };

  let accessToken: string;
  let refreshToken: string;
  let userId: string;

  beforeAll(async () => {
    console.log('\n🔧 Setting up Auth Integration Tests...');
    console.log(`📍 Testing against: ${process.env.SUPABASE_URL}`);
    console.log(`🔗 Auth Service URL: ${AUTH_SERVICE_URL}`);

    // Connect to Redis for cleanup
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }

    // Clean up any existing test data
    await supabase.from('users').delete().eq('email', testUser.email);
    
    // Don't flush all Redis keys in production - only clean test-specific keys
    const testKeys = await redisClient.keys('test:*');
    if (testKeys.length > 0) {
      await redisClient.del(testKeys);
    }
  });

  afterAll(async () => {
    console.log('\n🧹 Cleaning up Auth test data...');
    // Clean up test data
    if (userId) {
      await supabase.from('users').delete().eq('id', userId);
      await redisClient.del(`refresh_token:${userId}`);
      console.log(`✅ Deleted test user: ${userId}`);
    }
    await redisClient.quit();
    console.log('✅ Auth tests cleanup complete\n');
  });

  describe('POST /api/auth/register', () => {
    it('should register a new admin user successfully', async () => {
      const response = await fetch(`${AUTH_SERVICE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testUser),
      });

      expect(response.status).toBe(201);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('accessToken');
      expect(data.data).toHaveProperty('refreshToken');
      expect(data.data.user).toMatchObject({
        email: testUser.email,
        full_name: testUser.full_name,
        role: testUser.role
      });

      accessToken = data.data.accessToken;
      refreshToken = data.data.refreshToken;
      userId = data.data.user.id;

      console.log('✅ User registered successfully via HTTP');
    });

    it('should reject registration with existing email', async () => {
      const response = await fetch(`${AUTH_SERVICE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testUser),
      });

      expect(response.status).toBe(409);
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.error.code).toBe('DB_DUPLICATE_ENTRY');

      console.log('✅ Duplicate email rejected via HTTP');
    });

    it('should reject registration with invalid email', async () => {
      const response = await fetch(`${AUTH_SERVICE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...testUser,
          email: 'invalid-email',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');

      console.log('✅ Invalid email rejected via HTTP');
    });

    it('should reject registration with weak password', async () => {
      const response = await fetch(`${AUTH_SERVICE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...testUser,
          email: `weak-password-${Date.now()}@test.com`,
          password: '123'
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_PASSWORD_WEAK');

      console.log('✅ Weak password rejected via HTTP');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with correct credentials', async () => {
      const response = await fetch(`${AUTH_SERVICE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testUser.email,
          password: testUser.password
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('accessToken');
      expect(data.data).toHaveProperty('refreshToken');
      expect(data.data.user.email).toBe(testUser.email);

      console.log('✅ User logged in successfully via HTTP');
    });

    it('should reject login with wrong password', async () => {
      const response = await fetch(`${AUTH_SERVICE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testUser.email,
          password: 'wrongpassword'
        }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.error.code).toBe('AUTH_INVALID_CREDENTIALS');

      console.log('✅ Wrong password rejected via HTTP');
    });

    it('should reject login with non-existent email', async () => {
      const response = await fetch(`${AUTH_SERVICE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'nonexistent@test.com',
          password: 'password123'
        }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.error.code).toBe('AUTH_INVALID_CREDENTIALS');

      console.log('✅ Non-existent email rejected via HTTP');
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh access token successfully', async () => {
      const response = await fetch(`${AUTH_SERVICE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken: refreshToken
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('accessToken');
      expect(data.data).toHaveProperty('refreshToken');

      // Update tokens for next tests
      accessToken = data.data.accessToken;
      refreshToken = data.data.refreshToken;

      console.log('✅ Token refreshed successfully via HTTP');
    });

    it('should reject refresh with invalid token', async () => {
      const response = await fetch(`${AUTH_SERVICE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken: 'invalid-refresh-token'
        }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.error.code).toBe('AUTH_INVALID_TOKEN');

      console.log('✅ Invalid refresh token rejected via HTTP');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should get current user profile', async () => {
      const response = await fetch(`${AUTH_SERVICE_URL}/api/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.email).toBe(testUser.email);
      expect(data.data.full_name).toBe(testUser.full_name);
      expect(data.data.role).toBe(testUser.role);

      console.log('✅ User profile retrieved successfully via HTTP');
    });

    it('should reject request without authorization header', async () => {
      const response = await fetch(`${AUTH_SERVICE_URL}/api/auth/me`, {
        method: 'GET',
      });

      expect(response.status).toBe(401);
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.error.code).toBe('AUTH_MISSING_TOKEN');

      console.log('✅ Missing token rejected via HTTP');
    });

    it('should reject request with invalid token', async () => {
      const response = await fetch(`${AUTH_SERVICE_URL}/api/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer invalid-token',
        },
      });

      expect(response.status).toBe(401);
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.error.code).toBe('AUTH_INVALID_TOKEN');

      console.log('✅ Invalid token rejected via HTTP');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const response = await fetch(`${AUTH_SERVICE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken: refreshToken
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.message).toBe('Logged out successfully');

      console.log('✅ User logged out successfully via HTTP');
    });

    it('should reject access to protected route after logout', async () => {
      const response = await fetch(`${AUTH_SERVICE_URL}/api/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      expect(response.status).toBe(401);
      const data = await response.json();

      expect(data.success).toBe(false);

      console.log('✅ Access rejected after logout via HTTP');
    });
  });
});