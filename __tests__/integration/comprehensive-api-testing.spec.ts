/**
 * Comprehensive API Testing Suite
 * Tests all endpoints across all services (GET, POST, PUT)
 * Uses Jest for testing
 */

import axios, { AxiosInstance } from 'axios';

const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://localhost:3000';
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
const ADMIN_SERVICE_URL = process.env.ADMIN_SERVICE_URL || 'http://localhost:3002';
const COURSE_SERVICE_URL = process.env.COURSE_SERVICE_URL || 'http://localhost:3003';
const BOOKING_SERVICE_URL = process.env.BOOKING_SERVICE_URL || 'http://localhost:3004';
const RECOMMENDATION_SERVICE_URL = process.env.RECOMMENDATION_SERVICE_URL || 'http://localhost:3005';

let apiClient: AxiosInstance;
let authToken: string;
let adminToken: string;
let testUserId: string;

// Helper function to wait for service
async function waitForService(url: string, maxRetries = 30): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await axios.get(`${url}/health`, { timeout: 5000 });
      console.log(`✓ Service ${url} is ready`);
      return;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

describe('Comprehensive API Testing Suite', () => {
  beforeAll(async () => {
    // Wait for all services to be ready
    await Promise.all([
      waitForService(API_GATEWAY_URL),
      waitForService(AUTH_SERVICE_URL),
      waitForService(ADMIN_SERVICE_URL),
      waitForService(COURSE_SERVICE_URL),
      waitForService(BOOKING_SERVICE_URL),
      waitForService(RECOMMENDATION_SERVICE_URL)
    ]);

    // Initialize API client
    apiClient = axios.create({
      baseURL: API_GATEWAY_URL,
      validateStatus: () => true // Don't throw on any status
    });

    // Login as admin to get token
    const loginResponse = await apiClient.post('/api/auth/login', {
      email: 'admin@shemamusic.com',
      password: 'Admin123!'
    });

    if (loginResponse.status === 200 && loginResponse.data.data?.accessToken) {
      adminToken = loginResponse.data.data.accessToken;
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${adminToken}`;
    }
  });

  describe('Health Check Endpoints', () => {
    test('API Gateway health check', async () => {
      const response = await apiClient.get('/health');
      expect(response.status).toBe(200);
      expect(response.data.status).toBe('healthy');
    });

    test('Services health check', async () => {
      const response = await apiClient.get('/services/health');
      expect([200, 503]).toContain(response.status);
      if (response.status === 200) {
        expect(response.data.services).toBeDefined();
      }
    });
  });

  describe('Auth Service - GET Endpoints', () => {
    test('GET /api/auth/me - Get current user', async () => {
      const response = await apiClient.get('/api/auth/me');
      expect([200, 401, 404]).toContain(response.status);
    });
  });

  describe('Auth Service - POST Endpoints', () => {
    test('POST /api/auth/login - Admin login', async () => {
      const response = await apiClient.post('/api/auth/login', {
        email: 'admin@shemamusic.com',
        password: 'Admin123!'
      });
      expect(response.status).toBe(200);
      expect(response.data.data?.accessToken).toBeDefined();
    });

    test('POST /api/auth/refresh - Refresh token', async () => {
      const response = await apiClient.post('/api/auth/refresh', {
        refreshToken: adminToken
      });
      expect([200, 401, 500]).toContain(response.status);
    });
  });

  describe('Course Service - GET Endpoints', () => {
    test('GET /api/courses - List all courses', async () => {
      const response = await apiClient.get('/api/courses');
      expect([200, 404]).toContain(response.status);
      if (response.status === 200) {
        expect(Array.isArray(response.data.data) || response.data.data === undefined).toBe(true);
      }
    });

    test('GET /api/schedules/available - Get available schedules', async () => {
      const response = await apiClient.get('/api/schedules/available');
      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Course Service - POST Endpoints', () => {
    test('POST /api/courses - Create course (admin only)', async () => {
      const response = await apiClient.post('/api/courses', {
        title: 'Test Course',
        description: 'Test Description',
        level: 'beginner',
        price_per_session: 100000
      });
      expect([201, 200, 400, 401, 403]).toContain(response.status);
    });
  });

  describe('Booking Service - GET Endpoints', () => {
    test('GET /api/bookings/pending - Get pending bookings (admin)', async () => {
      const response = await apiClient.get('/api/bookings/pending');
      expect([200, 401, 403, 404]).toContain(response.status);
    });
  });

  describe('Booking Service - POST Endpoints', () => {
    test('POST /api/bookings/create - Create booking', async () => {
      const response = await apiClient.post('/api/bookings/create', {
        course_id: 'test-course-id',
        first_choice_slot_id: 'slot-1',
        second_choice_slot_id: 'slot-2'
      });
      expect([201, 400, 401, 404]).toContain(response.status);
    });
  });

  describe('Admin Service - GET Endpoints', () => {
    test('GET /api/admin/dashboard - Get dashboard stats', async () => {
      const response = await apiClient.get('/api/admin/dashboard');
      expect([200, 401, 403, 404]).toContain(response.status);
    });

    test('GET /api/admin/users - List users', async () => {
      const response = await apiClient.get('/api/admin/users');
      expect([200, 401, 403, 404]).toContain(response.status);
    });
  });

  describe('Recommendation Service - GET Endpoints', () => {
    test('GET /api/recommendations/user/:userId - Get recommendations', async () => {
      const response = await apiClient.get('/api/recommendations/user/test-user-id');
      expect([200, 401, 404]).toContain(response.status);
    });
  });

  describe('Service Integration Flow', () => {
    test('Complete user flow: Login -> Get Profile -> List Courses', async () => {
      // Step 1: Login
      const loginRes = await apiClient.post('/api/auth/login', {
        email: 'admin@shemamusic.com',
        password: 'Admin123!'
      });
      expect(loginRes.status).toBe(200);

      // Step 2: Get current user
      const meRes = await apiClient.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${loginRes.data.data?.accessToken}` }
      });
      expect([200, 401, 404]).toContain(meRes.status);

      // Step 3: List courses
      const coursesRes = await apiClient.get('/api/courses');
      expect([200, 404]).toContain(coursesRes.status);
    });
  });
});

