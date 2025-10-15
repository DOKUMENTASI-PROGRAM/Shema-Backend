// Quick script to run migration from inside Docker container
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runMigration() {
  try {
    const sql = fs.readFileSync('/tmp/migration.sql', 'utf-8');
    
    // Split by statements (basic splitting)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--') && !s.startsWith('/*'));
    
    console.log(`Running ${statements.length} SQL statements...`);
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (!stmt) continue;
      
      console.log(`\n[${i + 1}/${statements.length}] ${stmt.substring(0, 60)}...`);
      
      // Use supabase.rpc if you have a function, otherwise manual approach
      // For CREATE TABLE, we need raw SQL execution which Supabase JS doesn't support
      console.log('⚠️  Supabase JS client does not support raw SQL DDL');
    }
    
    console.log('\n⚠️  Manual migration required via Supabase Dashboard');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

runMigration();
