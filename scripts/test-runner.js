#!/usr/bin/env node

/**
 * Quick Test Runner
 * Simplified script to run tests with proper setup checks
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkPrerequisites() {
  log('\n🔍 Checking prerequisites...', 'cyan');

  // Check if .env.test exists
  const envTestPath = path.join(__dirname, '..', '.env.test');
  if (!fs.existsSync(envTestPath)) {
    log('❌ .env.test file not found!', 'red');
    log('   Please create .env.test with Supabase credentials', 'yellow');
    process.exit(1);
  }
  log('✅ .env.test found', 'green');

  // Check if Redis is running
  try {
    execSync('redis-cli ping', { stdio: 'pipe' });
    log('✅ Redis is running', 'green');
  } catch (error) {
    log('❌ Redis is not running!', 'red');
    log('   Please start Redis: redis-server', 'yellow');
    process.exit(1);
  }

  // Check if Auth Service is running
  try {
    const response = execSync('curl -s http://localhost:3001/health', { 
      stdio: 'pipe',
      timeout: 3000
    }).toString();
    
    if (response.includes('healthy')) {
      log('✅ Auth Service is running on port 3001', 'green');
    } else {
      throw new Error('Service not healthy');
    }
  } catch (error) {
    log('⚠️  Auth Service is not running on port 3001', 'yellow');
    log('   Start it with: cd services/auth && npm run dev', 'yellow');
    
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    readline.question('   Continue anyway? (y/N) ', (answer) => {
      readline.close();
      if (answer.toLowerCase() !== 'y') {
        process.exit(1);
      }
      runTests();
    });
    return false;
  }

  // Check if Booking Service is running
  try {
    const response = execSync('curl -s http://localhost:3004/health', { 
      stdio: 'pipe',
      timeout: 3000
    }).toString();
    
    if (response.includes('healthy')) {
      log('✅ Booking Service is running on port 3004', 'green');
    } else {
      throw new Error('Service not healthy');
    }
  } catch (error) {
    log('⚠️  Booking Service is not running on port 3004', 'yellow');
    log('   Start it with: cd services/booking && npm run dev', 'yellow');
  }

  return true;
}

function runTests() {
  log('\n🧪 Running integration tests...', 'bright');
  log('📍 Environment: ' + (process.env.NODE_ENV || 'test'), 'cyan');
  log('🗄️  Database: Remote Supabase (Production)', 'cyan');
  log('', 'reset');

  // Run Jest
  const jestArgs = process.argv.slice(2);
  const jestCommand = ['jest', ...jestArgs].join(' ');

  const testProcess = spawn('npx', ['jest', ...jestArgs], {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      FORCE_COLOR: '1'
    }
  });

  testProcess.on('close', (code) => {
    if (code === 0) {
      log('\n✅ All tests passed!', 'green');
      log('📊 Check coverage report in ./coverage/index.html', 'cyan');
    } else {
      log('\n❌ Some tests failed', 'red');
      log('💡 Check the error messages above for details', 'yellow');
    }
    process.exit(code);
  });

  testProcess.on('error', (error) => {
    log(`\n❌ Failed to run tests: ${error.message}`, 'red');
    process.exit(1);
  });
}

// Main execution
log('╔══════════════════════════════════════════════════╗', 'bright');
log('║   Shema Music Backend - Integration Tests       ║', 'bright');
log('╚══════════════════════════════════════════════════╝', 'bright');

if (checkPrerequisites()) {
  runTests();
}
