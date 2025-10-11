const dotenv = require('dotenv');

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Global test setup
global.beforeAll(async () => {
  // Setup code that runs before all tests
  console.log('Setting up test environment...');
});

global.afterAll(async () => {
  // Cleanup code that runs after all tests
  console.log('Cleaning up test environment...');
});

// Mock console methods to reduce noise during testing
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

global.beforeEach(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
});

global.afterEach(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});