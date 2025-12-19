/**
 * Register Firebase User Script
 * Menggunakan Firebase REST API untuk register user baru
 */

const https = require('https');

// Firebase config
const API_KEY = process.env.FIREBASE_API_KEY || 'AIzaSyAFHpjE_98GkEsyO6e8XsHfjPzQpf5f0uk';

async function registerFirebaseUser(email, password) {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`;

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
            console.log('Firebase User Registered Successfully!');
            console.log('Email:', response.email);
            console.log('UID:', response.localId);
            console.log('ID Token:', response.idToken);
            resolve({
              email: response.email,
              uid: response.localId,
              idToken: response.idToken
            });
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

registerFirebaseUser(email, password).then(result => {
  console.log('Registration successful');
  console.log('Use this ID token for testing auth endpoints:');
  console.log(result.idToken);
  process.exit(0);
}).catch(error => {
  console.error('Registration failed:', error.message);
  process.exit(1);
});