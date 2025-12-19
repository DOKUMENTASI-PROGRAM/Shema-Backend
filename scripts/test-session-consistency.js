/**
 * Test to verify if the issue is with session creation vs session retrieval
 */

const BASE_URL = 'http://localhost:3000' // API Gateway
const RECOMMENDATION_URL = 'http://localhost:3005' // Direct to recommendation service

async function testSessionConsistency() {
  console.log('🔍 Testing Session Consistency\n')

  // Step 1: Create assessment directly to recommendation service
  console.log('Step 1: Create assessment directly to recommendation service')
  const directAssessmentResponse = await fetch(`${RECOMMENDATION_URL}/api/assessment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      assessment_data: {
        age: 25,
        budget: "Tidak masalah, utamakan rekomendasi terbaik",
        duration: "3-6 bulan",
        instruments: ["Piano"],
        learning_goals: ["Saya ingin belajar dari dasar / pemula"],
        learning_style: "Belajar genre/lagu sesuai minat tanpa buku (Kelas Hobby)",
        experience_level: "Belum pernah belajar sama sekali (pemula)",
        preferred_genres: ["Rock"],
        flexibility_needed: "Ya, saya butuh fleksibilitas",
        previous_experience: "Tidak",
        schedule_preference: "Saya bisa mengikuti jadwal tetap setiap minggu (Kelas Siswa)"
      }
    })
  })

  const directAssessmentData = await directAssessmentResponse.json()
  const directCookies = directAssessmentResponse.headers.get('set-cookie')
  console.log('Direct assessment created:', directAssessmentData.success)
  console.log('Direct cookies:', directCookies)

  if (!directAssessmentData.success || !directCookies) {
    console.error('Failed to create assessment directly')
    return
  }

  // Extract sid
  const sidMatch = directCookies.match(/sid=([^;]+)/)
  const sid = sidMatch ? sidMatch[1] : null
  console.log('Extracted sid:', sid)

  // Step 2: Wait for processing
  console.log('\nStep 2: Waiting for AI processing...')
  await new Promise(resolve => setTimeout(resolve, 15000))

  // Step 3: Test results directly (should work)
  console.log('\nStep 3: Test results directly with same cookie')
  const directResultsResponse = await fetch(`${RECOMMENDATION_URL}/api/results`, {
    method: 'GET',
    headers: {
      'Cookie': `sid=${sid}`
    }
  })

  const directResults = await directResultsResponse.json()
  console.log('Direct results status:', directResultsResponse.status)
  console.log('Direct results success:', directResults.success)

  // Step 4: Test results through gateway with same cookie (this is the problem)
  console.log('\nStep 4: Test results through gateway with same cookie')
  const gatewayResultsResponse = await fetch(`${BASE_URL}/api/results`, {
    method: 'GET',
    headers: {
      'Cookie': `sid=${sid}`
    }
  })

  const gatewayResults = await gatewayResultsResponse.json()
  console.log('Gateway results status:', gatewayResultsResponse.status)
  console.log('Gateway results success:', gatewayResults.success)

  console.log('\n📊 Analysis:')
  console.log('- Direct access works:', directResults.success ? '✅' : '❌')
  console.log('- Gateway access fails:', !gatewayResults.success ? '✅ (confirms issue)' : '❌ (unexpected)')
  console.log('- Issue: Cookie forwarding through API Gateway')
}

// Run the test
testSessionConsistency().catch(console.error)