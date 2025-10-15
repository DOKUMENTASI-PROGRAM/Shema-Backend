// Script untuk apply migration ke Supabase Production
// Usage: node scripts/apply-migration.js <migration-file>

const fs = require('fs');
const path = require('path');
const https = require('https');

// Load environment
const envPath = path.join(__dirname, '..', '.env.production');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

const SUPABASE_URL = env.SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

// Get migration file from command line
const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error('Usage: node scripts/apply-migration.js <migration-file>');
  process.exit(1);
}

const migrationPath = path.join(__dirname, '..', migrationFile);
if (!fs.existsSync(migrationPath)) {
  console.error(`Migration file not found: ${migrationPath}`);
  process.exit(1);
}

const sql = fs.readFileSync(migrationPath, 'utf-8');

console.log(`\n=== Applying Migration to Production ===`);
console.log(`File: ${migrationFile}`);
console.log(`URL: ${SUPABASE_URL}`);
console.log(`SQL Length: ${sql.length} chars\n`);

// Execute SQL using Supabase REST API (PostgREST)
// Note: We'll use the raw SQL endpoint via a workaround
const url = new URL('/rest/v1/rpc/exec_sql', SUPABASE_URL);

const postData = JSON.stringify({ 
  query: sql 
});

const options = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    'Prefer': 'return=representation'
  }
};

// Since Supabase REST API doesn't directly support arbitrary SQL,
// we'll create a helper function or use a different approach
// Let's use the SQL Editor API endpoint (if available)

console.log('Note: Supabase REST API does not support arbitrary SQL execution.');
console.log('Please apply the migration manually via Supabase Dashboard SQL Editor:');
console.log(`\n1. Go to: ${SUPABASE_URL.replace('https://', 'https://supabase.com/dashboard/project/')}/sql/new`);
console.log(`2. Copy the SQL from: ${migrationPath}`);
console.log(`3. Execute in SQL Editor`);
console.log('\nAlternatively, use psql command:');
console.log(`psql "postgresql://postgres:shemamusic123%23@[2406:da18:243:7420:b3e5:84a4:6923:cb67]:5432/postgres" -f "${migrationFile}"`);

console.log('\n\n=== SQL Content ===\n');
console.log(sql);
console.log('\n===================\n');
