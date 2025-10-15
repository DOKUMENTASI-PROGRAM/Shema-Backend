/**
 * Script untuk mengecek struktur columns dari semua tables di Supabase
 * 
 * Usage:
 * node scripts/check-table-columns.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.production' });

// Supabase Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xlrwvzwpecprhgzfcqxw.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Tables to check
const TABLES_TO_CHECK = [
  { schema: 'public', table: 'users' },
  { schema: 'public', table: 'courses' },
  { schema: 'public', table: 'enrollments' },
  { schema: 'public', table: 'instructor_profiles' },
  { schema: 'public', table: 'student_profiles' },
  { schema: 'public', table: 'class_schedules' },
  { schema: 'public', table: 'schedule_attendees' },
  { schema: 'public', table: 'rooms' },
  { schema: 'public', table: 'bookings' },
  { schema: 'public', table: 'chat_sessions' },
  { schema: 'public', table: 'chat_messages' },
  { schema: 'cs', table: 'sessions' },
  { schema: 'cs', table: 'messages' },
  { schema: 'cs', table: 'admin_assignments' },
];

async function checkTableStructure(schema, tableName) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📋 Table: ${schema}.${tableName}`);
  console.log('='.repeat(80));

  try {
    // Get sample data to see columns
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);

    if (error) {
      console.error(`❌ Error: ${error.message}`);
      return;
    }

    if (data && data.length > 0) {
      const columns = Object.keys(data[0]);
      console.log(`\n✅ Columns (${columns.length}):`);
      columns.forEach((col, idx) => {
        const value = data[0][col];
        const type = typeof value;
        console.log(`  ${idx + 1}. ${col} (${type})`);
      });
      
      console.log(`\n📊 Sample Data:`);
      console.log(JSON.stringify(data[0], null, 2));
    } else {
      console.log('⚠️  No data in table. Trying to get structure from empty select...');
      
      // Try to get structure even if empty
      const { data: emptyData, error: emptyError } = await supabase
        .from(tableName)
        .select('*')
        .limit(0);
      
      if (!emptyError) {
        console.log('✅ Table exists but is empty');
      }
    }
  } catch (error) {
    console.error(`❌ Fatal error: ${error.message}`);
  }
}

async function main() {
  console.log('\n🚀 Checking Supabase Table Structures');
  console.log(`📡 Connected to: ${SUPABASE_URL}\n`);

  for (const { schema, table } of TABLES_TO_CHECK) {
    await checkTableStructure(schema, table);
  }

  console.log('\n\n✅ Done!\n');
}

// Run
main().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  process.exit(1);
});

