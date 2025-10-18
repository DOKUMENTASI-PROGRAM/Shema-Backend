#!/usr/bin/env node

/**
 * Create Admin User Directly in Database
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

async function createAdminUser() {
  console.log('🔧 Creating admin user directly in database...')

  try {
    // First check if user exists in auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.listUsers()

    if (authError) {
      console.error('❌ Error checking auth users:', authError.message)
      return
    }

    const existingUser = authUser.users.find(u => u.email === 'admin@shemamusic.com')

    if (existingUser) {
      console.log('✅ Admin user already exists in auth.users')
      console.log('📧 User ID:', existingUser.id)

      // Check if user exists in public.users
      const { data: publicUser, error: publicError } = await supabase
        .from('users')
        .select('*')
        .eq('id', existingUser.id)
        .single()

      if (publicError && publicError.code !== 'PGRST116') {
        console.error('❌ Error checking public.users:', publicError.message)
        return
      }

      if (!publicUser) {
        console.log('📝 User exists in auth but not in public.users, creating...')

        // Create user in public.users
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert({
            id: existingUser.id,
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
        console.log('✅ User already exists in both auth and public.users')
        console.log('👤 User:', publicUser)
      }

    } else {
      console.log('📝 Admin user does not exist, creating...')

      // Create user in auth.users
      const { data: newAuthUser, error: createError } = await supabase.auth.admin.createUser({
        email: 'admin@shemamusic.com',
        password: 'Admin123!',
        email_confirm: true,
        user_metadata: {
          full_name: 'System Administrator',
          role: 'admin'
        }
      })

      if (createError) {
        console.error('❌ Error creating user in auth.users:', createError.message)
        return
      }

      console.log('✅ User created in auth.users')
      console.log('📧 User ID:', newAuthUser.user.id)

      // Create user in public.users
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          id: newAuthUser.user.id,
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
    }

    console.log('🎉 Admin user setup complete!')
    console.log('📧 Email: admin@shemamusic.com')
    console.log('🔑 Password: Admin123!')

  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
  }
}

createAdminUser()