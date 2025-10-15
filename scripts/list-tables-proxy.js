const { Client } = require('pg');
const HttpsProxyAgent = require('https-proxy-agent');

const proxyUrl = 'http://5.10.244.81:80';
const agent = new HttpsProxyAgent(proxyUrl);

const client = new Client({
  host: '[2406:da18:243:7420:b3e5:84a4:6923:cb67]',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'shemamusic123#',
  // connection: { agent }
});

console.log('🔄 Connecting to Supabase remote database via proxy...');
console.log('Using proxy:', proxyUrl);

client.connect()
  .then(() => {
    console.log('✅ Connected successfully via proxy!');
    return client.query(`
      SELECT
        schemaname,
        tablename,
        tableowner,
        hasindexes,
        hastriggers
      FROM pg_tables
      WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
      ORDER BY schemaname, tablename
      LIMIT 10;
    `);
  })
  .then(result => {
    console.log('\n📊 SAMPLE TABLES (first 10):\n');
    result.rows.forEach(row => {
      console.log(`${row.schemaname}.${row.tablename} (owner: ${row.tableowner})`);
    });

    return client.query(`SELECT schemaname, COUNT(*) as count FROM pg_tables WHERE schemaname NOT IN ('pg_catalog', 'information_schema') GROUP BY schemaname ORDER BY schemaname;`);
  })
  .then(result => {
    console.log('\n📈 TABLES SUMMARY:');
    result.rows.forEach(row => {
      console.log(`${row.schemaname}: ${row.count} tables`);
    });
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    console.log('\n💡 Trying alternative approach...');
  })
  .finally(() => {
    client.end();
  });