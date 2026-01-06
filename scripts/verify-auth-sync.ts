
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifySync() {
  console.log('🔍 Verifying User Synchronization...');

  // 1. Fetch all Auth Users
  const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) {
    console.error('Error fetching auth users:', authError);
    return;
  }
  console.log(`Found ${authUsers.length} users in auth.users`);

  // 2. Fetch all Public Users
  const { data: publicUsers, error: publicError } = await supabase
    .from('users')
    .select('*');
  
  if (publicError) {
    console.error('Error fetching public users:', publicError);
    return;
  }
  console.log(`Found ${publicUsers?.length || 0} users in public.users`);

  // 3. Compare
  const missingInPublic = authUsers.filter(au => !publicUsers?.find(pu => pu.id === au.id));
  const roleMismatches = authUsers.filter(au => {
    const pu = publicUsers?.find(p => p.id === au.id);
    if (!pu) return false;
    const authRole = au.user_metadata?.role || 'student';
    return pu.role !== authRole;
  });

  // Report
  if (missingInPublic.length > 0) {
    console.error(`\n❌ ${missingInPublic.length} Auth users are MISSING from public.users:`);
    missingInPublic.forEach(u => console.log(` - ${u.email} (ID: ${u.id})`));
  } else {
    console.log('\n✅ All auth users exist in public.users.');
  }

  if (roleMismatches.length > 0) {
    console.warn(`\n⚠️ ${roleMismatches.length} users have Role Mismatches (Metadata vs Public Table):`);
    roleMismatches.forEach(u => {
        const pu = publicUsers?.find(p => p.id === u.id);
        console.log(` - ${u.email}: Auth says '${u.user_metadata?.role || 'student'}', Public says '${pu?.role}'`);
    });
  } else {
    console.log('✅ All user roles match.');
  }

  // --- Active Test: Create Admin User ---
  console.log('\n🧪 Starting Active Test: Creating Test Admin User...');
  const testEmail = `test.admin.${Date.now()}@example.com`;
  const testPassword = 'password123';
  
  const { data: createdAuth, error: createError } = await supabase.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true,
    user_metadata: {
      full_name: 'Test Admin Entity',
      role: 'admin'
    }
  });

  if (createError || !createdAuth.user) {
    console.error('❌ Failed to create test user:', createError);
    return;
  }
  console.log(`✅ Created Auth User: ${testEmail} (ID: ${createdAuth.user.id})`);

  // Wait for trigger
  console.log('⏳ Waiting 2 seconds for trigger...');
  await new Promise(r => setTimeout(r, 2000));

  // Check public.users
  const { data: publicCheck, error: checkError } = await supabase
    .from('users')
    .select('*')
    .eq('id', createdAuth.user.id)
    .single();

  if (checkError || !publicCheck) {
    console.error('❌ Test failed: User NOT found in public.users after creation.');
  } else {
    console.log(`✅ User found in public.users!`);
    console.log(`   - Email: ${publicCheck.email}`);
    console.log(`   - Role: ${publicCheck.role}`);
    
    if (publicCheck.role === 'admin') {
      console.log('✅ Role correctly synced as ADMIN.');
    } else {
      console.error(`❌ Role mismatch! Expected 'admin', got '${publicCheck.role}'`);
    }
  }

  // Cleanup
  console.log('🧹 Cleaning up test user...');
  await supabase.auth.admin.deleteUser(createdAuth.user.id);
  // Public user should be deleted by cascade or manually? 
  // Usually auth deletion doesn't cascade to public automatically unless set up.
  // We'll check if it remains (which might be desired or not, but for cleanup we'll delete it manualy if needed)
  
  const { error: deletePublicError } = await supabase
    .from('users')
    .delete()
    .eq('id', createdAuth.user.id);
    
  if (!deletePublicError) console.log('✅ Test user cleaned up.');
}

verifySync();
