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
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({
            data: {
              id: 'test-assessment-id',
              session_id: 'test-session-123',
              assessment_data: { questions: {}, metadata: {} },
              status: 'completed',
              created_at: new Date().toISOString()
            },
            error: null
          }))
        }))
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

import { submitAssessment } from '../src/controllers/assessmentController';

describe('Assessment Controller - Unit Tests', () => {
  const testSessionId = 'test-session-123';
  const testAssessmentData = {
    questions: {
      q01: { question: 'How old are you?', answer: 25 },
      q02: { question: 'How many hours per week can you practice?', answer: 5 },
      q03: { question: 'What are your musical goals?', answer: ['learn_songs', 'perform_live'] }
    },
    metadata: {
      submitted_at: new Date().toISOString(),
      version: '1.0'
    }
  };

  let assessmentId: string;

  beforeAll(async () => {
    // Mocks are set up in setup.ts
  });

  afterAll(async () => {
    // Cleanup handled by mocks
  });

  describe('submitAssessment', () => {
    it('should successfully submit assessment data', async () => {
      // Mock Hono Context
      const mockC = {
        req: {
          json: jest.fn().mockResolvedValue({
            session_id: testSessionId,
            assessment_data: testAssessmentData
          })
        },
        json: jest.fn()
      };

      await submitAssessment(mockC as any);

      // Verify response
      expect(mockC.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          assessment_id: expect.any(String),
          status: 'processing',
          message: expect.stringContaining('Assessment submitted successfully')
        }),
        201
      );

      // Extract assessment ID for cleanup
      const responseCall = mockC.json.mock.calls[0][0];
      assessmentId = responseCall.assessment_id;
    });

    it('should handle invalid session', async () => {
      // Note: Session validation is handled by middleware, controller assumes valid session
      const mockC = {
        req: {
          json: jest.fn().mockResolvedValue({
            session_id: 'invalid-session',
            assessment_data: testAssessmentData
          })
        },
        json: jest.fn()
      };

      await submitAssessment(mockC as any);

      // Controller doesn't validate session - middleware does
      expect(mockC.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          assessment_id: expect.any(String),
          status: 'processing',
          message: expect.stringContaining('Assessment submitted successfully')
        }),
        201
      );
    });

    it('should handle validation errors', async () => {
      const mockC = {
        req: {
          json: jest.fn().mockResolvedValue({
            // Missing session_id
            assessment_data: testAssessmentData
          })
        },
        json: jest.fn()
      };

      await submitAssessment(mockC as any);

      expect(mockC.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR'
          })
        }),
        400
      );
    });
  });
});