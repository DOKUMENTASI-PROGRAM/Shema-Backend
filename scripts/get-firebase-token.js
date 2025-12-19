/**
 * Get Firebase ID Token Script
 * Menggunakan Firebase REST API untuk mendapatkan ID token dari email/password
 */

const https = require('https');

// Firebase config
const API_KEY = process.env.FIREBASE_API_KEY || 'AIzaSyAFHpjE_98GkEsyO6e8XsHfjPzQpf5f0uk'; // Dari .env

async function getFirebaseToken(email, password) {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`;
  
  const data = JSON.stringify({
    email: email,
    password: password,
    returnSecureToken: true
  });

  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          if (response.error) {
            reject(new Error(response.error.message));
          } else {
            console.log('Firebase ID Token:', response.idToken);
            resolve(response.idToken);
          }
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

// Usage
const email = 'k423@gmail.com';
const password = 'Kiana423';

getFirebaseToken(email, password).then(token => {
  console.log('Token obtained successfully');
  // Simpan token untuk testing
  console.log('Use this token for curl testing:');
  console.log(token);
  process.exit(0);
}).catch(error => {
  console.error('Failed to get token:', error.message);
  process.exit(1);
});