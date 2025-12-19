/**
 * Test script to verify cookie forwarding issue in detail
 */

const BASE_URL = 'http://localhost:3000' // API Gateway
const RECOMMENDATION_URL = 'http://localhost:3005' // Direct to recommendation service

async function testCookieForwardingDetail() {
  console.log('🔍 Detailed Cookie Forwarding Test\n')

  // Step 1: Create assessment through gateway
  console.log('Step 1: Create assessment through API Gateway')
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
  const gatewayCookies = gatewayResponse.headers.get('set-cookie')
  console.log('Gateway assessment created:', gatewayData.success)
  console.log('Gateway cookies received:', gatewayCookies)

  if (!gatewayData.success || !gatewayCookies) {
    console.error('Failed to create assessment or get cookies')
    return
  }

  // Extract sid from cookie
  const sidMatch = gatewayCookies.match(/sid=([^;]+)/)
  const sid = sidMatch ? sidMatch[1] : null
  console.log('Extracted sid:', sid)

  // Step 2: Wait for processing
  console.log('\nStep 2: Waiting for AI processing...')
  await new Promise(resolve => setTimeout(resolve, 15000)) // Wait 15 seconds

  // Step 3: Test direct access to recommendation service with the sid
  console.log('\nStep 3: Test direct access to recommendation service with extracted sid')
  const directResultsResponse = await fetch(`${RECOMMENDATION_URL}/api/results`, {
    method: 'GET',
    headers: {
      'Cookie': `sid=${sid}`
    }
  })

  const directResults = await directResultsResponse.json()
  console.log('Direct results status:', directResultsResponse.status)
  console.log('Direct results success:', directResults.success)

  // Step 4: Test through API Gateway with manual cookie forwarding
  console.log('\nStep 4: Test through API Gateway with manual cookie forwarding')
  console.log('Sending cookie:', `sid=${sid}`)
  const gatewayResultsResponse = await fetch(`${BASE_URL}/api/results`, {
    method: 'GET',
    headers: {
      'Cookie': `sid=${sid}`,
      'User-Agent': 'TestScript/1.0'
    }
  })

  console.log('Gateway request headers sent:', {
    'Cookie': `sid=${sid}`,
    'User-Agent': 'TestScript/1.0'
  })

  const gatewayResults = await gatewayResultsResponse.json()
  console.log('Gateway results status:', gatewayResultsResponse.status)
  console.log('Gateway results success:', gatewayResults.success)

  // Step 5: Test with assessment_id parameter
  console.log('\nStep 5: Test with assessment_id parameter through gateway')
  const assessmentId = gatewayData.assessment_id
  const gatewayWithIdResponse = await fetch(`${BASE_URL}/api/results?assessment_id=${assessmentId}`, {
    method: 'GET',
    headers: {
      'Cookie': `sid=${sid}`
    }
  })

  const gatewayWithIdResults = await gatewayWithIdResponse.json()
  console.log('Gateway with ID results status:', gatewayWithIdResponse.status)
  console.log('Gateway with ID results success:', gatewayWithIdResults.success)

  console.log('\n📊 Summary:')
  console.log('- Direct access with sid:', directResults.success ? '✅ WORKS' : '❌ FAILS')
  console.log('- Gateway access with sid:', gatewayResults.success ? '✅ WORKS' : '❌ FAILS')
  console.log('- Gateway access with assessment_id:', gatewayWithIdResults.success ? '✅ WORKS' : '❌ FAILS')
}

// Run the test
testCookieForwardingDetail().catch(console.error)