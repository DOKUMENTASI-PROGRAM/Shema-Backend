/**
 * Comprehensive API Testing Script
 * Tests all endpoints in Shema Music Backend
 * Run: node scripts/test-all-endpoints.js
 */

const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = process.env.API_GATEWAY_URL || 'http://localhost:3000';
const TEST_USER = {
  email: 'kiana@gmail.com',
  password: 'Kiana423'
};
const TEST_ADMIN = {
  email: 'admin@shemamusic.com',
  password: 'Admin123!'
};

// Test results storage
const testResults = {
  timestamp: new Date().toISOString(),
  baseUrl: BASE_URL,
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
  },
  tests: []
};

// Helper function to make HTTP requests
async function makeRequest(method, endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
  const config = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  };

  if (options.body) {
    config.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, config);
    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    return {
      status: response.status,
      statusText: response.statusText,
      data,
      headers: Object.fromEntries(response.headers.entries())
    };
  } catch (error) {
    return {
      status: 0,
      statusText: 'Error',
      error: error.message,
      data: null
    };
  }
}

// Test runner function
async function runTest(testName, method, endpoint, options = {}) {
  console.log(`\n🧪 Testing: ${testName}`);
  console.log(`   ${method} ${endpoint}`);
  
  const startTime = Date.now();
  const response = await makeRequest(method, endpoint, options);
  const duration = Date.now() - startTime;

  const passed = options.expectedStatus 
    ? response.status === options.expectedStatus 
    : response.status >= 200 && response.status < 300;

  const result = {
    name: testName,
    method,
    endpoint,
    request: {
      headers: options.headers || {},
      body: options.body || null
    },
    response: {
      status: response.status,
      statusText: response.statusText,
      data: response.data,
      error: response.error || null
    },
    duration: `${duration}ms`,
    passed,
    timestamp: new Date().toISOString()
  };

  testResults.tests.push(result);
  testResults.summary.total++;
  
  if (passed) {
    testResults.summary.passed++;
    console.log(`   ✅ PASSED (${duration}ms) - Status: ${response.status}`);
  } else {
    testResults.summary.failed++;
    console.log(`   ❌ FAILED (${duration}ms) - Status: ${response.status}`);
    if (response.error) {
      console.log(`   Error: ${response.error}`);
    }
  }

  return response;
}

// Generate markdown report
function generateReport() {
  const reportPath = path.join(__dirname, '../docs/API_TESTING_REPORT.md');
  
  let markdown = `# API Testing Report
  
**Generated:** ${new Date().toLocaleString()}  
**Base URL:** ${BASE_URL}  
**Total Tests:** ${testResults.summary.total}  
**Passed:** ✅ ${testResults.summary.passed}  
**Failed:** ❌ ${testResults.summary.failed}  
**Success Rate:** ${((testResults.summary.passed / testResults.summary.total) * 100).toFixed(2)}%

---

## Test Summary by Category

`;

  // Group tests by category
  const categories = {};
  testResults.tests.forEach(test => {
    const category = test.name.split(':')[0].trim();
    if (!categories[category]) {
      categories[category] = { passed: 0, failed: 0, tests: [] };
    }
    categories[category].tests.push(test);
    if (test.passed) {
      categories[category].passed++;
    } else {
      categories[category].failed++;
    }
  });

  // Write category summaries
  Object.keys(categories).forEach(category => {
    const cat = categories[category];
    markdown += `### ${category}\n`;
    markdown += `- Total: ${cat.tests.length}\n`;
    markdown += `- Passed: ✅ ${cat.passed}\n`;
    markdown += `- Failed: ❌ ${cat.failed}\n\n`;
  });

  markdown += `---

## Detailed Test Results

`;

  // Write detailed results
  Object.keys(categories).forEach(category => {
    const cat = categories[category];
    markdown += `### ${category}\n\n`;
    
    cat.tests.forEach((test, index) => {
      const icon = test.passed ? '✅' : '❌';
      markdown += `#### ${icon} ${test.name}\n\n`;
      markdown += `**Request:**\n`;
      markdown += `- Method: \`${test.method}\`\n`;
      markdown += `- Endpoint: \`${test.endpoint}\`\n`;
      markdown += `- Duration: ${test.duration}\n\n`;
      
      if (test.request.body) {
        markdown += `**Request Body:**\n\`\`\`json\n${JSON.stringify(test.request.body, null, 2)}\n\`\`\`\n\n`;
      }
      
      markdown += `**Response:**\n`;
      markdown += `- Status: \`${test.response.status} ${test.response.statusText}\`\n\n`;
      
      if (test.response.error) {
        markdown += `**Error:**\n\`\`\`\n${test.response.error}\n\`\`\`\n\n`;
      }
      
      if (test.response.data) {
        const dataStr = typeof test.response.data === 'string' 
          ? test.response.data 
          : JSON.stringify(test.response.data, null, 2);
        
        // Truncate long responses
        const truncatedData = dataStr.length > 1000 
          ? dataStr.substring(0, 1000) + '\n... (truncated)'
          : dataStr;
          
        markdown += `**Response Data:**\n\`\`\`json\n${truncatedData}\n\`\`\`\n\n`;
      }
      
      markdown += `---\n\n`;
    });
  });

  markdown += `## Raw Test Data

<details>
<summary>Click to expand JSON data</summary>

\`\`\`json
${JSON.stringify(testResults, null, 2)}
\`\`\`

</details>

---

**Report generated automatically by test-all-endpoints.js**
`;

  fs.writeFileSync(reportPath, markdown);
  console.log(`\n📄 Report saved to: ${reportPath}`);
}

