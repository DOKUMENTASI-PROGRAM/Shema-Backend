require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkTable(tableName) {
  try {
    const { data, error } = await supabase.from(tableName).select('*').limit(1);
    if (error) {
      if (error.message.includes('does not exist')) {
        console.log(`Table ${tableName}: does not exist`);
      } else {
        console.log(`Table ${tableName}: exists`);
      }
    } else {
      console.log(`Table ${tableName}: exists`);
    }
  } catch (e) {
    console.log(`Table ${tableName}: error - ${e.message}`);
  }
}

async function main() {
  const tables = ['instructor_availability', 'instructor_profiles', 'rooms', 'room_availability', 'class_schedules'];
  for (const table of tables) {
    await checkTable(table);
  }
}

main();