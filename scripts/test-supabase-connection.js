/**
 * Test Supabase Connection
 * Verifies connectivity to Supabase production instance
 */

const { createClient } = require('@supabase/supabase-js')
const https = require('https')
const http = require('http')

// Supabase Production Configuration
const SUPABASE_URL = 'https://xlrwvzwpecprhgzfcqxw.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhscnd2endwZWNwcmhnemZjcXh3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTkxMzQwNCwiZXhwIjoyMDc1NDg5NDA0fQ.30-63oLLTrNhN0meFH3Zn5_oTOQ8KBbbHxgj_4ECDp4'

console.log('🔍 Testing Supabase Connection')
console.log('=' .repeat(80))
console.log(`📍 URL: ${SUPABASE_URL}`)
console.log('')

// Test 1: Basic HTTPS connectivity
async function testHttpsConnectivity() {
  console.log('1️⃣  Testing basic HTTPS connectivity...')
  
  return new Promise((resolve) => {
    const req = https.get(SUPABASE_URL, (res) => {
      console.log(`   ✅ HTTPS Connection: SUCCESS`)
      console.log(`   📊 Status Code: ${res.statusCode}`)
      console.log(`   🔒 TLS Version: ${res.socket.getProtocol?.() || 'N/A'}`)
      resolve(true)
    })

    req.on('error', (error) => {
      console.error(`   ❌ HTTPS Connection: FAILED`)
      console.error(`   📝 Error: ${error.message}`)
      resolve(false)
    })

    req.setTimeout(10000, () => {
      console.error(`   ❌ HTTPS Connection: TIMEOUT`)
      req.destroy()
      resolve(false)
    })
  })
}

// Test 2: DNS Resolution
async function testDnsResolution() {
  console.log('\n2️⃣  Testing DNS resolution...')
  
  const dns = require('dns').promises
  const hostname = 'xlrwvzwpecprhgzfcqxw.supabase.co'
  
  try {
    const addresses = await dns.resolve4(hostname)
    console.log(`   ✅ DNS Resolution: SUCCESS`)
    console.log(`   📍 IP Addresses: ${addresses.join(', ')}`)
    return true
  } catch (error) {
    console.error(`   ❌ DNS Resolution: FAILED`)
    console.error(`   📝 Error: ${error.message}`)
    return false
  }
}

// Test 3: Supabase REST API Health Check
async function testSupabaseHealthCheck() {
  console.log('\n3️⃣  Testing Supabase REST API health check...')
  
  return new Promise((resolve) => {
    const url = `${SUPABASE_URL}/rest/v1/`
    
    https.get(url, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    }, (res) => {
      console.log(`   ✅ REST API: SUCCESS`)
      console.log(`   📊 Status Code: ${res.statusCode}`)
      
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        console.log(`   📦 Response: ${data.substring(0, 100)}...`)
        resolve(true)
      })
    }).on('error', (error) => {
      console.error(`   ❌ REST API: FAILED`)
      console.error(`   📝 Error: ${error.message}`)
      resolve(false)
    })
  })
}

// Test 4: Supabase Client Connection
async function testSupabaseClient() {
  console.log('\n4️⃣  Testing Supabase Client connection...')
  
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    console.log(`   ✅ Client Created: SUCCESS`)

    // Try a simple query
    const { data, error, count } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .limit(1)

    if (error) {
      console.error(`   ❌ Query Execution: FAILED`)
      console.error(`   📝 Error: ${error.message}`)
      console.error(`   📝 Code: ${error.code}`)
      console.error(`   📝 Details: ${error.details}`)
      return false
    }

    console.log(`   ✅ Query Execution: SUCCESS`)
    console.log(`   📊 Users table accessible: YES`)
    console.log(`   📊 Total users: ${count !== null ? count : 'Unknown'}`)
    return true

  } catch (error) {
    console.error(`   ❌ Supabase Client: FAILED`)
    console.error(`   📝 Error: ${error.message}`)
    console.error(`   📝 Stack: ${error.stack?.split('\n')[0]}`)
    return false
  }
}

