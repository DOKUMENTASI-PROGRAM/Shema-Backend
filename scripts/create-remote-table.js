#!/usr/bin/env node
/**
 * Create chat_admin_assignments table via Supabase REST API
 * This bypasses the need for direct PostgreSQL access
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xlrwvzwpecprhgzfcqxw.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not set');
  process.exit(1);
}

console.log('\n🚀 Creating chat_admin_assignments table on remote Supabase...\n');
console.log(`📍 URL: ${SUPABASE_URL}`);

// SQL to create table (split into executable statements)
const sqlStatements = [
  `CREATE TABLE IF NOT EXISTS public.chat_admin_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    admin_id UUID NOT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(session_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_chat_admin_assignments_session_id ON public.chat_admin_assignments(session_id)`,
  `CREATE INDEX IF NOT EXISTS idx_chat_admin_assignments_admin_id ON public.chat_admin_assignments(admin_id)`,
  `COMMENT ON TABLE public.chat_admin_assignments IS 'Tracks which admin is assigned to which chat session'`,
];

async function executeViaPostgREST() {
  console.log('\n⚠️  Note: PostgREST does not support DDL operations.');
  console.log('Please run this SQL in Supabase Dashboard SQL Editor:\n');
  console.log('='.repeat(80));
  console.log(sqlStatements.join(';\n\n'));
  console.log(';\n' + '='.repeat(80));
  console.log('\n📌 Go to: https://supabase.com/dashboard/project/xlrwvzwpecprhgzfcqxw/sql/new');
  console.log('\nAlternatively, if you have psql access:');
  console.log('psql "postgresql://postgres:shemamusic123#@\\[2406:da18:243:7420:b3e5:84a4:6923:cb67\\]:5432/postgres" -c "..SQL.."');
}

// Try to verify if table already exists via REST API
async function checkTableExists() {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/chat_admin_assignments?limit=0`, {
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      }
    });
    
    if (response.status === 404) {
      console.log('❌ Table does NOT exist (404)');
      return false;
    } else if (response.ok) {
      console.log('✅ Table already EXISTS!');
      return true;
    } else {
      console.log(`⚠️  Unknown status: ${response.status}`);
      return null;
    }
  } catch (error) {
    console.error('Error checking table:', error.message);
    return null;
  }
}

async function main() {
  const exists = await checkTableExists();
  
  if (exists === true) {
    console.log('\n✅ Migration not needed - table already exists!');
    console.log('\nYou can now:');
    console.log('1. Restart customer-service: docker-compose restart customer-service');
    console.log('2. Re-run tests: node scripts/test-all-endpoints.js');
    process.exit(0);
  } else if (exists === false) {
    console.log('\n⚠️  Table does not exist. Manual migration required.');
    await executeViaPostgREST();
    process.exit(1);
  } else {
    console.log('\n⚠️  Could not verify table status. Check Supabase Dashboard.');
    await executeViaPostgREST();
    process.exit(1);
  }
}

main();
