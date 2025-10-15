import dotenv from 'dotenv';

// Load test environment
dotenv.config({ path: '.env.development' });

// Global test setup for Playwright
console.log('Setting up Playwright test environment...');

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://localhost:3000';
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://xlrwvzwpecprhgzfcqxw.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key';

// Helper function to wait for services
export const waitForService = (url: string, timeout = 30000): Promise<void> => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const checkService = () => {
      fetch(url)
        .then(response => {
          if (response.ok) {
            resolve();
          } else {
            throw new Error(`Service returned ${response.status}`);
          }
        })
        .catch(() => {
          if (Date.now() - startTime > timeout) {
            reject(new Error(`Service at ${url} did not respond within ${timeout}ms`));
          } else {
            setTimeout(checkService, 1000);
          }
        });
    };

    checkService();
  });
};