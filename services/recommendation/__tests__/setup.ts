import { jest } from '@jest/globals';

// Set environment variables before any imports
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.OPENAI_API_KEY = 'test-openai-key';

// Mock Supabase
jest.mock('../src/config/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({
            data: { id: 'test-assessment-id' },
            error: null
          }))
        }))
      })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({
            data: {
              id: 'test-assessment-id',
              session_id: 'test-session-result-123',
              assessment_data: { questions: {}, metadata: {} },
              status: 'completed',
              created_at: new Date().toISOString()
            },
            error: null
          }))
        }))
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ error: null }))
      }))
    }))
  }
}));

// Mock Redis
jest.mock('../src/config/redis', () => ({
  redisClient: {
    isOpen: true,
    connect: jest.fn(() => Promise.resolve()),
    disconnect: jest.fn(() => Promise.resolve()),
    set: jest.fn(() => Promise.resolve('OK')),
    get: jest.fn(() => Promise.resolve(JSON.stringify({
      created_at: new Date().toISOString(),
      user_agent: 'test-agent'
    }))),
    del: jest.fn(() => Promise.resolve(1))
  }
}));

// Mock OpenAI
jest.mock('openai', () => ({
  OpenAI: jest.fn(() => ({
    chat: {
      completions: {
        create: jest.fn(() => Promise.resolve({
          choices: [{
            message: {
              content: JSON.stringify({
                recommendations: ['Practice scales daily', 'Learn basic chords'],
                learning_path: ['Beginner', 'Intermediate'],
                estimated_time: '3 months'
              })
            }
          }]
        }))
      }
    }
  }))
}));