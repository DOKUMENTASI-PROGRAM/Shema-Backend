/**
 * Test script to verify cookie forwarding between API Gateway and Recommendation Service
 * This will help identify if session_id inconsistency is caused by cookie forwarding issues
 */

const BASE_URL = 'http://localhost:3000' // API Gateway
const RECOMMENDATION_URL = 'http://localhost:3005' // Direct to recommendation service

async function testCookieForwarding() {
  console.log('🧪 Testing Cookie Forwarding Between API Gateway and Recommendation Service\n')

  // Test 1: Direct request to recommendation service
  console.log('Test 1: Direct request to recommendation service (port 3005)')
  try {
    const directResponse = await fetch(`${RECOMMENDATION_URL}/api/assessment`, {
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

    const directData = await directResponse.json()
    console.log('Direct assessment response status:', directResponse.status)
    console.log('Direct assessment response:', JSON.stringify(directData, null, 2))

    // Get cookies from response
    const directCookies = directResponse.headers.get('set-cookie')
    console.log('Direct cookies set:', directCookies)

    if (directData.success && directData.assessment_id) {
      console.log('Waiting for AI processing to complete...')
      await new Promise(resolve => setTimeout(resolve, 10000)) // Wait 10 seconds

      // Try to get results directly
      const directResultsResponse = await fetch(`${RECOMMENDATION_URL}/api/results`, {
        method: 'GET',
        headers: {
          'Cookie': directCookies || ''
        }
      })

      const directResults = await directResultsResponse.json()
      console.log('Direct results response status:', directResultsResponse.status)
      console.log('Direct results response:', JSON.stringify(directResults, null, 2))
    }

  } catch (error) {
    console.error('Direct request failed:', error.message)
  }

  console.log('\n' + '='.repeat(50) + '\n')

  // Test 2: Request through API Gateway
  console.log('Test 2: Request through API Gateway (port 3000)')
  try {
    const gatewayResponse = await fetch(`${BASE_URL}/api/assessment`, {
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

    const gatewayData = await gatewayResponse.json()
    console.log('Gateway assessment response status:', gatewayResponse.status)
    console.log('Gateway assessment response:', JSON.stringify(gatewayData, null, 2))

    // Get cookies from response
    const gatewayCookies = gatewayResponse.headers.get('set-cookie')
    console.log('Gateway cookies set:', gatewayCookies)

    if (gatewayData.success && gatewayData.assessment_id) {
      console.log('Waiting for AI processing to complete...')
      await new Promise(resolve => setTimeout(resolve, 10000)) // Wait 10 seconds

      // Try to get results through gateway
      const gatewayResultsResponse = await fetch(`${BASE_URL}/api/results`, {
        method: 'GET',
        headers: {
          'Cookie': gatewayCookies || ''
        }
      })

      const gatewayResults = await gatewayResultsResponse.json()
      console.log('Gateway results response status:', gatewayResultsResponse.status)
      console.log('Gateway results response:', JSON.stringify(gatewayResults, null, 2))

      // Try with assessment_id parameter
      const gatewayAssessmentId = gatewayData.assessment_id
      console.log('\nTrying with assessment_id parameter...')
      const gatewayResultsWithIdResponse = await fetch(`${BASE_URL}/api/results?assessment_id=${gatewayAssessmentId}`, {
        method: 'GET',
        headers: {
          'Cookie': gatewayCookies || ''
        }
      })

      const gatewayResultsWithId = await gatewayResultsWithIdResponse.json()
      console.log('Gateway results with assessment_id status:', gatewayResultsWithIdResponse.status)
      console.log('Gateway results with assessment_id:', JSON.stringify(gatewayResultsWithId, null, 2))
    }

  } catch (error) {
    console.error('Gateway request failed:', error.message)
  }

  console.log('\n' + '='.repeat(50) + '\n')
  console.log('🎯 Analysis:')
  console.log('If direct request works but gateway request fails, cookie forwarding is the issue.')
  console.log('If both fail, the problem is elsewhere (database, Redis, etc.).')
}

// Run the test
testCookieForwarding().catch(console.error)