// Test 5: Database Query Test
async function testDatabaseQuery() {
  console.log('\n5️⃣  Testing actual database query...')
  
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Test query to users table
    const { data, error } = await supabase
      .from('users')
      .select('id, email, role')
      .limit(3)

    if (error) {
      console.error(`   ❌ Database Query: FAILED`)
      console.error(`   📝 Error: ${error.message}`)
      return false
    }

    console.log(`   ✅ Database Query: SUCCESS`)
    console.log(`   📊 Retrieved ${data?.length || 0} users`)
    if (data && data.length > 0) {
      console.log(`   👤 Sample user: ${data[0].email} (${data[0].role})`)
    }
    return true

  } catch (error) {
    console.error(`   ❌ Database Query: FAILED`)
    console.error(`   📝 Error: ${error.message}`)
    return false
  }
}

// Test 6: Check courses table with instrument column
async function testCoursesTable() {
  console.log('\n6️⃣  Testing courses table (with instrument column)...')
  
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Test query to courses table
    const { data, error } = await supabase
      .from('courses')
      .select('id, title, instrument')
      .limit(3)

    if (error) {
      console.error(`   ❌ Courses Query: FAILED`)
      console.error(`   📝 Error: ${error.message}`)
      console.error(`   📝 Code: ${error.code}`)
      
      if (error.message.includes('instrument')) {
        console.error(`   ⚠️  Instrument column might not exist or schema cache needs refresh`)
      }
      return false
    }

    console.log(`   ✅ Courses Query: SUCCESS`)
    console.log(`   📊 Retrieved ${data?.length || 0} courses`)
    if (data && data.length > 0) {
      console.log(`   🎵 Sample course: ${data[0].title} (${data[0].instrument || 'N/A'})`)
    }
    return true

  } catch (error) {
    console.error(`   ❌ Courses Query: FAILED`)
    console.error(`   📝 Error: ${error.message}`)
    return false
  }
}

// Run all tests
async function runAllTests() {
  const results = {
    https: false,
    dns: false,
    healthCheck: false,
    client: false,
    query: false,
    courses: false
  }

  results.dns = await testDnsResolution()
  results.https = await testHttpsConnectivity()
  results.healthCheck = await testSupabaseHealthCheck()
  results.client = await testSupabaseClient()
  results.query = await testDatabaseQuery()
  results.courses = await testCoursesTable()

  // Summary
  console.log('\n' + '='.repeat(80))
  console.log('📊 TEST SUMMARY')
  console.log('='.repeat(80))
  
  const total = Object.keys(results).length
  const passed = Object.values(results).filter(v => v).length
  const percentage = ((passed / total) * 100).toFixed(1)

  console.log(`DNS Resolution:          ${results.dns ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`HTTPS Connectivity:      ${results.https ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`REST API Health:         ${results.healthCheck ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`Supabase Client:         ${results.client ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`Database Query:          ${results.query ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`Courses Table (w/ inst): ${results.courses ? '✅ PASS' : '❌ FAIL'}`)
  
  console.log('\n' + '-'.repeat(80))
  console.log(`Overall: ${passed}/${total} tests passed (${percentage}%)`)
  
  if (passed === total) {
    console.log('\n🎉 ALL TESTS PASSED! Supabase connection is fully operational.')
  } else if (passed > 0) {
    console.log('\n⚠️  PARTIAL SUCCESS. Some connectivity issues detected.')
  } else {
    console.log('\n❌ ALL TESTS FAILED. Cannot connect to Supabase.')
  }
  
  console.log('='.repeat(80))

  // Exit with appropriate code
  process.exit(passed === total ? 0 : 1)
}

// Execute tests
runAllTests().catch(error => {
  console.error('\n💥 Fatal error during testing:')
  console.error(error)
  process.exit(1)
})
