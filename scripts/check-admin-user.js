#!/usr/bin/env node

/**
 * Check and Fix Admin User
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

async function checkAndFixAdminUser() {
  console.log('🔍 Checking admin user...')

  try {
    // Check auth.users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()

    if (authError) {
      console.error('❌ Error checking auth users:', authError.message)
      return
    }

    const authUser = authUsers.users.find(u => u.email === 'admin@shemamusic.com')

    if (authUser) {
      console.log('✅ Admin user exists in auth.users')
      console.log('📧 User ID:', authUser.id)
      console.log('📧 Email:', authUser.email)
      console.log('🔒 Has password hash:', !!authUser.encrypted_password)
    } else {
      console.log('❌ Admin user does not exist in auth.users')
      return
    }

    // Check public.users
    const { data: publicUser, error: publicError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()

    if (publicError) {
      if (publicError.code === 'PGRST116') {
        console.log('❌ User exists in auth but not in public.users')

        // Create in public.users
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
      } else {
        console.error('❌ Error checking public.users:', publicError.message)
        return
      }
    } else {
      console.log('✅ User exists in public.users')
      console.log('👤 User:', publicUser)
      console.log('🔒 Has password_hash:', !!publicUser.password_hash)

      if (!publicUser.password_hash) {
        console.log('⚠️  Password hash is missing, this is the issue!')

        // We need to set a password hash. Since we can't generate bcrypt hash easily here,
        // let's try to update the password via auth API
        console.log('🔄 Attempting to update password via auth API...')

        const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(authUser.id, {
          password: 'Admin123!'
        })

        if (updateError) {
          console.error('❌ Error updating password:', updateError.message)
          return
        }

        console.log('✅ Password updated successfully')
      }
    }

    console.log('🎉 Admin user check/fix complete!')

  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
  }
}

checkAndFixAdminUser()