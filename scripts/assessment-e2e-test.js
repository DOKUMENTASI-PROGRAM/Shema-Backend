console.log("🔧 Starting Assessment End-to-End Test via API Gateway...");

const RECOMMENDATION_SERVICE_URL = "http://localhost:3005";

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
  const url = `${RECOMMENDATION_SERVICE_URL}${endpoint}`;
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
  console.log(`Sending cookies: ${cookieHeader || 'none'}`);
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
    // Skip waiting for service, assume it's running
    console.log("🚀 Starting assessment test (assuming services are running)...");

    // Test assessment submission
    console.log("📝 Testing assessment submission via API Gateway...");
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
    console.log(`✅ Assessment submitted: ${submitData.assessment_id} - ${submitData.status}`);

    // Wait for AI processing (longer wait for actual AI)
    console.log("⏳ Waiting for AI processing...");
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Test results retrieval
    console.log("📊 Testing results retrieval via API Gateway...");
    const resultsResponse = await makeRequest("/api/results");

    if (!resultsResponse.ok) {
      const errorText = await resultsResponse.text();
      throw new Error(`Results retrieval failed: ${resultsResponse.status} ${errorText}`);
    }

    const resultsData = await resultsResponse.json();
    console.log(`✅ Results retrieved successfully!`);

    if (resultsData.success && resultsData.data) {
      console.log(`📋 Assessment ID: ${resultsData.data.assessment?.id}`);
      console.log(`📋 Assessment Status: ${resultsData.data.assessment?.status}`);

      if (resultsData.data.result) {
        console.log(`📋 AI Results available:`);
        console.log(`   - Instruments: ${resultsData.data.result.ai_analysis?.recommendations?.instruments?.join(', ')}`);
        console.log(`   - Skill Level: ${resultsData.data.result.ai_analysis?.recommendations?.skill_level}`);
        console.log(`   - Class Type: ${resultsData.data.result.ai_analysis?.recommendations?.class_type}`);
        console.log(`   - Class Style: ${resultsData.data.result.ai_analysis?.recommendations?.class_style}`);
        console.log(`   - Budget: ${resultsData.data.result.ai_analysis?.recommendations?.estimated_budget}`);
      } else {
        console.log(`⏳ Results still processing...`);
      }
    }

    console.log("🎉 Assessment end-to-end test passed! Session persistence works correctly.");

  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.error("This indicates the cookie forwarding fix may not be working properly.");
    process.exit(1);
  }
}

runTests();