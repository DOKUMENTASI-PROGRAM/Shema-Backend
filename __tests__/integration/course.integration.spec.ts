import { test, expect } from '@playwright/test';
import { waitForService } from '../playwright-setup';

const BASE_URL = process.env.API_GATEWAY_URL || 'http://localhost:3000';

test.describe('Course Service Integration Tests', () => {
  let adminToken: string;
  let testCourseId: string;

  test.beforeAll(async () => {
    // Wait for API Gateway to be ready
    await waitForService(`${BASE_URL}/health`);

    // Login as admin to get token
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@shemamusic.com',
        password: 'Admin123!'
      })
    });

    const loginBody = await loginResponse.json();
    adminToken = loginBody.token;
  });

  test('should get all courses (public)', async ({ request }) => {
    const response = await request.get('/api/courses');

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.courses)).toBe(true);
  });

  test('should get active courses', async ({ request }) => {
    const response = await request.get('/api/courses?active=true');

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.courses)).toBe(true);
  });

  test('should create a new course (admin only)', async ({ request }) => {
    const courseData = {
      title: `Test Course ${Date.now()}`,
      description: 'A test course for integration testing',
      level: 'beginner',
      price_per_session: 50000,
      duration_weeks: 8,
      max_students: 20,
      is_active: true,
      instrument: 'piano',
      schedule: 'Monday, Wednesday 19:00-20:30'
    };

    const response = await request.post('/api/courses', {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      },
      data: courseData
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.course).toBeDefined();
    expect(body.course.title).toBe(courseData.title);

    testCourseId = body.course.id;
  });

  test('should get course by ID', async ({ request }) => {
    const response = await request.get(`/api/courses/${testCourseId}`);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.course.id).toBe(testCourseId);
    expect(body.course.title).toContain('Test Course');
  });

  test('should update course (admin only)', async ({ request }) => {
    const updateData = {
      title: `Updated Test Course ${Date.now()}`,
      description: 'Updated description for integration testing',
      price_per_session: 60000
    };

    const response = await request.put(`/api/courses/${testCourseId}`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      },
      data: updateData
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.course.title).toBe(updateData.title);
    expect(body.course.price_per_session).toBe(updateData.price_per_session);
  });

  test('should fail to create course without auth', async ({ request }) => {
    const courseData = {
      title: 'Unauthorized Course',
      description: 'Should fail',
      level: 'beginner',
      price_per_session: 50000
    };

    const response = await request.post('/api/courses', {
      data: courseData
    });

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  test('should fail to update course without admin role', async ({ request }) => {
    // Login as regular user (if available) or expect 403
    const response = await request.put(`/api/courses/${testCourseId}`, {
      data: { title: 'Should Fail' }
    });

    expect([401, 403]).toContain(response.status());
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  test('should delete course (admin only)', async ({ request }) => {
    const response = await request.delete(`/api/courses/${testCourseId}`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
  });

  test('should return 404 for deleted course', async ({ request }) => {
    const response = await request.get(`/api/courses/${testCourseId}`);

    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  test('should get available schedules', async ({ request }) => {
    const response = await request.get('/api/schedules/available');

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    // May be empty array if no schedules, but should be array
    expect(Array.isArray(body.schedules)).toBe(true);
  });
});