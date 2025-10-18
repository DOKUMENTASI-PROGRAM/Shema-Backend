#!/usr/bin/env node

/**
 * Fix Admin User by Cleaning Up Duplicates
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.production' })

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixAdminUser() {
  console.log('🔧 Fixing admin user...')

  try {
    // First, delete any existing admin user from public.users
    console.log('🗑️  Cleaning up existing admin records in public.users...')
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('email', 'admin@shemamusic.com')

    if (deleteError) {
      console.error('❌ Error deleting existing admin user:', deleteError.message)
      return
    }

    console.log('✅ Cleaned up existing admin records')

    // Get the auth user
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()

    if (authError) {
      console.error('❌ Error checking auth users:', authError.message)
      return
    }

    const authUser = authUsers.users.find(u => u.email === 'admin@shemamusic.com')

    if (!authUser) {
      console.log('❌ Admin user does not exist in auth.users')
      return
    }

    console.log('✅ Found admin user in auth.users:', authUser.id)

    // Create user in public.users
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        id: authUser.id,
        email: 'admin@shemamusic.com',
        full_name: 'System Administrator',
        role: 'admin',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (insertError) {
      console.error('❌ Error creating user in public.users:', insertError.message)
      return
    }

    console.log('✅ User created in public.users')
    console.log('👤 User:', newUser)

    // Update password to ensure it's set
    console.log('🔄 Ensuring password is set...')
    const { error: updateError } = await supabase.auth.admin.updateUserById(authUser.id, {
      password: 'Admin123!'
    })

    if (updateError) {
      console.error('❌ Error updating password:', updateError.message)
      return
    }

    console.log('✅ Password updated successfully')
    console.log('🎉 Admin user fixed!')
    console.log('📧 Email: admin@shemamusic.com')
    console.log('🔑 Password: Admin123!')

  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
  }
}

fixAdminUser()