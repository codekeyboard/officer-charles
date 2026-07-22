require('../../core/util/register-aliases');

process.env.NODE_ENV = 'test';
process.env.AUTH_STORAGE = 'memory';
process.env.AZURE_AI_AUTH_TOKEN = '';
process.env.FOUNDRY_RESPONSE_TIMEOUT_MS = '1';
process.env.FOUNDRY_FINAL_EVALUATION_MOCK = 'valid';
process.env.PATH = '';

const request = require('supertest');
const createApp = require('../../src/app');
const { createBillingRepository } = require('../../src/services/BillingRepository');

jest.setTimeout(20000);

const DEFAULT_COST_SETTINGS = {
  chatTrainingCreditCost: 5,
  chatSimulationCreditCost: 10,
  liveTrainingCreditCost: 15,
  liveSimulationCreditCost: 25,
  storyBuilderCreditCost: 10
};

const CUSTOM_COST_SETTINGS = {
  chatTrainingCreditCost: 7,
  chatSimulationCreditCost: 11,
  liveTrainingCreditCost: 13,
  liveSimulationCreditCost: 17,
  storyBuilderCreditCost: 19
};

const storyAnswers = [
  'Ghana',
  'I work in customer support and enjoy helping people solve problems.',
  'Employed',
  'Glenville State University',
  'Bachelor of Mathematics',
  'I chose this program because it will strengthen my analytical skills.',
  'I chose this university because the program and student support match my goals.',
  'Parents',
  'University Housing',
  'After my studies, I plan to return home and build my career.',
  'Ghana',
  'This degree will help me qualify for better data and analytical roles.'
];

describe('admin configurable credit costs', () => {
  let app;
  let agent;
  let warnSpy;

  beforeAll(async () => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    app = createApp();
    agent = request.agent(app);

    await request(app)
      .patch('/api/v1/admin/settings')
      .send(CUSTOM_COST_SETTINGS)
      .expect(200);

    const email = `credit.cost.${Date.now()}@example.com`;
    const registered = await agent
      .post('/api/v1/auth/register')
      .send({ name: 'Credit Cost User', email, password: 'Password123!' })
      .expect(201);

    const verified = await agent
      .post('/api/v1/auth/register/verify')
      .send({ email, code: registered.body.data.devCode })
      .expect(200);

    await createBillingRepository().grantCredits({
      userId: verified.body.data.user.id,
      credits: 200,
      metadata: { source: 'admin_credit_cost_test_setup' }
    });
  });

  afterAll(async () => {
    await request(app)
      .patch('/api/v1/admin/settings')
      .send(DEFAULT_COST_SETTINGS)
      .expect(200);
    warnSpy.mockRestore();
  });

  test('admin settings expose custom costs and every paid usage path consumes them', async () => {
    const before = await agent.get('/api/v1/billing/subscription').expect(200);
    expect(before.body.data.availableCredits).toBe(220);
    expect(before.body.data.creditCosts).toMatchObject({
      CHAT_TRAINING: 7,
      CHAT_SIMULATION: 11,
      LIVE_TRAINING: 13,
      LIVE_SIMULATION: 17,
      STORY_BUILDER: 19
    });

    await agent
      .post('/api/v1/interviews/chat/start')
      .send({ visaType: 'F1', mode: 'TRAINING' })
      .expect(201);

    const afterChatTraining = await agent.get('/api/v1/billing/subscription').expect(200);
    expect(afterChatTraining.body.data.availableCredits).toBe(213);

    await agent
      .post('/api/v1/interviews/chat/start')
      .send({ visaType: 'F1', mode: 'SIMULATION' })
      .expect(201);

    const afterChatSimulation = await agent.get('/api/v1/billing/subscription').expect(200);
    expect(afterChatSimulation.body.data.availableCredits).toBe(202);

    await agent
      .post('/api/v1/live-interviews/start')
      .send({ visaType: 'F1', mode: 'TRAINING', provider: 'VOICE_LIVE', enableAvatar: false })
      .expect(201);

    const afterLiveTraining = await agent.get('/api/v1/billing/subscription').expect(200);
    expect(afterLiveTraining.body.data.availableCredits).toBe(189);

    await agent
      .post('/api/v1/live-interviews/start')
      .send({ visaType: 'B1_B2', mode: 'SIMULATION', provider: 'VOICE_LIVE', enableAvatar: false })
      .expect(201);

    const afterLiveSimulation = await agent.get('/api/v1/billing/subscription').expect(200);
    expect(afterLiveSimulation.body.data.availableCredits).toBe(172);

    await completeStoryFlow(agent);

    const storyBeforeGenerate = await agent.get('/api/v1/interview-stories/F1').expect(200);
    expect(storyBeforeGenerate.body.data.creditCost).toBe(19);

    const generated = await agent
      .post('/api/v1/interview-stories/F1/generate')
      .send({})
      .expect(201);
    expect(generated.body.data.creditCost).toBe(19);

    const afterStory = await agent.get('/api/v1/billing/subscription').expect(200);
    expect(afterStory.body.data.availableCredits).toBe(153);

    const usage = await agent.get('/api/v1/users/me/usage').expect(200);
    expect(usage.body.data.subscription.creditCosts).toMatchObject({
      CHAT_TRAINING: 7,
      CHAT_SIMULATION: 11,
      LIVE_TRAINING: 13,
      LIVE_SIMULATION: 17,
      STORY_BUILDER: 19
    });
  });
});

async function completeStoryFlow(agent) {
  let latest = await agent
    .post('/api/v1/interview-stories/F1/flow/start')
    .send({ reset: true })
    .expect(200)
    .then((response) => response.body.data);

  for (let index = 0; index < storyAnswers.length; index += 1) {
    latest = await agent
      .patch('/api/v1/interview-stories/F1/flow/answer')
      .send({ questionId: latest.flow.question.id, answer: storyAnswers[index] })
      .expect(200)
      .then((response) => response.body.data);
  }

  expect(latest.flow.complete).toBe(true);
}
