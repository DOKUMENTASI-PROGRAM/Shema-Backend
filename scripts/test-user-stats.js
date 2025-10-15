// Quick test user stats endpoint
const baseURL = 'http://localhost:3000';

async function testUserStats() {
  try {
    // Login first
    const loginRes = await fetch(`${baseURL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@shemamusic.com',
        password: 'Admin123!'
      })
    });
    
    const loginData = await loginRes.json();
    const token = loginData.data.accessToken;
    
    console.log('✅ Login successful');
    
    // Test user stats
    const statsRes = await fetch(`${baseURL}/api/users/stats`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Status:', statsRes.status);
    const statsData = await statsRes.json();
    console.log('Response:', JSON.stringify(statsData, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testUserStats();