// Main test execution
async function runAllTests() {
  console.log('🚀 Starting API Testing Suite');
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log('=' .repeat(60));

  let userToken = null;
  let adminToken = null;
  let userId = null;
  let adminId = null;
  let courseId = null;
  let bookingId = null;
  let chatSessionId = null;

  try {
    // ====================================
    // 1. HEALTH CHECKS
    // ====================================
    console.log('\n📋 === HEALTH CHECKS ===');
    
    await runTest(
      'Health Check: Gateway Health',
      'GET',
      '/health',
      { expectedStatus: 200 }
    );

    await runTest(
      'Health Check: Services Discovery',
      'GET',
      '/services',
      { expectedStatus: 200 }
    );

    await runTest(
      'Health Check: All Services Health',
      'GET',
      '/services/health',
      { expectedStatus: 200 }
    );

    // ====================================
    // 2. AUTHENTICATION SERVICE
    // ====================================
    console.log('\n📋 === AUTHENTICATION SERVICE ===');

    // Try login as regular user (student) - Expected to fail as only admins can login
    const userLoginResponse = await runTest(
      'Auth: User Login (POST) - Expected to fail (only admins)',
      'POST',
      '/api/auth/login',
      {
        body: TEST_USER,
        expectedStatus: 401 // Expected: Only admins can login
      }
    );

    // Note: Regular users cannot login through this endpoint
    // This is by design - only admins have direct login access

    // Login as admin
    const adminLoginResponse = await runTest(
      'Auth: Admin Login (POST)',
      'POST',
      '/api/auth/login',
      {
        body: TEST_ADMIN,
        expectedStatus: 200
      }
    );

    if (adminLoginResponse.data && adminLoginResponse.data.data) {
      adminToken = adminLoginResponse.data.data.accessToken;
      adminId = adminLoginResponse.data.data.user?.id;
      console.log(`   🔑 Admin token obtained: ${adminToken ? 'Yes' : 'No'}`);
    }

    // Test refresh token (if available)
    if (userToken && userLoginResponse.data?.data?.refreshToken) {
      await runTest(
        'Auth: Refresh Token (POST)',
        'POST',
        '/api/auth/refresh',
        {
          body: { refreshToken: userLoginResponse.data.data.refreshToken },
          expectedStatus: 200
        }
      );
    }

    // Test get current user
    if (userToken) {
      await runTest(
        'Auth: Get Current User (GET)',
        'GET',
        '/users/me',
        {
          headers: { Authorization: `Bearer ${userToken}` },
          expectedStatus: 200
        }
      );
    }

    // ====================================
    // 3. USER/ADMIN SERVICE
    // ====================================
    console.log('\n📋 === USER/ADMIN SERVICE ===');

    if (userToken && userId) {
      await runTest(
        'User: Get My Profile (GET)',
        'GET',
        '/api/users/me',
        {
          headers: { Authorization: `Bearer ${userToken}` },
          expectedStatus: 200
        }
      );

      await runTest(
        'User: Get User by ID (GET)',
        'GET',
        `/api/users/${userId}`,
        {
          headers: { Authorization: `Bearer ${userToken}` },
          expectedStatus: 200
        }
      );

      await runTest(
        'User: Update User Profile (PUT)',
        'PUT',
        `/api/users/${userId}`,
        {
          headers: { Authorization: `Bearer ${userToken}` },
          body: {
            full_name: 'Kiana Updated Test'
          },
          expectedStatus: 200
        }
      );
    }

    if (adminToken) {
      await runTest(
        'User: Get All Users - Admin (GET)',
        'GET',
        '/api/users',
        {
          headers: { Authorization: `Bearer ${adminToken}` },
          expectedStatus: 200
        }
      );

      await runTest(
        'User: Get User Stats - Admin (GET)',
        'GET',
        '/api/users/stats',
        {
          headers: { Authorization: `Bearer ${adminToken}` },
          expectedStatus: 200
        }
      );
    }

    // ====================================
    // 4. COURSE SERVICE
    // ====================================
    console.log('\n📋 === COURSE SERVICE ===');

    // Public endpoint - Get all courses (no auth required, but can be filtered)
    const publicCoursesResponse = await runTest(
      'Course: Get All Courses - Public (GET)',
      'GET',
      '/api/courses',
      { expectedStatus: 200 }
    );

    if (adminToken) {
      // Get all courses (admin view)
      const coursesResponse = await runTest(
        'Course: Get All Courses - Admin (GET)',
        'GET',
        '/api/courses',
        {
          headers: { Authorization: `Bearer ${adminToken}` },
          expectedStatus: 200
        }
      );

      // Create a new course
      const createCourseResponse = await runTest(
        'Course: Create New Course - Admin (POST)',
        'POST',
        '/api/courses',
        {
          headers: { Authorization: `Bearer ${adminToken}` },
          body: {
            title: 'Test Guitar Course',
            description: 'A comprehensive guitar course for beginners',
            level: 'beginner',
            price_per_session: 500000,
            duration_minutes: 90,
            max_students: 5,
            is_active: true
          },
          expectedStatus: 201
        }
      );

      if (createCourseResponse.data && createCourseResponse.data.data) {
        courseId = createCourseResponse.data.data.id;
        console.log(`   📚 Course created with ID: ${courseId}`);

        // Get specific course
        await runTest(
          'Course: Get Course by ID (GET)',
          'GET',
          `/api/courses/${courseId}`,
          { expectedStatus: 200 }
        );

        // Update course
        await runTest(
          'Course: Update Course - Admin (PUT)',
          'PUT',
          `/api/courses/${courseId}`,
          {
            headers: { Authorization: `Bearer ${adminToken}` },
            body: {
              title: 'Test Guitar Course - Updated',
              price_per_session: 550000
            },
            expectedStatus: 200
          }
        );
      }
    }

    // ====================================
    // 5. BOOKING SERVICE
    // ====================================
    console.log('\n📋 === BOOKING SERVICE ===');

    if (courseId) {
      const bookingResponse = await runTest(
        'Booking: Register for Course (POST)',
        'POST',
        '/api/register-course',
        {
          body: {
            full_name: 'Test Student',
            wa_number: '+628123456789',
            email: 'teststudent@example.com',
            course_id: courseId,
            experience_level: 'beginner',
            preferred_days: ['Saturday', 'Sunday'],
            preferred_time_range: {
              start: '09:00',
              end: '12:00'
            },
            consent: true,
            captcha_token: 'test-captcha-token',
            idempotency_key: '550e8400-e29b-41d4-a716-446655440000',
            notes: 'I am a complete beginner'
          },
          expectedStatus: 201
        }
      );

      if (bookingResponse.data && bookingResponse.data.data) {
        bookingId = bookingResponse.data.data.id;
        console.log(`   📝 Booking created with ID: ${bookingId}`);
      }
    }

    // Test booking management endpoints (admin only)
    if (adminToken) {
      await runTest(
        'Booking: Get Pending Bookings - Admin (GET)',
        'GET',
        '/api/bookings/pending',
        {
          headers: { Authorization: `Bearer ${adminToken}` },
          expectedStatus: 200
        }
      );

      if (userId) {
        await runTest(
          'Booking: Get User Bookings (GET)',
          'GET',
          `/api/bookings/user/${userId}`,
          {
            headers: { Authorization: `Bearer ${adminToken}` },
            expectedStatus: 200
          }
        );
      }
    }

    // ====================================
    // 6. CUSTOMER SERVICE (CHAT)
    // ====================================
    console.log('\n📋 === CUSTOMER SERVICE (CHAT) ===');

    // Guest creates a chat session
    const sessionResponse = await runTest(
      'Customer: Create Guest Chat Session (POST)',
      'POST',
      '/api/cs/sessions',
      {
        body: {
          guest_name: 'Test Guest User',
          guest_email: 'testguest@example.com'
        },
        expectedStatus: 201
      }
    );

    if (sessionResponse.data && sessionResponse.data.data) {
      chatSessionId = sessionResponse.data.data.session?.id || sessionResponse.data.data.session?.session_id;
      console.log(`   💬 Chat session created: ${chatSessionId}`);

      // Get session details
      await runTest(
        'Customer: Get Session Details (GET)',
        'GET',
        `/api/cs/sessions/${chatSessionId}`,
        { expectedStatus: 200 }
      );

      // Send a message as guest
      await runTest(
        'Customer: Send Message as Guest (POST)',
        'POST',
        `/api/cs/sessions/${chatSessionId}/messages`,
        {
          body: {
            content: 'Hello, I have a question about guitar courses',
            role: 'user'
          },
          expectedStatus: 201
        }
      );

      // Get messages
      await runTest(
        'Customer: Get Session Messages (GET)',
        'GET',
        `/api/cs/sessions/${chatSessionId}/messages`,
        { expectedStatus: 200 }
      );

      // Admin operations
      if (adminToken) {
        // Get all sessions (admin)
        await runTest(
          'Customer: Get All Sessions - Admin (GET)',
          'GET',
          '/api/cs/admin/sessions',
          {
            headers: { Authorization: `Bearer ${adminToken}` },
            expectedStatus: 200
          }
        );

        // Get specific session (admin)
        await runTest(
          'Customer: Get Session - Admin (GET)',
          'GET',
          `/api/cs/admin/sessions/${chatSessionId}`,
          {
            headers: { Authorization: `Bearer ${adminToken}` },
            expectedStatus: 200
          }
        );

        // Assign session to admin
        await runTest(
          'Customer: Assign Session - Admin (POST)',
          'POST',
          `/api/cs/admin/sessions/${chatSessionId}/assign`,
          {
            headers: { Authorization: `Bearer ${adminToken}` },
            body: {
              admin_id: adminId
            },
            expectedStatus: 200
          }
        );

        // Send message as admin
        await runTest(
          'Customer: Send Message as Admin (POST)',
          'POST',
          `/api/cs/admin/sessions/${chatSessionId}/messages`,
          {
            headers: { Authorization: `Bearer ${adminToken}` },
            body: {
              content: 'Hello! How can I help you with our guitar courses?',
              admin_id: adminId
            },
            expectedStatus: 201
          }
        );

        // Update session status
        await runTest(
          'Customer: Update Session Status - Admin (PATCH)',
          'PATCH',
          `/api/cs/admin/sessions/${chatSessionId}/status`,
          {
            headers: { Authorization: `Bearer ${adminToken}` },
            body: {
              status: 'open' // Valid values: 'open' or 'closed'
            },
            expectedStatus: 200
          }
        );

        // Get my assigned sessions
        await runTest(
          'Customer: Get My Assigned Sessions - Admin (GET)',
          'GET',
          '/api/cs/admin/my-sessions',
          {
            headers: { Authorization: `Bearer ${adminToken}` },
            expectedStatus: 200
          }
        );
      }
    }

    // ====================================
    // 7. AGGREGATION ENDPOINTS
    // ====================================
    console.log('\n📋 === AGGREGATION ENDPOINTS ===');

    if (adminToken) {
      await runTest(
        'Aggregation: Dashboard Stats - Admin (GET)',
        'GET',
        '/api/dashboard/stats',
        {
          headers: { Authorization: `Bearer ${adminToken}` },
          expectedStatus: 200
        }
      );

      await runTest(
        'Aggregation: Admin Dashboard (GET)',
        'GET',
        '/api/dashboard/admin',
        {
          headers: { Authorization: `Bearer ${adminToken}` },
          expectedStatus: 200
        }
      );
    }

    if (userToken && userId) {
      await runTest(
        'Aggregation: User Full Profile (GET)',
        'GET',
        `/api/profile/${userId}/full`,
        {
          headers: { Authorization: `Bearer ${userToken}` },
          expectedStatus: 200
        }
      );
    }

    // ====================================
    // 8. CLEANUP (Optional)
    // ====================================
    console.log('\n📋 === CLEANUP ===');

    // Delete test course (if created)
    if (adminToken && courseId) {
      await runTest(
        'Course: Delete Test Course - Admin (DELETE)',
        'DELETE',
        `/api/courses/${courseId}`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
          expectedStatus: 200
        }
      );
    }

    // Logout
    if (userToken) {
      await runTest(
        'Auth: User Logout (POST)',
        'POST',
        '/api/auth/logout',
        {
          headers: { Authorization: `Bearer ${userToken}` },
          expectedStatus: 200
        }
      );
    }

    if (adminToken) {
      await runTest(
        'Auth: Admin Logout (POST)',
        'POST',
        '/api/auth/logout',
        {
          headers: { Authorization: `Bearer ${adminToken}` },
          expectedStatus: 200
        }
      );
    }

  } catch (error) {
    console.error('\n❌ Critical Error:', error);
  }

  // Generate report
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${testResults.summary.total}`);
  console.log(`✅ Passed: ${testResults.summary.passed}`);
  console.log(`❌ Failed: ${testResults.summary.failed}`);
  console.log(`Success Rate: ${((testResults.summary.passed / testResults.summary.total) * 100).toFixed(2)}%`);
  console.log('='.repeat(60));

  generateReport();
}

// Run tests
runAllTests().catch(console.error);
