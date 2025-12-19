require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkTableStatus(tableName) {
  try {
    const { data, error } = await supabase.from(tableName).select('*').limit(1);
    if (error) {
      console.log(`Table ${tableName}: ERROR - ${error.message}`);
      return false;
    } else {
      console.log(`Table ${tableName}: OK`);
      return true;
    }
  } catch (e) {
    console.log(`Table ${tableName}: EXCEPTION - ${e.message}`);
    return false;
  }
}

async function main() {
  const tables = ['instructor_availability', 'instructor_profiles', 'rooms', 'room_availability', 'class_schedules'];

  console.log('Checking table status...\n');

  for (const table of tables) {
    await checkTableStatus(table);
  }

  console.log('\nDone.');
}

main();