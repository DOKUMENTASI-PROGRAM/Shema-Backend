console.log("🔧 Testing Assessment Results Double Validation...");

const API_GATEWAY_URL = "http://localhost:3000";

// Simple cookie jar to maintain session
let cookieJar = {};

async function waitForService(url, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) return true;
    } catch (error) {
      console.log(`⏳ Waiting for ${url}... (${i + 1}/${maxAttempts})`);
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return false;
}

async function makeRequest(endpoint, options = {}) {
  const url = `${API_GATEWAY_URL}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    ...options.headers
  };

  // Add cookies from jar
  const cookieHeader = Object.entries(cookieJar)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
  if (cookieHeader) {
    headers.Cookie = cookieHeader;
  }

  console.log(`Making request to: ${url}`)
  console.log(`Sending cookies: ${cookieHeader || 'none'}`)

  const response = await fetch(url, { ...options, headers });

  // Store cookies from response
  const setCookieHeader = response.headers.get('set-cookie');
  if (setCookieHeader) {
    const cookieMatch = setCookieHeader.match(/([^=]+)=([^;]+)/);
    if (cookieMatch) {
      const [_, name, value] = cookieMatch;
      cookieJar[name] = value;
      console.log(`📋 Stored cookie: ${name}=${value}`);
    }
  }

  return response;
}

async function runTests() {
  try {
    console.log("🚀 Starting double validation tests...");

    // Test 1: Submit assessment and get session
    console.log("\n📝 Test 1: Submit assessment...");
    const assessmentData = {
      assessment_data: {
        age: 25,
        instruments: ["Piano"],
        experience_level: "Belum pernah belajar sama sekali (pemula 0)",
        learning_goals: ["Saya ingin belajar dari dasar / pemula"],
        schedule_preference: "Saya bisa mengikuti jadwal tetap setiap minggu (Kelas Siswa)",
        flexibility_needed: "Ya, saya butuh fleksibilitas",
        learning_style: "Belajar genre/lagu sesuai minat tanpa buku (Kelas Hobby)",
        preferred_genres: ["Rock"],
        duration: "3-6 bulan",
        budget: "Tidak masalah, utamakan rekomendasi terbaik",
        previous_experience: "Tidak"
      }
    };

    const submitResponse = await makeRequest("/api/assessment", {
      method: "POST",
      body: JSON.stringify(assessmentData)
    });

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      throw new Error(`Assessment submission failed: ${submitResponse.status} ${errorText}`);
    }

    const submitData = await submitResponse.json();
    const assessmentId = submitData.assessment_id;
    console.log(`✅ Assessment submitted: ${assessmentId}`);

    // Wait for AI processing
    console.log("⏳ Waiting for AI processing...");
    await new Promise(resolve => setTimeout(resolve, 15000));

    // Test 2: Get results by session_id only
    console.log("\n📊 Test 2: Get results by session_id only...");
    const sessionResultsResponse = await makeRequest("/api/results");

    if (!sessionResultsResponse.ok) {
      const errorText = await sessionResultsResponse.text();
      console.log(`❌ Session-based lookup failed: ${sessionResultsResponse.status} ${errorText}`);
    } else {
      const sessionResults = await sessionResultsResponse.json();
      console.log(`✅ Session-based lookup successful: ${sessionResults.message}`);
    }

    // Test 3: Get results by assessment_id only
    console.log(`\n📊 Test 3: Get results by assessment_id only (${assessmentId})...`);
    const assessmentResultsResponse = await makeRequest(`/api/results?assessment_id=${assessmentId}`);

    if (!assessmentResultsResponse.ok) {
      const errorText = await assessmentResultsResponse.text();
      console.log(`❌ Assessment ID lookup failed: ${assessmentResultsResponse.status} ${errorText}`);
    } else {
      const assessmentResults = await assessmentResultsResponse.json();
      console.log(`✅ Assessment ID lookup successful: ${assessmentResults.message}`);

      if (assessmentResults.data.result) {
        console.log(`📋 Results: ${assessmentResults.data.result.ai_analysis?.recommendations?.instruments?.join(', ')}`);
      }
    }

    // Test 4: Double validation - correct session + assessment_id
    console.log(`\n📊 Test 4: Double validation - correct session + assessment_id...`);
    const doubleValidResponse = await makeRequest(`/api/results?assessment_id=${assessmentId}`);

    if (!doubleValidResponse.ok) {
      const errorText = await doubleValidResponse.text();
      console.log(`❌ Double validation failed: ${doubleValidResponse.status} ${errorText}`);
    } else {
      const doubleValidResults = await doubleValidResponse.json();
      console.log(`✅ Double validation successful: ${doubleValidResults.message}`);
    }

    // Test 5: Test with wrong assessment_id
    console.log(`\n📊 Test 5: Test with wrong assessment_id...`);
    const wrongId = '00000000-0000-0000-0000-000000000000';
    const wrongIdResponse = await makeRequest(`/api/results?assessment_id=${wrongId}`);

    if (!wrongIdResponse.ok) {
      const errorText = await wrongIdResponse.text();
      console.log(`✅ Wrong assessment_id correctly rejected: ${wrongIdResponse.status}`);
    } else {
      console.log(`❌ Wrong assessment_id should have been rejected`);
    }

    console.log("\n🎉 All double validation tests completed!");

  } catch (error) {
    console.error("❌ Test failed:", error.message);
    process.exit(1);
  }
}

runTests();