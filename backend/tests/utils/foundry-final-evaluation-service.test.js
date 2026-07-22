require('../../core/util/register-aliases');

process.env.NODE_ENV = 'test';
process.env.FOUNDRY_FINAL_EVALUATION_MOCK = '';

const {
  FoundryFinalEvaluationService,
  RUBRIC,
  RUBRIC_VERSION,
  SCORING_AUTHORITY
} = require('../../src/utils/classes/FoundryFinalEvaluationService');

function createValidEvaluation(overrides = {}) {
  const categoryScores = Object.fromEntries(Object.entries(RUBRIC).map(([key, item]) => [key, {
    score: item.max - 2,
    max: item.max,
    evidence: [`Evidence for ${key}.`]
  }]));
  const totalScore = Object.values(categoryScores).reduce((sum, item) => sum + item.score, 0);
  return {
    rubricVersion: RUBRIC_VERSION,
    scoringAuthority: SCORING_AUTHORITY,
    totalScore,
    label: 'GOOD',
    categoryScores,
    questionReviews: [{
      question: 'Why did you choose this university?',
      answerSummary: 'The applicant gave a program-fit answer.',
      score: totalScore,
      evidence: ['The answer mentioned program fit.'],
      strengths: ['Relevant academic detail.'],
      weaknesses: ['More document-level evidence would help.'],
      recommendation: 'Add specific faculty, coursework, and career connection.'
    }],
    ruleHits: ['F1 university/program fit was addressed.'],
    redFlags: [],
    summary: 'The applicant is reasonably prepared.',
    strengths: ['The applicant answered directly.'],
    weaknesses: ['Some evidence is still general.'],
    recommendations: ['Practice sponsor, documents, and return-plan details.'],
    disclaimer: 'Practice assessment only. This does not predict or guarantee a visa outcome.',
    ...overrides
  };
}

function createService(response) {
  return new FoundryFinalEvaluationService({
    foundryClient: {
      createJsonResponse: jest.fn(async () => ({ outputText: JSON.stringify(response) }))
    },
    logger: { warn: jest.fn() }
  });
}

describe('FoundryFinalEvaluationService', () => {
  test('validates and normalizes a Foundry scorecard', async () => {
    const service = createService(createValidEvaluation());
    const evaluation = await service.evaluate({
      interview: { id: 'chat_1', interviewType: 'CHAT', visaType: 'F1', mode: 'SIMULATION' },
      answers: [{ question: 'Why this university?', answer: 'The program fits my goals.' }]
    });

    expect(evaluation.scoringAuthority).toBe('foundry_agent');
    expect(evaluation.categoryScores.fundingAndEvidence.evidence.length).toBeGreaterThan(0);
    expect(evaluation.message).toContain('Category scorecard');
  });

  test('rejects invalid Foundry JSON without producing a local score', async () => {
    const service = new FoundryFinalEvaluationService({
      foundryClient: { createJsonResponse: jest.fn(async () => ({ outputText: 'not json' })) },
      logger: { warn: jest.fn() }
    });

    await expect(service.evaluate({
      interview: { id: 'chat_2', interviewType: 'CHAT', visaType: 'F1', mode: 'SIMULATION' },
      answers: [{ question: 'Who pays?', answer: 'My father pays.' }]
    })).rejects.toMatchObject({
      errorCode: 'EVALUATION_UNAVAILABLE'
    });
  });

  test('rejects category totals that do not match totalScore', async () => {
    const service = createService(createValidEvaluation({ totalScore: 100 }));

    await expect(service.evaluate({
      interview: { id: 'chat_3', interviewType: 'CHAT', visaType: 'B1_B2', mode: 'SIMULATION' },
      answers: [{ question: 'Purpose?', answer: 'Tourism for two weeks.' }]
    })).rejects.toMatchObject({
      errorCode: 'EVALUATION_UNAVAILABLE'
    });
  });

  test('prompt includes F1 and B1/B2 visa-specific rules', () => {
    const service = createService(createValidEvaluation());
    const f1Prompt = service.buildEvaluationPrompt({
      interviewId: 'f1',
      interviewType: 'CHAT',
      visaType: 'F1',
      mode: 'SIMULATION',
      answerPairs: []
    });
    const b1b2Prompt = service.buildEvaluationPrompt({
      interviewId: 'b1b2',
      interviewType: 'LIVE',
      visaType: 'B1_B2',
      mode: 'SIMULATION',
      answerPairs: []
    });

    expect(f1Prompt).toContain('University and program fit');
    expect(f1Prompt).toContain('Sponsor, funding source, and financial evidence');
    expect(b1b2Prompt).toContain('Clear temporary travel purpose');
    expect(b1b2Prompt).toContain('Specific itinerary, duration, destination, and activities');
  });
});
