const admin = require('firebase-admin');
const serviceAccount = require('../config/firebase-service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'les-music'
  });
}

async function generateToken() {
  try {
    const uid = 'test-user-' + Date.now();
    const email = `test${Date.now()}@example.com`;

    // Create user in Firebase
    const userRecord = await admin.auth().createUser({
      uid: uid,
      email: email,
      displayName: 'Test User',
      emailVerified: true
    });

    console.log('User created in Firebase:', userRecord.uid);

    // Generate custom token (this needs to be exchanged for ID token on client side)
    const customToken = await admin.auth().createCustomToken(userRecord.uid, {
      email: email,
      name: 'Test User'
    });

    console.log('Custom Token:', customToken);

    // For testing purposes, we'll use a mock ID token since we can't exchange custom tokens server-side
    // In real testing, you'd need to use Firebase Auth REST API or client SDK

  } catch (error) {
    console.error('Error:', error);
  }
}

generateToken();