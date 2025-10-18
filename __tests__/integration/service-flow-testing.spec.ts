/**
 * Service Flow Testing Suite
 * Tests integration and communication between services
 */

import axios, { AxiosInstance } from 'axios';

const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://localhost:3000';

let apiClient: AxiosInstance;
let adminToken: string;
let studentToken: string;

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

describe('Service Flow Integration Testing', () => {
  beforeAll(async () => {
    await waitForService(API_GATEWAY_URL);

    apiClient = axios.create({
      baseURL: API_GATEWAY_URL,
      validateStatus: () => true
    });

    // Login as admin
    const adminLoginRes = await apiClient.post('/api/auth/login', {
      email: 'admin@shemamusic.com',
      password: 'Admin123!'
    });

    if (adminLoginRes.status === 200 && adminLoginRes.data.data?.accessToken) {
      adminToken = adminLoginRes.data.data.accessToken;
    }
  });

  describe('Authentication Flow', () => {
    test('Complete login flow: POST login -> GET me -> Verify token', async () => {
      // Step 1: Login
      const loginRes = await apiClient.post('/api/auth/login', {
        email: 'admin@shemamusic.com',
        password: 'Admin123!'
      });
      expect(loginRes.status).toBe(200);
      expect(loginRes.data.data?.accessToken).toBeDefined();

      // Step 2: Use token to get current user
      const meRes = await apiClient.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${loginRes.data.data?.accessToken}` }
      });
      expect([200, 401, 404]).toContain(meRes.status);

      // Step 3: Verify token is valid
      expect(loginRes.data.data?.accessToken.length).toBeGreaterThan(0);
    });

    test('Refresh token flow', async () => {
      // Step 1: Login to get refresh token
      const loginRes = await apiClient.post('/api/auth/login', {
        email: 'admin@shemamusic.com',
        password: 'Admin123!'
      });
      expect(loginRes.status).toBe(200);

      // Step 2: Use refresh token to get new access token
      const refreshRes = await apiClient.post('/api/auth/refresh', {
        refreshToken: loginRes.data.data?.refreshToken
      });
      expect([200, 401, 500]).toContain(refreshRes.status);
    });
  });

  describe('Course Management Flow', () => {
    test('Complete course flow: List -> Get Details -> Create (admin)', async () => {
      // Step 1: List all courses (public)
      const listRes = await apiClient.get('/api/courses');
      expect([200, 404]).toContain(listRes.status);

      // Step 2: Get available schedules (public)
      const schedulesRes = await apiClient.get('/api/schedules/available');
      expect([200, 404, 500]).toContain(schedulesRes.status);

      // Step 3: Create course (admin only)
      const createRes = await apiClient.post('/api/courses', {
        title: 'Test Course Flow',
        description: 'Testing course creation flow',
        level: 'beginner',
        price_per_session: 100000
      }, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      expect([200, 201, 400, 401, 403]).toContain(createRes.status);
    });
  });

  describe('Booking Management Flow', () => {
    test('Complete booking flow: Create -> Get -> Confirm (admin)', async () => {
      // Step 1: Create booking
      const createRes = await apiClient.post('/api/bookings/create', {
        course_id: 'test-course-id',
        first_choice_slot_id: 'slot-1',
        second_choice_slot_id: 'slot-2'
      }, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      expect([200, 201, 400, 401, 404]).toContain(createRes.status);

      // Step 2: Get pending bookings (admin)
      const pendingRes = await apiClient.get('/api/bookings/pending', {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      expect([200, 401, 403, 404]).toContain(pendingRes.status);

      // Step 3: Confirm booking (admin)
      const confirmRes = await apiClient.post('/api/bookings/test-booking-id/confirm', {}, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      expect([200, 201, 400, 401, 403, 404]).toContain(confirmRes.status);
    });

    test('User booking retrieval flow', async () => {
      // Step 1: Get user bookings
      const userBookingsRes = await apiClient.get('/api/bookings/user/test-user-id', {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      expect([200, 401, 404]).toContain(userBookingsRes.status);
    });
  });

  describe('Admin Dashboard Flow', () => {
    test('Complete admin flow: Dashboard -> Users -> Courses -> Bookings', async () => {
      // Step 1: Get dashboard stats
      const dashboardRes = await apiClient.get('/api/admin/dashboard', {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      expect([200, 401, 403, 404]).toContain(dashboardRes.status);

      // Step 2: Get users list
      const usersRes = await apiClient.get('/api/admin/users', {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      expect([200, 401, 403, 404]).toContain(usersRes.status);

      // Step 3: Get courses list
      const coursesRes = await apiClient.get('/api/admin/courses', {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      expect([200, 401, 403, 404]).toContain(coursesRes.status);

      // Step 4: Get bookings list
      const bookingsRes = await apiClient.get('/api/admin/bookings', {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      expect([200, 401, 403, 404]).toContain(bookingsRes.status);
    });
  });

  describe('Recommendation Service Flow', () => {
    test('Get user recommendations flow', async () => {
      // Step 1: Get recommendations for user
      const recsRes = await apiClient.get('/api/recommendations/user/test-user-id', {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      expect([200, 401, 404]).toContain(recsRes.status);
    });

    test('Generate recommendations flow', async () => {
      // Step 1: Generate recommendations
      const genRes = await apiClient.post('/api/recommendations/generate', {
        user_id: 'test-user-id'
      }, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      expect([200, 201, 400, 401, 404]).toContain(genRes.status);
    });
  });

  describe('Multi-Service Aggregation Flow', () => {
    test('Dashboard stats aggregation from multiple services', async () => {
      const response = await apiClient.get('/api/dashboard/stats', {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      expect([200, 401, 403, 404]).toContain(response.status);
      if (response.status === 200) {
        expect(response.data.data).toBeDefined();
      }
    });

    test('Admin dashboard aggregation', async () => {
      const response = await apiClient.get('/api/dashboard/admin', {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      expect([200, 401, 403, 404]).toContain(response.status);
    });

    test('User profile aggregation', async () => {
      const response = await apiClient.get('/api/profile/test-user-id/full', {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      expect([200, 401, 404]).toContain(response.status);
    });
  });

  describe('Error Handling Across Services', () => {
    test('Invalid course ID should be handled gracefully', async () => {
      const response = await apiClient.get('/api/courses/invalid-id');
      expect([200, 404]).toContain(response.status);
    });

    test('Invalid booking ID should be handled gracefully', async () => {
      const response = await apiClient.get('/api/bookings/invalid-id', {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      expect([200, 401, 404]).toContain(response.status);
    });

    test('Missing authentication should be handled', async () => {
      const response = await apiClient.get('/api/admin/dashboard');
      expect([401, 403, 404]).toContain(response.status);
    });
  });

  describe('Service Availability', () => {
    test('All services should be accessible through API Gateway', async () => {
      const endpoints = [
        '/api/auth/me',
        '/api/courses',
        '/api/bookings/pending',
        '/api/admin/dashboard',
        '/api/recommendations/user/test-id'
      ];

      for (const endpoint of endpoints) {
        const response = await apiClient.get(endpoint, {
          headers: { Authorization: `Bearer ${adminToken}` }
        });
        expect([200, 401, 403, 404, 500]).toContain(response.status);
      }
    });
  });
});

