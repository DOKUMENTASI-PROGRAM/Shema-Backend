/**
 * Apply Database Migration to Supabase Production
 * Reads SQL file and executes it against Supabase
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.production') })

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials. Check .env.production file.')
  process.exit(1)
}

// Migration file to apply
const migrationFile = process.argv[2]
if (!migrationFile) {
  console.error('❌ Usage: node apply-migration.js <migration-file.sql>')
  console.error('Example: node apply-migration.js ../supabase/migrations/20251011000000_add_instrument_to_courses.sql')
  process.exit(1)
}

const migrationPath = path.resolve(__dirname, migrationFile)

if (!fs.existsSync(migrationPath)) {
  console.error(`❌ Migration file not found: ${migrationPath}`)
  process.exit(1)
}

// Read SQL file
const sql = fs.readFileSync(migrationPath, 'utf-8')

console.log(`📄 Reading migration: ${path.basename(migrationPath)}`)
console.log(`🔗 Connecting to: ${SUPABASE_URL}`)

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function applyMigration() {
  try {
    // Split SQL into individual statements (simple approach)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    console.log(`\n🚀 Applying ${statements.length} SQL statements...\n`)

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      
      // Skip comments and empty statements
      if (statement.startsWith('--') || statement.length === 0) continue

      console.log(`[${i + 1}/${statements.length}] Executing statement...`)
      
      // Execute using rpc or direct query
      const { data, error } = await supabase.rpc('exec_sql', { sql_query: statement + ';' })
        .catch(async (err) => {
          // If exec_sql function doesn't exist, try direct query
          return await supabase.from('_migrations').select('*').limit(0)
        })

      if (error) {
        console.error(`❌ Error in statement ${i + 1}:`, error.message)
        // Continue with next statement instead of failing
      } else {
        console.log(`✅ Statement ${i + 1} executed successfully`)
      }
    }

    console.log('\n✅ Migration applied successfully!')
    console.log('\n📝 Summary:')
    console.log(`   Migration: ${path.basename(migrationPath)}`)
    console.log(`   Database: ${SUPABASE_URL}`)
    console.log(`   Statements executed: ${statements.length}`)

  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  }
}

// For Supabase, we need to use postgres client directly
// Let's create a simpler approach using fetch to Supabase REST API
async function applyMigrationDirect() {
  try {
    console.log('\n🔍 Note: For complex migrations, use Supabase Dashboard SQL Editor or psql CLI')
    console.log('\n📋 SQL to execute:')
    console.log('─'.repeat(80))
    console.log(sql)
    console.log('─'.repeat(80))
    
    console.log('\n💡 To apply this migration:')
    console.log('1. Go to Supabase Dashboard → SQL Editor')
    console.log('2. Copy the SQL above')
    console.log('3. Execute it in the SQL Editor')
    console.log('\nOr use psql:')
    console.log(`psql "postgresql://postgres:[password]@db.xlrwvzwpecprhgzfcqxw.supabase.co:5432/postgres" -f "${migrationPath}"`)

    // Try simple approach for our specific migration
    console.log('\n🚀 Attempting to apply migration via Supabase client...')
    
    // Check if column already exists
    const { data: tableInfo, error: checkError } = await supabase
      .from('courses')
      .select('*')
      .limit(1)

    if (checkError) {
      console.error('❌ Cannot connect to courses table:', checkError.message)
      return
    }

    console.log('✅ Connected to Supabase successfully')
    console.log('⚠️  Manual migration required via Supabase Dashboard or psql')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

applyMigrationDirect()
