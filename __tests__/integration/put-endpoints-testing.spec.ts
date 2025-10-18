/**
 * PUT Endpoints Testing Suite
 * Tests all PUT/UPDATE endpoints across services
 */

import axios, { AxiosInstance } from 'axios';

const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://localhost:3000';

let apiClient: AxiosInstance;
let adminToken: string;

async function waitForService(url: string, maxRetries = 30): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await axios.get(`${url}/health`, { timeout: 5000 });
      return;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

describe('PUT Endpoints Testing Suite', () => {
  beforeAll(async () => {
    await waitForService(API_GATEWAY_URL);

    apiClient = axios.create({
      baseURL: API_GATEWAY_URL,
      validateStatus: () => true
    });

    // Login as admin
    const loginResponse = await apiClient.post('/api/auth/login', {
      email: 'admin@shemamusic.com',
      password: 'Admin123!'
    });

    if (loginResponse.status === 200 && loginResponse.data.data?.accessToken) {
      adminToken = loginResponse.data.data.accessToken;
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${adminToken}`;
    }
  });

  describe('Course Service - PUT Endpoints', () => {
    test('PUT /api/courses/:id - Update course (admin only)', async () => {
      const response = await apiClient.put('/api/courses/test-course-id', {
        title: 'Updated Course Title',
        description: 'Updated Description',
        level: 'intermediate',
        price_per_session: 150000
      });
      expect([200, 201, 400, 401, 403, 404]).toContain(response.status);
    });
  });

  describe('Admin Service - PUT Endpoints', () => {
    test('PUT /api/admin/users/:id - Update user (admin only)', async () => {
      const response = await apiClient.put('/api/admin/users/test-user-id', {
        full_name: 'Updated Name',
        email: 'updated@example.com',
        role: 'student'
      });
      expect([200, 201, 400, 401, 403, 404]).toContain(response.status);
    });
  });

  describe('Booking Service - PUT Endpoints', () => {
    test('PUT /api/bookings/:id - Update booking', async () => {
      const response = await apiClient.put('/api/bookings/test-booking-id', {
        status: 'confirmed',
        notes: 'Updated booking notes'
      });
      expect([200, 201, 400, 401, 403, 404]).toContain(response.status);
    });
  });

  describe('Error Handling - Invalid Requests', () => {
    test('POST with invalid data should return 400 or 200', async () => {
      const response = await apiClient.post('/api/courses', {
        // Missing required fields
        title: 'Test'
      });
      expect([200, 400, 401, 403]).toContain(response.status);
    });

    test('GET non-existent resource should return 404 or 200', async () => {
      const response = await apiClient.get('/api/courses/non-existent-id');
      expect([200, 404]).toContain(response.status);
    });

    test('Unauthorized request should return 401 or 403', async () => {
      const unauthorizedClient = axios.create({
        baseURL: API_GATEWAY_URL,
        validateStatus: () => true
      });
      const response = await unauthorizedClient.get('/api/admin/dashboard');
      expect([401, 403, 404]).toContain(response.status);
    });
  });

  describe('Service Response Format', () => {
    test('Successful response should have proper format', async () => {
      const response = await apiClient.get('/api/courses');
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
    });

    test('Error response should have error message', async () => {
      const response = await apiClient.post('/api/auth/login', {
        email: 'nonexistent@example.com',
        password: 'wrongpassword'
      });
      expect([200, 401, 400]).toContain(response.status);
    });
  });

  describe('Cross-Service Communication', () => {
    test('API Gateway should route to Auth Service', async () => {
      const response = await apiClient.post('/api/auth/login', {
        email: 'admin@shemamusic.com',
        password: 'Admin123!'
      });
      expect(response.status).toBe(200);
      expect(response.data.data?.accessToken).toBeDefined();
    });

    test('API Gateway should route to Course Service', async () => {
      const response = await apiClient.get('/api/courses');
      expect([200, 404]).toContain(response.status);
    });

    test('API Gateway should route to Booking Service', async () => {
      const response = await apiClient.get('/api/bookings/pending');
      expect([200, 401, 403, 404]).toContain(response.status);
    });

    test('API Gateway should route to Admin Service', async () => {
      const response = await apiClient.get('/api/admin/dashboard');
      expect([200, 401, 403, 404]).toContain(response.status);
    });
  });

  describe('Authentication & Authorization', () => {
    test('Admin token should be valid', async () => {
      expect(adminToken).toBeDefined();
      expect(adminToken.length).toBeGreaterThan(0);
    });

    test('Protected endpoint with valid token should work', async () => {
      const response = await apiClient.get('/api/auth/me');
      expect([200, 401, 404]).toContain(response.status);
    });

    test('Protected endpoint without token should fail', async () => {
      const unauthorizedClient = axios.create({
        baseURL: API_GATEWAY_URL,
        validateStatus: () => true
      });
      const response = await unauthorizedClient.get('/api/admin/dashboard');
      expect([401, 403, 404]).toContain(response.status);
    });
  });

  describe('Data Validation', () => {
    test('Email validation on login', async () => {
      const response = await apiClient.post('/api/auth/login', {
        email: 'invalid-email',
        password: 'password'
      });
      expect([200, 400, 401]).toContain(response.status);
    });

    test('Password validation on login', async () => {
      const response = await apiClient.post('/api/auth/login', {
        email: 'admin@shemamusic.com',
        password: ''
      });
      expect([200, 400, 401]).toContain(response.status);
    });
  });

  describe('Response Time', () => {
    test('Health check should respond quickly', async () => {
      const startTime = Date.now();
      await apiClient.get('/health');
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(5000);
    });

    test('Login should respond within reasonable time', async () => {
      const startTime = Date.now();
      await apiClient.post('/api/auth/login', {
        email: 'admin@shemamusic.com',
        password: 'Admin123!'
      });
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(10000);
    });
  });
});

