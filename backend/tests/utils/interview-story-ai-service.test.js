require('../../core/util/register-aliases');

process.env.NODE_ENV = 'test';
process.env.AZURE_AI_AUTH_TOKEN = '';

const { InterviewStoryAIService } = require('../../src/services/InterviewStoryAIService');

function makeService() {
  return new InterviewStoryAIService({
    foundryClient: { createJsonResponse: jest.fn() },
    logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn() }
  });
}

describe('InterviewStoryAIService', () => {
  afterEach(() => {
    delete process.env.STORY_BUILDER_MOCK_FAILURE;
  });

  test('generates valid first-person story between 150 and 250 words in test mode', async () => {
    const service = makeService();
    const story = await service.generate({
      user: { id: 'user-1', name: 'Ama' },
      visaType: 'F1',
      storyState: {
        turns: [
          { question: 'Background?', answer: 'I am from Ghana and enjoy analytical problem-solving.', category: 'background' },
          { question: 'Study?', answer: 'I have been admitted to Glenville State University to study Mathematics.', category: 'study_plan' },
          { question: 'Funding?', answer: 'My father will sponsor my tuition and living expenses.', category: 'funding' },
          { question: 'Return?', answer: 'I plan to return to Ghana after graduation and work in data analysis.', category: 'return_plan' }
        ],
        readyToGenerate: true
      }
    });

    const wordCount = story.split(/\s+/).length;
    expect(story).toMatch(/\bI\b/);
    expect(story).toMatch(/\bmy\b/i);
    expect(wordCount).toBeGreaterThanOrEqual(150);
    expect(wordCount).toBeLessThanOrEqual(250);
  });

  test('rejects empty or non-first-person story output', () => {
    const service = makeService();
    expect(() => service.validateStoryText('')).toThrow();
    expect(() => service.validateStoryText('The applicant has a clear plan.'.repeat(80))).toThrow();
  });
});
