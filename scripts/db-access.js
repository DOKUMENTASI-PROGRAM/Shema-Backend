/**
 * Script untuk akses Supabase Remote Database menggunakan Node.js
 * 
 * Usage:
 * node scripts/db-access.js query "SELECT * FROM auth.users LIMIT 5"
 * node scripts/db-access.js ddl "CREATE TABLE test (id SERIAL PRIMARY KEY, name TEXT)"
 * node scripts/db-access.js tables
 * node scripts/db-access.js schemas
 * node scripts/db-access.js stats
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.production' });

// Supabase Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xlrwvzwpecprhgzfcqxw.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhscnd2endwZWNwcmhnemZjcXh3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTkxMzQwNCwiZXhwIjoyMDc1NDg5NDA0fQ.30-63oLLTrNhN0meFH3Zn5_oTOQ8KBbbHxgj_4ECDp4';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Helper function to format table output
function formatTable(data) {
  if (!data || data.length === 0) {
    console.log('No data returned');
    return;
  }

  console.table(data);
  console.log(`\nTotal rows: ${data.length}`);
}

// Commands
const commands = {
  async query(sql) {
    console.log(`\n🔍 Executing query...\n`);
    console.log(sql);
    console.log('\n' + '='.repeat(80) + '\n');

    try {
      // Note: Supabase doesn't support raw SQL directly via JS client
      // You need to use Supabase's query builder or create a stored procedure
      console.log('⚠️  Note: Direct SQL execution requires Supabase REST API or stored procedure');
      console.log('For raw SQL, please use:');
      console.log('1. Supabase Dashboard SQL Editor');
      console.log('2. psql client');
      console.log('3. pgAdmin or DBeaver\n');
    } catch (error) {
      console.error('❌ Error:', error.message);
    }
  },

  async ddl(sql) {
    console.log(`\n🔨 DDL Operations\n`);
    console.log('⚠️  Note: Supabase JS client and REST API do not support direct DDL execution');
    console.log('For DDL operations (CREATE, DROP, ALTER tables), please use:');
    console.log('1. Supabase Dashboard SQL Editor');
    console.log('2. psql client with direct database connection');
    console.log('3. pgAdmin or DBeaver\n');
    console.log('SQL to execute:');
    console.log(sql);
    console.log('\nSupabase SQL Editor URL:');
    console.log(`${SUPABASE_URL.replace('https://', 'https://app.supabase.com/project/')}/sql`);
  },

  async tables() {
    console.log('\n📋 Fetching tables information...\n');

    try {
      const { data, error } = await supabase.rpc('get_tables');

      if (error) throw error;

      if (!data || data.length === 0) {
        console.log('No tables found');
        return;
      }

      console.log('Tables in database:');
      data.forEach(table => {
        console.log(`\n${table.table_schema}.${table.table_name}`);
      });
      console.log(`\nTotal tables: ${data.length}`);
    } catch (error) {
      console.error('❌ Error:', error.message);
    }
  },

  async schemas() {
    console.log('\n📁 Database Schemas:\n');

    try {
      const { data, error } = await supabase.rpc('get_schemas');

      if (error) throw error;

      if (!data || data.length === 0) {
        console.log('No schemas found');
        return;
      }

      data.forEach(schema => {
        console.log(`- ${schema.schema_name}`);
      });
    } catch (error) {
      console.error('❌ Error:', error.message);
    }
  },

  async stats() {
    console.log('\n📊 Database Statistics\n');
    console.log('=' .repeat(80));

    try {
      // Get users count
      const { count: usersCount, error: usersError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      if (usersError) throw usersError;

      // Get courses count
      const { count: coursesCount, error: coursesError } = await supabase
        .from('courses')
        .select('*', { count: 'exact', head: true });

      if (coursesError) throw coursesError;

      // Get enrollments count
      const { count: enrollmentsCount, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select('*', { count: 'exact', head: true });

      if (enrollmentsError) throw enrollmentsError;

      // Get bookings count
      const { count: bookingsCount, error: bookingsError } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true });

      if (bookingsError) throw bookingsError;

      console.log(`Total Users:       ${usersCount || 0}`);
      console.log(`Total Courses:     ${coursesCount || 0}`);
      console.log(`Total Enrollments: ${enrollmentsCount || 0}`);
      console.log(`Total Bookings:    ${bookingsCount || 0}`);
      console.log('\n' + '='.repeat(80));
    } catch (error) {
      console.error('❌ Error:', error.message);
    }
  },

  async users(limit = 10) {
    console.log(`\n👥 Fetching ${limit} users...\n`);

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, role, created_at')
        .limit(limit);

      if (error) throw error;
      formatTable(data);
    } catch (error) {
      console.error('❌ Error:', error.message);
    }
  },

  async courses(limit = 10) {
    console.log(`\n📚 Fetching ${limit} courses...\n`);

    try {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title, description, level, price_per_session, is_active, created_at')
        .limit(limit);

      if (error) throw error;
      formatTable(data);
    } catch (error) {
      console.error('❌ Error:', error.message);
    }
  },

  async enrollments(limit = 10) {
    console.log(`\n📝 Fetching ${limit} enrollments...\n`);

    try {
      const { data, error } = await supabase
        .from('enrollments')
        .select('id, student_id, course_id, status, enrolled_at, created_at')
        .limit(limit);

      if (error) throw error;
      formatTable(data);
    } catch (error) {
      console.error('❌ Error:', error.message);
    }
  },

  async bookings(limit = 10) {
    console.log(`\n🎫 Fetching ${limit} bookings...\n`);

    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('id, user_id, schedule_id, status, created_at')
        .limit(limit)
        .order('created_at', { ascending: false });

      if (error) throw error;
      formatTable(data);
    } catch (error) {
      console.error('❌ Error:', error.message);
    }
  },

  async table(tableName, column = '*', limit = 10) {
    console.log(`\n📋 Fetching ${limit} records from table '${tableName}' (column: ${column})...\n`);

    try {
      let query = supabase.from(tableName).select(column);

      if (column !== '*') {
        // For specific columns, order by created_at desc to get latest
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query.limit(parseInt(limit));

      if (error) throw error;

      if (column === '*') {
        formatTable(data);
      } else {
        // For single column, display differently
        console.log(`Column '${column}' values:`);
        data.forEach((row, index) => {
          console.log(`${index + 1}. ${JSON.stringify(row[column], null, 2)}`);
        });
        console.log(`\nTotal records: ${data.length}`);
      }
    } catch (error) {
      console.error('❌ Error:', error.message);
    }
  },

  async help() {
    console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                    Supabase Remote Database Access Script                    ║
╚══════════════════════════════════════════════════════════════════════════════╝

Usage: node scripts/db-access.js [command] [options]

Commands:
  schemas                   List all database schemas
  tables                    List all tables
  stats                     Show database statistics
  users [limit]            List users (default: 10)
  courses [limit]          List courses (default: 10)
  enrollments [limit]      List enrollments (default: 10)
  bookings [limit]         List bookings (default: 10)
  table <name> [column] [limit]  Query table by name, optional column, limit (default: *, 10)
  ddl <sql>                Execute DDL operations (CREATE, DROP, ALTER)
  query <sql>              Execute SQL query (requires stored procedure)
  help                     Show this help message

Examples:
  node scripts/db-access.js stats
  node scripts/db-access.js users 5
  node scripts/db-access.js courses 20
  node scripts/db-access.js bookings
  node scripts/db-access.js table result_test
  node scripts/db-access.js table result_test ai_analysis 1
  node scripts/db-access.js ddl "CREATE TABLE test (id SERIAL PRIMARY KEY, name TEXT)"

Note:
  For complex queries, use:
  - Supabase Dashboard SQL Editor: ${SUPABASE_URL.replace('https://', 'https://app.supabase.com/project/')}/sql
  - pgAdmin or DBeaver
  - psql client

Connection:
  URL: ${SUPABASE_URL}
  Using: Service Role Key (full access)
    `);
  }
};

// Main execution
async function main() {
  const command = process.argv[2] || 'help';
  const args = process.argv.slice(3);

  console.log('\n🚀 Supabase Remote Database Access');
  console.log(`📡 Connected to: ${SUPABASE_URL}`);

  if (commands[command]) {
    await commands[command](...args);
  } else {
    console.log(`\n❌ Unknown command: ${command}`);
    await commands.help();
  }

  console.log('\n✅ Done!\n');
}

// Run
main().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  process.exit(1);
});
