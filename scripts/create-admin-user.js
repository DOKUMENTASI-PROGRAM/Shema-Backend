#!/usr/bin/env node

/**
 * Create Admin User in Production Database via Auth Service
 */

const http = require('http')

const adminData = {
  email: 'admin@shemamusic.com',
  password: 'Admin123!',
  full_name: 'System Administrator',
  role: 'admin'
}

async function createAdminUser() {
  console.log('🔧 Creating admin user via Auth Service...')
  console.log(`� Email: ${adminData.email}`)
  
  const postData = JSON.stringify(adminData)
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/register',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  }
  
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = ''
      
      res.on('data', (chunk) => {
        data += chunk
      })
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data)
          
          if (res.statusCode === 201 || res.statusCode === 200) {
            console.log('✅ Admin user created successfully!')
            console.log('📧 Email:', adminData.email)
            console.log('🔑 Password:', adminData.password)
            console.log('👤 Name:', adminData.full_name)
            console.log('🎭 Role:', adminData.role)
            console.log('\n💡 You can now login with these credentials')
            console.log('\nResponse:', JSON.stringify(response, null, 2))
            resolve(response)
          } else if (res.statusCode === 400 && response.error && response.error.message && response.error.message.includes('already exists')) {
            console.log('⚠️  Admin user already exists')
            console.log('📧 Email:', adminData.email)
            console.log('🔑 Try logging in with password: Admin123!')
            resolve(response)
          } else {
            console.error('❌ Failed to create admin user')
            console.error('Status:', res.statusCode)
            console.error('Response:', JSON.stringify(response, null, 2))
            reject(new Error(response.error?.message || 'Unknown error'))
          }
        } catch (error) {
          console.error('❌ Error parsing response:', error.message)
          console.error('Raw data:', data)
          reject(error)
        }
      })
    })
    
    req.on('error', (error) => {
      console.error('❌ Request error:', error.message)
      reject(error)
    })
    
    req.write(postData)
    req.end()
  })
}

createAdminUser().catch((error) => {
  console.error('❌ Script failed:', error.message)
  process.exit(1)
})
