const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.production' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function updateUserRoles() {
  console.log('🔄 Updating user roles for instructors...');

  try {
    // Get all users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, role');

    if (usersError) throw usersError;

    console.log(`📊 Found ${users.length} users`);

    // Update some users to instructor role
    const instructorEmails = [
      'kiana@gmail.com', // Test user
      'admin@shemamusic.com' // Admin user
    ];

    for (const email of instructorEmails) {
      const user = users.find(u => u.email === email);
      if (user) {
        const { error: updateError } = await supabase
          .from('users')
          .update({ role: 'instructor' })
          .eq('id', user.id);

        if (updateError) {
          console.log(`❌ Failed to update ${email}:`, updateError.message);
        } else {
          console.log(`✅ Updated ${email} to instructor role`);
        }
      } else {
        console.log(`⚠️ User ${email} not found`);
      }
    }

    // Also update a few more users to instructor role for testing
    const additionalInstructors = users.slice(2, 4); // Take users 3-4
    for (const user of additionalInstructors) {
      const { error: updateError } = await supabase
        .from('users')
        .update({ role: 'instructor' })
        .eq('id', user.id);

      if (updateError) {
        console.log(`❌ Failed to update ${user.email}:`, updateError.message);
      } else {
        console.log(`✅ Updated ${user.email} to instructor role`);
      }
    }

  } catch (error) {
    console.error('❌ Error updating user roles:', error);
    throw error;
  }
}

async function main() {
  try {
    await updateUserRoles();
    console.log('✅ User roles updated successfully');
  } catch (error) {
    console.error('❌ Failed to update user roles:', error);
    process.exit(1);
  }
}

main();