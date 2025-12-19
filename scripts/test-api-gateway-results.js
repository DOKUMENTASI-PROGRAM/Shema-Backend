/**
 * Test script for API Gateway cookie forwarding and query parameter forwarding
 * Tests both session_id (cookie-based) and assessment_id (query parameter) approaches
 */

async function testResultsEndpoint() {
  console.log('🧪 Testing API Gateway Results Endpoint\n')

  try {
    // First, create a test assessment to get a valid assessment_id
    console.log('1. Creating test assessment...')

    const assessmentResponse = await fetch('http://localhost:3000/api/assessment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        assessment_data: {
          age: 25,
          instruments: ["guitar", "piano"],
          experience_level: "beginner",
          learning_goals: ["career_advancement", "personal_enjoyment"],
          learning_style: "visual",
          preferred_genres: ["pop", "rock"],
          time_commitment: "2-3 hours per week",
          budget: "moderate"
        }
      })
    })

    if (!assessmentResponse.ok) {
      const errorText = await assessmentResponse.text()
      throw new Error(`Failed to create assessment: ${assessmentResponse.status} - ${errorText}`)
    }

    const assessmentData = await assessmentResponse.json()
    const assessmentId = assessmentData.assessment_id
    console.log(`✅ Assessment created with ID: ${assessmentId}`)

    // Extract session cookie from response
    const setCookieHeader = assessmentResponse.headers.get('set-cookie')
    const sessionCookie = setCookieHeader ? setCookieHeader.split(';')[0] : null
    console.log(`🍪 Session cookie: ${sessionCookie ? 'Found' : 'Not found'}`)

    // Wait a moment for processing
    console.log('⏳ Waiting for assessment processing...')
    await new Promise(resolve => setTimeout(resolve, 2000))

    console.log('\n2. Testing results retrieval with assessment_id (query parameter)...')

    const resultsWithAssessmentId = await fetch(`http://localhost:3000/api/results?assessment_id=${assessmentId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    })

    console.log(`Status: ${resultsWithAssessmentId.status}`)
    if (resultsWithAssessmentId.ok) {
      const data = await resultsWithAssessmentId.json()
      console.log('✅ Success with assessment_id parameter')
      console.log(`Assessment ID: ${data.data.assessment?.id}`)
      console.log(`Result exists: ${!!data.data.result}`)
    } else {
      const error = await resultsWithAssessmentId.text()
      console.log('❌ Failed:', error)
    }

    console.log('\n3. Testing results retrieval with session_id (cookie)...')

    if (sessionCookie) {
      const resultsWithCookie = await fetch('http://localhost:3000/api/results', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sessionCookie
        }
      })

      console.log(`Status: ${resultsWithCookie.status}`)
      if (resultsWithCookie.ok) {
        const data = await resultsWithCookie.json()
        console.log('✅ Success with session cookie')
        console.log(`Assessment ID: ${data.data.assessment?.id}`)
        console.log(`Result exists: ${!!data.data.result}`)
      } else {
        const error = await resultsWithCookie.text()
        console.log('❌ Failed:', error)
      }
    } else {
      console.log('⚠️  No session cookie found, skipping cookie test')
    }

    console.log('\n4. Testing results retrieval with both assessment_id and cookie (should prioritize assessment_id)...')

    if (sessionCookie) {
      const resultsWithBoth = await fetch(`http://localhost:3000/api/results?assessment_id=${assessmentId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sessionCookie
        }
      })

      console.log(`Status: ${resultsWithBoth.status}`)
      if (resultsWithBoth.ok) {
        const data = await resultsWithBoth.json()
        console.log('✅ Success with both parameters')
        console.log(`Assessment ID: ${data.data.assessment?.id}`)
        console.log(`Result exists: ${!!data.data.result}`)
      } else {
        const error = await resultsWithBoth.text()
        console.log('❌ Failed:', error)
      }
    }

    console.log('\n🎉 All tests completed!')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

// Run the test
testResultsEndpoint()