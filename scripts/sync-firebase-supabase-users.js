const admin = require('firebase-admin');
const serviceAccount = require('../config/firebase-service-account.json');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.production' });

// Firebase setup
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'les-music'
  });
}

// Supabase setup
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xlrwvzwpecprhgzfcqxw.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhscnd2endwZWNwcmhnemZjcXh3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTkxMzQwNCwiZXhwIjoyMDc1NDg5NDA0fQ.30-63oLLTrNhN0meFH3Zn5_oTOQ8KBbbHxgj_4ECDp4';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function getFirebaseEmails() {
  let users = [];
  let pageToken;

  do {
    const result = await admin.auth().listUsers(1000, pageToken);
    users = users.concat(result.users);
    pageToken = result.pageToken;
  } while (pageToken);

  return users.map(user => user.email);
}

async function getSupabaseEmails() {
  const { data, error } = await supabase
    .from('users')
    .select('email');

  if (error) throw error;
  return data.map(user => user.email);
}

async function deleteFirebaseUsers(emailsToDelete) {
  for (const email of emailsToDelete) {
    try {
      const user = await admin.auth().getUserByEmail(email);
      await admin.auth().deleteUser(user.uid);
      console.log(`Deleted Firebase user: ${email}`);
    } catch (error) {
      console.error(`Error deleting Firebase user ${email}:`, error.message);
    }
  }
}

async function deleteSupabaseUsers(emailsToDelete) {
  for (const email of emailsToDelete) {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('email', email);

      if (error) throw error;
      console.log(`Deleted Supabase user: ${email}`);
    } catch (error) {
      console.error(`Error deleting Supabase user ${email}:`, error.message);
    }
  }
}

async function syncUsers() {
  try {
    console.log('Fetching Firebase users...');
    const firebaseEmails = await getFirebaseEmails();
    console.log(`Firebase users: ${firebaseEmails.length}`);

    console.log('Fetching Supabase users...');
    const supabaseEmails = await getSupabaseEmails();
    console.log(`Supabase users: ${supabaseEmails.length}`);

    // Find emails in both
    const commonEmails = firebaseEmails.filter(email => supabaseEmails.includes(email));
    console.log(`Common emails: ${commonEmails.length}`);

    // Emails to keep: common + k423@gmail.com
    const emailsToKeep = new Set([...commonEmails, 'k423@gmail.com']);

    // Emails to delete from Firebase
    const firebaseToDelete = firebaseEmails.filter(email => !emailsToKeep.has(email));
    console.log(`Firebase users to delete: ${firebaseToDelete.length}`);

    // Emails to delete from Supabase
    const supabaseToDelete = supabaseEmails.filter(email => !emailsToKeep.has(email));
    console.log(`Supabase users to delete: ${supabaseToDelete.length}`);

    // Confirm before deleting
    console.log('\nEmails to keep:', Array.from(emailsToKeep));
    console.log('\nFirebase to delete:', firebaseToDelete);
    console.log('\nSupabase to delete:', supabaseToDelete);

    console.log('\nProceeding with deletion...');

    console.log('\nDeleting Firebase users...');
    await deleteFirebaseUsers(firebaseToDelete);

    console.log('\nDeleting Supabase users...');
    await deleteSupabaseUsers(supabaseToDelete);

    console.log('\nSync completed!');

  } catch (error) {
    console.error('Error:', error);
  }
}

syncUsers();