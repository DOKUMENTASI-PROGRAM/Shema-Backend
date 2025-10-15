const { Client } = require('pg');

async function testSupabaseConnection() {
  const client = new Client({
    host: '[2406:da18:243:7420:b3e5:84a4:6923:cb67]',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'shemamusic123#'
  });

  try {
    console.log('🔄 Testing Supabase remote database connection...');
    console.log('📍 Host: [2406:da18:243:7420:b3e5:84a4:6923:cb67]');
    console.log('📍 Port: 5432');
    console.log('📍 Database: postgres');
    console.log('');

    await client.connect();
    console.log('✅ SUCCESS: Connected to Supabase remote database!');
    console.log('');

    // Get all tables
    console.log('📊 FETCHING ALL TABLES...\n');
    const result = await client.query(`
      SELECT
        schemaname,
        tablename,
        tableowner,
        tablespace,
        hasindexes,
        hasrules,
        hastriggers,
        rowsecurity
      FROM pg_tables
      WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
      ORDER BY schemaname, tablename;
    `);

    console.log('┌─────────────────────────────────────────────────────────────────────────────────┐');
    console.log('│                              ALL DATABASE TABLES                               │');
    console.log('├─────────────┬─────────────────────────────────┬─────────────┬─────────┬─────────┤');
    console.log('│   Schema    │            Table               │   Owner     │ Indexes │ Triggers│');
    console.log('├─────────────┼─────────────────────────────────┼─────────────┼─────────┼─────────┤');

    result.rows.forEach(row => {
      const schema = row.schemaname.padEnd(11);
      const table = row.tablename.padEnd(31);
      const owner = row.tableowner.padEnd(11);
      const indexes = (row.hasindexes ? '   ✓    ' : '   ✗    ');
      const triggers = (row.hastriggers ? '   ✓   ' : '   ✗   ');
      console.log(`│ ${schema} │ ${table} │ ${owner} │${indexes}│${triggers}│`);
    });

    console.log('└─────────────┴─────────────────────────────────┴─────────────┴─────────┴─────────┘');
    console.log(`\n📈 TOTAL TABLES FOUND: ${result.rows.length}`);
    console.log('');

    // Get tables per schema
    const schemaResult = await client.query(`
      SELECT schemaname, COUNT(*) as table_count
      FROM pg_tables
      WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
      GROUP BY schemaname
      ORDER BY schemaname;
    `);

    console.log('📊 TABLES PER SCHEMA:');
    console.log('┌─────────────┬─────────────┐');
    console.log('│   Schema    │ Table Count │');
    console.log('├─────────────┼─────────────┤');

    schemaResult.rows.forEach(row => {
      const schema = row.schemaname.padEnd(11);
      const count = row.table_count.toString().padStart(11);
      console.log(`│ ${schema} │ ${count} │`);
    });

    console.log('└─────────────┴─────────────┘');

    // Show some sample data from key tables
    console.log('\n🔍 SAMPLE DATA FROM KEY TABLES:\n');

    const keyTables = [
      { schema: 'auth', table: 'users', limit: 3 },
      { schema: 'customer', table: 'chat_sessions', limit: 2 },
      { schema: 'course', table: 'courses', limit: 2 },
      { schema: 'booking', table: 'bookings', limit: 2 }
    ];

    for (const { schema, table, limit } of keyTables) {
      try {
        const sampleResult = await client.query(`
          SELECT * FROM ${schema}.${table} LIMIT ${limit};
        `);

        if (sampleResult.rows.length > 0) {
          console.log(`📋 ${schema}.${table} (first ${limit} rows):`);
          console.log(sampleResult.rows);
          console.log('');
        }
      } catch (err) {
        console.log(`⚠️  Could not read ${schema}.${table}: ${err.message}`);
      }
    }

  } catch (error) {
    console.error('❌ CONNECTION FAILED:');
    console.error('Error:', error.message);

    if (error.code === 'ENETUNREACH') {
      console.log('\n💡 TROUBLESHOOTING:');
      console.log('1. Ensure IPv6 is enabled on your network');
      console.log('2. Try using a VPN that supports IPv6 (ProtonVPN, Mullvad)');
      console.log('3. Use IPv6 tunnel broker (tunnelbroker.net)');
      console.log('4. Switch to a network that supports IPv6');
    }

    process.exit(1);
  } finally {
    await client.end();
  }
}

testSupabaseConnection();