console.log("🔧 Starting Recommendation Service Integration Tests...");

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
  const url = `${RECOMMENDATION_SERVICE_URL}/api${endpoint}`;
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

  console.log(`Making request to: ${url}`);
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
    // Wait for service
    console.log("⏳ Waiting for Recommendation Service...");
    const serviceReady = await waitForService(`${RECOMMENDATION_SERVICE_URL}/health`);
    if (!serviceReady) throw new Error("Recommendation service not ready");

    console.log("✅ Service ready");

    // Test health endpoint
    console.log("🏥 Testing health endpoint...");
    const healthResponse = await fetch(`${RECOMMENDATION_SERVICE_URL}/health`);
    if (!healthResponse.ok) {
      const errorText = await healthResponse.text();
      throw new Error(`Health check failed: ${healthResponse.status} ${errorText}`);
    }
    const healthData = await healthResponse.json();
    console.log(`✅ Health: ${healthData.service} - ${healthData.status}`);

    // Test assessment submission
    console.log("📝 Testing assessment submission...");
    const assessmentData = {
      assessment_data: {
        age: 25,
        instruments: ["Piano", "Gitar"],
        experience_level: "Belum pernah belajar sama sekali (pemula 0)",
        learning_goals: ["Saya ingin belajar dari dasar / pemula"],
        schedule_preference: "Saya bisa mengikuti jadwal tetap setiap minggu (Kelas Siswa)",
        flexibility_needed: "Tidak, jadwal tetap tidak masalah",
        learning_style: "Mengikuti buku dan kurikulum bertingkat (Kelas Reguler)",
        preferred_genres: ["Pop"],
        duration: "Jangka panjang (lebih dari 6 bulan)",
        budget: "Tidak masalah, utamakan rekomendasi terbaik",
        previous_experience: "Tidak"
      }
    };

    const submitResponse = await makeRequest("/assessment", {
      method: "POST",
      body: JSON.stringify(assessmentData)
    });

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      throw new Error(`Assessment submission failed: ${submitResponse.status} ${errorText}`);
    }

    const submitData = await submitResponse.json();
    console.log(`✅ Assessment submitted: ${submitData.assessment_id} - ${submitData.status}`);

    // Wait a moment for processing
    console.log("⏳ Waiting for AI processing...");
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Test results retrieval
    console.log("📊 Testing results retrieval...");
    const resultsResponse = await makeRequest("/results");

    if (!resultsResponse.ok) {
      const errorText = await resultsResponse.text();
      throw new Error(`Results retrieval failed: ${resultsResponse.status} ${errorText}`);
    }

    const resultsData = await resultsResponse.json();
    console.log(`✅ Results retrieved: Assessment found, ${resultsData.data.result ? 'results available' : 'results still processing'}`);

    if (resultsData.data.result) {
      console.log(`📋 Result details: ${JSON.stringify(resultsData.data.result, null, 2)}`);
    }

    console.log("🎉 All recommendation service integration tests passed!");

  } catch (error) {
    console.error("❌ Test failed:", error.message);
    process.exit(1);
  }
}

runTests();