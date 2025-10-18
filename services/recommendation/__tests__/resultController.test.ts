// Mock environment variables and configs before imports
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.OPENAI_API_KEY = 'test-openai-key';

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
        eq: jest.fn((column, value) => {
          if (value === 'invalid-session') {
            return {
              single: jest.fn(() => Promise.resolve({
                data: null,
                error: { message: 'Not found' }
              }))
            };
          }
          return {
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
          };
        })
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ error: null }))
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ error: null }))
      }))
    }))
  }
}));

jest.mock('../src/config/redis', () => ({
  redisClient: {
    isOpen: true,
    connect: jest.fn(() => Promise.resolve()),
    disconnect: jest.fn(() => Promise.resolve()),
    set: jest.fn(() => Promise.resolve('OK')),
    get: jest.fn((key) => {
      if (key === 'session:invalid-session') {
        return Promise.resolve(null);
      }
      return Promise.resolve(JSON.stringify({
        created_at: new Date().toISOString(),
        user_agent: 'test-agent'
      }));
    }),
    del: jest.fn(() => Promise.resolve(1))
  }
}));

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

import { getResults } from '../src/controllers/resultController';

describe('Result Controller - Unit Tests', () => {
  const testSessionId = 'test-session-result-123';
  const testAssessmentId = 'test-assessment-id';

  beforeAll(async () => {
    // Mocks are set up in setup.ts
  });

  afterAll(async () => {
    // Cleanup handled by mocks
  });

  describe('getResults', () => {
    it('should return assessment data when no results exist', async () => {
      const mockC = {
        req: {
          param: jest.fn().mockReturnValue(testSessionId)
        },
        json: jest.fn()
      };

      await getResults(mockC as any);

      expect(mockC.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            assessment: expect.objectContaining({
              session_id: testSessionId,
              status: 'completed'
            }),
            result: expect.objectContaining({
              id: 'test-assessment-id'
            })
          }),
          message: 'Results retrieved successfully'
        })
      );
    });

    it('should handle invalid session', async () => {
      const mockC = {
        req: {
          param: jest.fn().mockReturnValue('invalid-session')
        },
        json: jest.fn()
      };

      await getResults(mockC as any);

      expect(mockC.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'DATABASE_ERROR'
          })
        }),
        500
      );
    });

    it('should handle missing session ID', async () => {
      const mockC = {
        req: {
          param: jest.fn().mockReturnValue(undefined)
        },
        json: jest.fn()
      };

      await getResults(mockC as any);

      expect(mockC.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: 'Session ID is required'
          })
        }),
        400
      );
    });
  });
});