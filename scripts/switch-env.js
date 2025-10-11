#!/usr/bin/env node

/**
 * Environment Switcher Script
 * Easily switch between development and production environments
 *
 * Usage:
 *   npm run env:dev     - Switch to development environment
 *   npm run env:prod    - Switch to production environment
 *   npm run env:status  - Show current environment status
 */

const fs = require('fs')
const path = require('path')

const ENVIRONMENTS = ['development', 'production']
const MAIN_ENV_FILE = '.env'
const SHARED_CONFIG_DIR = path.join(__dirname, 'shared', 'config')

function getCurrentEnvironment() {
  try {
    const envContent = fs.readFileSync(MAIN_ENV_FILE, 'utf8')
    const nodeEnvMatch = envContent.match(/NODE_ENV=(.+)/)
    return nodeEnvMatch ? nodeEnvMatch[1].trim() : 'development'
  } catch {
    return 'development'
  }
}

function switchEnvironment(targetEnv) {
  if (!ENVIRONMENTS.includes(targetEnv)) {
    console.error(`❌ Invalid environment: ${targetEnv}`)
    console.log(`Available environments: ${ENVIRONMENTS.join(', ')}`)
    process.exit(1)
  }

  const envFile = `.env.${targetEnv}`

  if (!fs.existsSync(envFile)) {
    console.error(`❌ Environment file not found: ${envFile}`)
    console.log('Please create the environment file first.')
    process.exit(1)
  }

  try {
    // Copy the target environment file to .env
    const envContent = fs.readFileSync(envFile, 'utf8')
    fs.writeFileSync(MAIN_ENV_FILE, envContent)

    console.log(`✅ Switched to ${targetEnv} environment`)
    console.log(`📄 Copied ${envFile} to ${MAIN_ENV_FILE}`)

    // Show key configuration
    const supabaseUrlMatch = envContent.match(/SUPABASE_URL=(.+)/)
    if (supabaseUrlMatch) {
      console.log(`🔗 Supabase: ${supabaseUrlMatch[1]}`)
    }

  } catch (error) {
    console.error('❌ Failed to switch environment:', error.message)
    process.exit(1)
  }
}

function showEnvironmentStatus() {
  const currentEnv = getCurrentEnvironment()
  console.log(`🌍 Current Environment: ${currentEnv}`)
  console.log('')

  // Check available environment files
  console.log('📁 Available Environments:')
  ENVIRONMENTS.forEach(env => {
    const envFile = `.env.${env}`
    const exists = fs.existsSync(envFile)
    const status = exists ? '✅' : '❌'
    const current = env === currentEnv ? ' (current)' : ''
    console.log(`  ${status} ${env}${current}`)
  })

  console.log('')
  console.log('🔧 Configuration:')

  try {
    const envContent = fs.readFileSync(MAIN_ENV_FILE, 'utf8')
    const supabaseUrl = envContent.match(/SUPABASE_URL=(.+)/)?.[1]
    const nodeEnv = envContent.match(/NODE_ENV=(.+)/)?.[1]

    console.log(`  Environment: ${nodeEnv}`)
    console.log(`  Supabase URL: ${supabaseUrl}`)
  } catch {
    console.log('  ❌ Could not read configuration')
  }
}

function showUsage() {
  console.log('Environment Switcher')
  console.log('')
  console.log('Usage:')
  console.log('  npm run env:dev     - Switch to development environment')
  console.log('  npm run env:prod    - Switch to production environment')
  console.log('  npm run env:status  - Show current environment status')
  console.log('')
  console.log('Available environments:')
  ENVIRONMENTS.forEach(env => console.log(`  - ${env}`))
}

// Main execution
const command = process.argv[2]

switch (command) {
  case 'dev':
  case 'development':
    switchEnvironment('development')
    break

  case 'prod':
  case 'production':
    switchEnvironment('production')
    break

  case 'status':
    showEnvironmentStatus()
    break

  default:
    showUsage()
    break
}