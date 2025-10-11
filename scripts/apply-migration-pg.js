/**
 * Apply Database Migration using PostgreSQL client
 */

const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.production') })

// Database connection string from environment variable
const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('❌ Missing DATABASE_URL environment variable.')
  console.error('Please set DATABASE_URL in .env.production file.')
  process.exit(1)
}

// Migration file to apply
const migrationFile = process.argv[2]
if (!migrationFile) {
  console.error('❌ Usage: node apply-migration-pg.js <migration-file.sql>')
  process.exit(1)
}

const migrationPath = path.resolve(__dirname, migrationFile)

if (!fs.existsSync(migrationPath)) {
  console.error(`❌ Migration file not found: ${migrationPath}`)
  process.exit(1)
}

// Read SQL file
const sql = fs.readFileSync(migrationPath, 'utf-8')

console.log(`📄 Migration: ${path.basename(migrationPath)}`)
console.log(`🔗 Connecting to Supabase...`)

async function applyMigration() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  })

  try {
    await client.connect()
    console.log('✅ Connected to database')

    console.log('\n🚀 Applying migration...\n')

    // Execute the entire SQL file
    await client.query(sql)

    console.log('✅ Migration applied successfully!')
    console.log(`\n📝 Summary:`)
    console.log(`   Migration: ${path.basename(migrationPath)}`)
    console.log(`   Database: Supabase Production`)

  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

applyMigration()
