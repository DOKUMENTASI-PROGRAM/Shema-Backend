const admin = require('firebase-admin');
const serviceAccount = require('../config/firebase-service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'les-music'
  });
}

async function getAllUsers() {
  try {
    let users = [];
    let pageToken;

    do {
      const result = await admin.auth().listUsers(1000, pageToken);
      users = users.concat(result.users);
      pageToken = result.pageToken;
    } while (pageToken);

    console.log(`Total users: ${users.length}`);
    console.log('Users:');
    users.forEach(user => {
      console.log(`- UID: ${user.uid}, Email: ${user.email}, Display Name: ${user.displayName}`);
    });

  } catch (error) {
    console.error('Error getting users:', error);
  }
}

getAllUsers();