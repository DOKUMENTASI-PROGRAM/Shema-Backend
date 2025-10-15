const { Client } = require('pg');

const client = new Client({
  host: '[2406:da18:243:7420:b3e5:84a4:6923:cb67]',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'shemamusic123#'
});

console.log('🔄 Connecting to Supabase remote database...');

client.connect()
  .then(() => {
    console.log('✅ Connected successfully!');
    return client.query(`
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
  })
  .then(result => {
    console.log('\n📊 ALL TABLES IN DATABASE:\n');
    console.log('Schema'.padEnd(15), 'Table'.padEnd(30), 'Owner'.padEnd(15), 'Indexes', 'Triggers');
    console.log('='.repeat(80));

    result.rows.forEach(row => {
      console.log(
        row.schemaname.padEnd(15),
        row.tablename.padEnd(30),
        row.tableowner.padEnd(15),
        (row.hasindexes ? '✓' : '✗').padEnd(8),
        row.hastriggers ? '✓' : '✗'
      );
    });

    console.log('\n📈 Total tables found:', result.rows.length);

    return client.query(`SELECT schemaname, COUNT(*) as table_count FROM pg_tables WHERE schemaname NOT IN ('pg_catalog', 'information_schema') GROUP BY schemaname ORDER BY schemaname;`);
  })
  .then(result => {
    console.log('\n📊 TABLES PER SCHEMA:\n');
    result.rows.forEach(row => {
      console.log(`${row.schemaname}: ${row.table_count} tables`);
    });
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  })
  .finally(() => {
    client.end();
  });