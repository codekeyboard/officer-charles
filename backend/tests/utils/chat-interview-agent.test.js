require('../../core/util/register-aliases');

process.env.NODE_ENV = 'test';
process.env.AZURE_AI_AUTH_TOKEN = '';

const { ChatInterviewAgent } = require('../../src/utils/classes/ChatInterviewAgent');

function createFinalEvaluationService() {
  return {
    evaluate: jest.fn(async ({ answers = [] }) => ({
      rubricVersion: 'visa-practical-v1',
      scoringAuthority: 'foundry_agent',
      totalScore: 82,
      label: 'GOOD',
      categoryScores: {
        relevanceAndDirectness: { label: 'Relevance and directness', score: 12, max: 15, evidence: ['The answer addressed the question.'] },
        visaPurposeAndFit: { label: 'Visa purpose and fit', score: 17, max: 20, evidence: ['The answer connected plans to the visa purpose.'] },
        fundingAndEvidence: { label: 'Funding and evidence', score: 17, max: 20, evidence: ['The answer named funding evidence.'] },
        homeTiesAndReturnIntent: { label: 'Home ties and return intent', score: 17, max: 20, evidence: ['The answer included future plans.'] },
        consistencyAndCredibility: { label: 'Consistency and credibility', score: 11, max: 15, evidence: ['The answer stayed credible.'] },
        communicationClarity: { label: 'Communication clarity', score: 8, max: 10, evidence: ['The answer was clear.'] }
      },
      questionReviews: answers.map((answer) => ({
        question: answer.question,
        answerSummary: answer.answer,
        score: 82,
        evidence: ['The applicant gave a specific answer.'],
        strengths: ['Relevant details were included.'],
        weaknesses: ['More evidence would help.'],
        recommendation: 'Add documents, dates, and concise supporting facts.'
      })),
      ruleHits: ['Applied F1 practical interview rules.'],
      redFlags: [],
      summary: 'The applicant gave usable answers.',
      strengths: ['Relevant answers were provided.'],
      weaknesses: ['More evidence would help.'],
      recommendations: ['Practice with specific documents and dates.'],
      disclaimer: 'Practice assessment only. This does not predict or guarantee a visa outcome.',
      message: 'Question-by-question review'
    }))
  };
}

function createAgent(options = {}) {
  return new ChatInterviewAgent({
    aiClient: null,
    finalEvaluationService: createFinalEvaluationService(),
    maxQuestionsByMode: { TRAINING: 8, SIMULATION: 10 },
    ...options
  });
}

