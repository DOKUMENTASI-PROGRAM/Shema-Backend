#!/usr/bin/env node

/**
 * Test Runner Script
 * Runs tests against different environments
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const environments = {
  local: {
    SUPABASE_URL: 'http://127.0.0.1:54321',
    SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz',
    SUPABASE_ANON_KEY: 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'
  },
  remote: {
    SUPABASE_URL: 'https://xlrwvzwpecprhgzfcqxw.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhscnd2endwZWNwcmhnemZjcXh3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTkxMzQwNCwiZXhwIjoyMDc1NDg5NDA0fQ.30-63oLLTrNhN0meFH3Zn5_oTOQ8KBbbHxgj_4ECDp4',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhscnd2endwZWNwcmhnemZjcXh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MTM0MDQsImV4cCI6MjA3NTQ4OTQwNH0.DMYh5ppj7B5ihblJzqrvOP9i8lrghStIPd1rXe6woWE'
  }
};

function updateEnvFile(env) {
  const envTestPath = path.join(__dirname, '..', '.env.test');
  let envContent = fs.readFileSync(envTestPath, 'utf8');

  // Update Supabase configuration
  envContent = envContent.replace(
    /SUPABASE_URL=.*/,
    `SUPABASE_URL=${environments[env].SUPABASE_URL}`
  );
  envContent = envContent.replace(
    /SUPABASE_SERVICE_ROLE_KEY=.*/,
    `SUPABASE_SERVICE_ROLE_KEY=${environments[env].SUPABASE_SERVICE_ROLE_KEY}`
  );
  envContent = envContent.replace(
    /SUPABASE_ANON_KEY=.*/,
    `SUPABASE_ANON_KEY=${environments[env].SUPABASE_ANON_KEY}`
  );

  fs.writeFileSync(envTestPath, envContent);
  console.log(`✅ Updated .env.test for ${env} environment`);
}

function runTests(env) {
  console.log(`🚀 Running tests against ${env} Supabase...`);

  try {
    updateEnvFile(env);

    // Run tests (auth service sudah running)
    execSync('npm test', { stdio: 'inherit' });
    console.log(`✅ All tests passed for ${env} environment!`);
  } catch (error) {
    console.error(`❌ Tests failed for ${env} environment:`, error.message);
    process.exit(1);
  }
}

const env = process.argv[2] || 'local';

if (!environments[env]) {
  console.error(`❌ Invalid environment: ${env}. Available: local, remote`);
  process.exit(1);
}

// Validation untuk remote environment sudah tidak diperlukan karena credentials hardcoded
console.log(`\n🔧 Environment: ${env}`);
console.log(`📍 Supabase URL: ${environments[env].SUPABASE_URL}\n`);

runTests(env);