#!/usr/bin/env node
/**
 * Verification Script
 * Checks if the codebase cleanup was successful
 */

const fs = require('fs')
const path = require('path')

console.log('🔍 Verifying Code Cleanup & Refactoring...\n')

let errors = 0
let warnings = 0
let success = 0

// Files that should NOT exist anymore
const removedFiles = [
  'FIXES_APPLIED.md',
  'QUICK_TEST_GUIDE.md',
  'SUPABASE_CONNECTION_TEST_RESULTS.md',
  'TESTING_EXECUTION_REPORT.md',
  'TESTING_READY.md',
  'TEST_RESULTS.md',
  'services/api-gateway/start-server.bat',
  'services/auth/start-server.bat',
  'services/booking/package-lock.json',
  'scripts/test-supabase.js',
]

// Files that SHOULD exist
const requiredFiles = [
  'docs/development/FIXES_APPLIED.md',
  'docs/development/BEST_PRACTICES.md',
  'docs/development/CODE_CLEANUP_REPORT.md',
  'docs/testing/QUICK_TEST_GUIDE.md',
  'docs/testing/SUPABASE_CONNECTION_TEST_RESULTS.md',
  'docs/testing/TESTING_EXECUTION_REPORT.md',
  'docs/testing/TESTING_READY.md',
  'docs/testing/TEST_RESULTS.md',
  'docs/CLEANUP_SUMMARY.md',
  'shared/middleware/cors.ts',
  'shared/middleware/timeout.ts',
  'shared/utils/serviceCall.ts',
  '.env.template',
]

console.log('1️⃣ Checking removed files...')
removedFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file)
  if (fs.existsSync(filePath)) {
    console.log(`  ❌ File should be removed: ${file}`)
    errors++
  } else {
    console.log(`  ✅ Removed: ${file}`)
    success++
  }
})

console.log('\n2️⃣ Checking required files...')
requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file)
  if (!fs.existsSync(filePath)) {
    console.log(`  ❌ File missing: ${file}`)
    errors++
  } else {
    console.log(`  ✅ Found: ${file}`)
    success++
  }
})

console.log('\n3️⃣ Checking for hardcoded credentials...')
const migrationFile = path.join(__dirname, 'apply-migration-pg.js')
if (fs.existsSync(migrationFile)) {
  const content = fs.readFileSync(migrationFile, 'utf-8')
  if (content.includes('postgresql://') && !content.includes('process.env')) {
    console.log('  ❌ Hardcoded credentials found in apply-migration-pg.js')
    errors++
  } else if (content.includes('process.env.DATABASE_URL')) {
    console.log('  ✅ No hardcoded credentials in apply-migration-pg.js')
    success++
  } else {
    console.log('  ⚠️  Unable to verify apply-migration-pg.js')
    warnings++
  }
}

console.log('\n4️⃣ Checking CORS configuration...')
const checkCORS = (serviceName, filePath) => {
  const fullPath = path.join(__dirname, '..', filePath)
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf-8')
    if (content.includes('TODO') && content.includes('CORS')) {
      console.log(`  ⚠️  ${serviceName}: TODO comment still exists`)
      warnings++
    } else if (content.includes('corsOrigin') || content.includes('CORS_ALLOWED_ORIGINS')) {
      console.log(`  ✅ ${serviceName}: CORS properly configured`)
      success++
    } else {
      console.log(`  ⚠️  ${serviceName}: Unable to verify CORS config`)
      warnings++
    }
  }
}

checkCORS('API Gateway', 'services/api-gateway/src/index.ts')
checkCORS('Auth Service', 'services/auth/src/index.ts')
checkCORS('Booking Service', 'services/booking/src/index.ts')

console.log('\n5️⃣ Checking documentation structure...')
const docsStructure = [
  'docs/architecture',
  'docs/authentication',
  'docs/development',
  'docs/getting-started',
  'docs/services',
  'docs/testing',
]

docsStructure.forEach(dir => {
  const dirPath = path.join(__dirname, '..', dir)
  if (!fs.existsSync(dirPath)) {
    console.log(`  ❌ Directory missing: ${dir}`)
    errors++
  } else {
    const files = fs.readdirSync(dirPath)
    console.log(`  ✅ ${dir}: ${files.length} files`)
    success++
  }
})

// Summary
console.log('\n' + '='.repeat(50))
console.log('📊 Verification Summary')
console.log('='.repeat(50))
console.log(`✅ Success: ${success}`)
console.log(`⚠️  Warnings: ${warnings}`)
console.log(`❌ Errors: ${errors}`)
console.log('='.repeat(50))

if (errors === 0) {
  console.log('\n🎉 All checks passed! Code cleanup successful.')
  process.exit(0)
} else {
  console.log('\n⚠️  Some checks failed. Please review the errors above.')
  process.exit(1)
}