describe('ChatInterviewAgent mode flow', () => {
  test('F1 chat interviews always start with passport and Form I-20 document check', async () => {
    const agent = createAgent();
    const started = await agent.startInterview(
      { id: 'f1-doc-user', name: 'Ama' },
      { userName: 'Ama', visaType: 'F1', mode: 'TRAINING' }
    );

    expect(started.message).toContain('passport');
    expect(started.message).toContain('Form I-20');
    expect(started.currentQuestion).toContain('passport');
    expect(started.currentQuestion).toContain('Form I-20');
  });

  test('F1 document check overrides a different Foundry opening question', async () => {
    const aiClient = {
      createJsonResponse: jest.fn(async () => ({ outputText: 'Why did you choose this university?' }))
    };
    const agent = createAgent({ aiClient });
    const started = await agent.startInterview(
      { id: 'f1-foundry-doc-user', name: 'Ama' },
      { userName: 'Ama', visaType: 'F1', mode: 'SIMULATION' }
    );

    expect(started.message).toContain('passport');
    expect(started.message).toContain('Form I-20');
  });

  test('simulation advances to a new question without retrying based on per-answer score', async () => {
    const agent = createAgent();
    const started = await agent.startInterview(
      { id: 'sim-user', name: 'Muhammad Saim' },
      { userName: 'Muhammad Saim', visaType: 'F1', mode: 'SIMULATION' }
    );

    const response = await agent.sendUserAnswer(
      started.interviewId,
      'My father is sponsoring my studies with his savings and income. The funds cover my I-20 cost, and I have bank statements and sponsorship documents.'
    );

    expect(response.scoreVisible).toBe(false);
    expect(response.shouldRepeatQuestion).toBe(false);
    expect(response.nextAction).toBe('ASK_NEXT_QUESTION');
    expect(response.nextQuestion).toEqual(expect.any(String));
    expect(response.nextQuestion).not.toBe(started.currentQuestion);
    expect(response.assistantMessage).not.toContain('Please answer this question clearly');
  });

  test('training still retries weak answers', async () => {
    const agent = createAgent();
    const started = await agent.startInterview(
      { id: 'training-user', name: 'Muhammad Saim' },
      { userName: 'Muhammad Saim', visaType: 'F1', mode: 'TRAINING' }
    );

    const response = await agent.sendUserAnswer(started.interviewId, 'yes');

    expect(response.shouldRepeatQuestion).toBe(true);
    expect(response.nextAction).toBe('REPEAT_QUESTION');
    expect(response.score).toEqual(expect.any(Number));
    expect(response.feedback).toBeTruthy();
  });

  test('saved interview story is passed as internal reference context', async () => {
    const calls = [];
    const aiClient = {
      createJsonResponse: jest.fn(async (input) => {
        calls.push(input);
        return { outputText: 'Why did you choose this university?' };
      })
    };
    const agent = createAgent({ aiClient });

    await agent.startInterview(
      { id: 'story-user', name: 'Ama' },
      {
        userName: 'Ama',
        visaType: 'F1',
        mode: 'SIMULATION',
        interviewStory: {
          storyText: 'I am from Ghana and will study Mathematics at Glenville State University.',
          answers: {
            turns: [
              {
                question: 'What will you study, and where have you been admitted?',
                answer: 'I will study Mathematics at Glenville State University.',
                category: 'study_plan'
              }
            ],
            readyToGenerate: true
          }
        }
      }
    );

    expect(calls[0]).toContain('Saved interview story reference');
    expect(calls[0]).toContain('Glenville State University');
    expect(calls[0]).toContain('Do not recite it');
  });

  test('simulation completes automatically with detailed final evaluation after the final answer', async () => {
    const agent = createAgent({
      maxQuestionsByMode: { TRAINING: 8, SIMULATION: 2 }
    });
    const started = await agent.startInterview(
      { id: 'sim-complete-user', name: 'Muhammad Saim' },
      { userName: 'Muhammad Saim', visaType: 'F1', mode: 'SIMULATION' }
    );

    const first = await agent.sendUserAnswer(
      started.interviewId,
      'I will study information technology because the program matches my previous computer engineering background and career plan.'
    );
    expect(first.nextAction).toBe('ASK_NEXT_QUESTION');

    const completed = await agent.sendUserAnswer(
      started.interviewId,
      'My parents will sponsor my tuition and living expenses with documented savings, income records, and bank statements.'
    );

    expect(completed.status).toBe('COMPLETED');
    expect(completed.nextAction).toBe('COMPLETE_INTERVIEW');
    expect(completed.finalEvaluation.questionReviews).toHaveLength(2);
    expect(completed.finalEvaluation.scoringAuthority).toBe('foundry_agent');
    expect(completed.finalEvaluation.categoryScores).toBeTruthy();
    expect(completed.finalEvaluation.questionReviews[0]).toMatchObject({
      question: expect.any(String),
      answerSummary: expect.any(String),
      strengths: expect.any(Array),
      weaknesses: expect.any(Array),
      recommendation: expect.any(String)
    });
    expect(completed.finalEvaluation.message).toContain('Question-by-question review');
    expect(completed.finalEvaluation.message).not.toMatch(/visaStrength|Strongest area|Review: Needs work/);
    expect((completed.finalEvaluation.message.match(/Overall result/g) || []).length).toBeLessThanOrEqual(1);
  });
});
