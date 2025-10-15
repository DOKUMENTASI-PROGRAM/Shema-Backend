// Script untuk apply migration langsung ke PostgreSQL Production
// Usage: node scripts/run-migration.js

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Load environment
require('dotenv').config({ path: '.env.production' });

const client = new Client({
  host: '[2406:da18:243:7420:b3e5:84a4:6923:cb67]', // IPv6 address langsung untuk bypass DNS IPv4 issues
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'shemamusic123#',
  ssl: {
    rejectUnauthorized: false // Supabase requires SSL
  }
});

async function applyMigration(migrationFile) {
  try {
    console.log('\n=== Applying Migration to Production Database ===\n');
    
    // Connect
    console.log('📡 Connecting to database...');
    await client.connect();
    console.log('✅ Connected!\n');
    
    // Read migration file
    const migrationPath = path.join(__dirname, '..', migrationFile);
    console.log(`📄 Reading migration: ${migrationFile}`);
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    console.log(`   SQL Length: ${sql.length} chars\n`);
    
    // Execute migration
    console.log('⚙️  Executing migration...');
    const result = await client.query(sql);
    console.log('✅ Migration applied successfully!\n');
    
    if (result.rows && result.rows.length > 0) {
      console.log('Result:', result.rows);
    }
    
    // Verify table exists
    console.log('🔍 Verifying table creation...');
    const verifyResult = await client.query(`
      SELECT table_name, table_schema 
      FROM information_schema.tables 
      WHERE table_name = 'chat_admin_assignments'
    `);
    
    if (verifyResult.rows.length > 0) {
      console.log('✅ Table verified:', verifyResult.rows[0]);
    } else {
      console.log('⚠️  Table not found in verification');
    }
    
    console.log('\n=== Migration Complete ===\n');
    
  } catch (error) {
    console.error('\n❌ Error applying migration:');
    console.error(error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Get migration file from command line or use default
const migrationFile = process.argv[2] || 'supabase/migrations/20250113_create_chat_admin_assignments.sql';

applyMigration(migrationFile);
