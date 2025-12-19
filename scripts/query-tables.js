/**
 * Script untuk query tabel rooms, room_availability, class_schedules
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.production' });

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xlrwvzwpecprhgzfcqxw.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhscnd2endwZWNwcmhnemZjcXh3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTkxMzQwNCwiZXhwIjoyMDc1NDg5NDA0fQ.30-63oLLTrNhN0meFH3Zn5_oTOQ8KBbbHxgj_4ECDp4';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function queryTable(tableName, limit = 5) {
  console.log(`\n📋 Querying table: ${tableName}\n`);

  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(limit);

    if (error) throw error;

    console.log(`Data from ${tableName}:`);
    console.table(data);
    console.log(`\nTotal rows shown: ${data.length}`);
  } catch (error) {
    console.error(`❌ Error querying ${tableName}:`, error.message);
  }
}

async function main() {
  console.log('🚀 Querying database tables...\n');

  await queryTable('rooms');
  await queryTable('room_availability');
  await queryTable('class_schedules');

  console.log('\n✅ Done!');
}

main().catch(console.error);