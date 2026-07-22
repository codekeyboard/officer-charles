require('../../core/util/register-aliases');

process.env.NODE_ENV = 'test';
process.env.AUTH_STORAGE = 'memory';
process.env.AZURE_AI_AUTH_TOKEN = '';
process.env.FOUNDRY_RESPONSE_TIMEOUT_MS = '1';
process.env.FOUNDRY_FINAL_EVALUATION_MOCK = 'valid';
process.env.PATH = '';

const request = require('supertest');
const createApp = require('../../src/app');

jest.setTimeout(20000);

const f1Answers = [
  'Ghana',
  'I completed secondary school in Ghana and enjoy analytical problem-solving.',
  'Student',
  'Glenville State University',
  'Bachelor of Mathematics',
  'I chose Mathematics because I want stronger quantitative and analytical skills.',
  'I chose this university because the program structure and support services fit my goals.',
  'Parents',
  'University Housing',
  'After graduation, I plan to return home and work in data analysis.',
  'Ghana',
  'This degree will help me build quantitative skills for my future career goals.'
];

const b1b2Answers = [
  'Ghana',
  'I manage customer service and sales for my family business.',
  'Employed',
  'I plan to attend a family wedding and visit relatives.',
  'I plan to stay for three weeks.',
  'Myself',
  'Family/Friends',
  'After the trip, I plan to return to my work and family responsibilities.',
  'Ghana',
  'This trip will help me maintain family relationships while keeping my responsibilities at home.'
];

async function registerAgent(app, name = 'Story User') {
  const agent = request.agent(app);
  const email = `story.${Date.now()}.${Math.random()}@example.com`;
  const registered = await agent
    .post('/api/v1/auth/register')
    .send({ name, email, password: 'Password123!' })
    .expect(201);

  await agent
    .post('/api/v1/auth/register/verify')
    .send({ email, code: registered.body.data.devCode })
    .expect(200);

  return agent;
}

async function completeStoryFlow(agent, visaType = 'F1', answers = f1Answers) {
  const started = await agent
    .post(`/api/v1/interview-stories/${visaType}/flow/start`)
    .send({})
    .expect(200);

  expect(started.body.data.flow.question).toMatchObject({
    id: expect.any(String),
    question: expect.any(String),
    index: 0
  });

  let latest = started.body.data;
  for (let index = 0; index < answers.length; index += 1) {
    const question = latest.flow.question;
    const response = await agent
      .patch(`/api/v1/interview-stories/${visaType}/flow/answer`)
      .send({ questionId: question.id, answer: answers[index] })
      .expect(200);
    latest = response.body.data;
  }

  expect(latest.flow.complete).toBe(true);
  expect(latest.story.answers.readyToGenerate).toBe(true);
  expect(latest.story.answers.turns).toHaveLength(answers.length);
  return latest;
}

describe('interview story builder routes', () => {
  let app;
  let agent;
  let warnSpy;

  beforeAll(async () => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    app = createApp();
    agent = await registerAgent(app);
  });

  afterAll(() => {
    delete process.env.STORY_BUILDER_MOCK_FAILURE;
    warnSpy.mockRestore();
  });

  test('wizard flow starts with backend-defined F1 question and does not charge credits', async () => {
    const before = await agent.get('/api/v1/users/me/usage').expect(200);

    const started = await agent
      .post('/api/v1/interview-stories/F1/flow/start')
      .send({})
      .expect(200);

    expect(started.body.data.flow.totalQuestions).toBe(12);
    expect(started.body.data.flow.question).toMatchObject({
      id: 'country',
      category: 'past',
      inputType: 'text',
      index: 0
    });
    expect(started.body.data.flow.question.question).toContain('country');
    expect(started.body.data.story.answers.turns).toHaveLength(0);

    await agent
      .post('/api/v1/interview-stories/F1/generate')
      .send({})
      .expect(409)
      .expect((response) => {
        expect(response.body.errorCode).toBe('STORY_NOT_READY');
      });

    const first = await agent
      .patch('/api/v1/interview-stories/F1/flow/answer')
      .send({ questionId: 'country', answer: f1Answers[0] })
      .expect(200);

    expect(first.body.data.flow.question.id).toBe('background');
    expect(first.body.data.flow.answeredCount).toBe(1);
    expect(first.body.data.story.answers.turns[0]).toMatchObject({
      id: 'country',
      answer: f1Answers[0],
      category: 'past'
    });

    const after = await agent.get('/api/v1/users/me/usage').expect(200);
    expect(after.body.data.subscription.availableCredits).toBe(before.body.data.subscription.availableCredits);
  });

  test('saves all wizard answers, reviews them in order, and generates at 10 credits', async () => {
    let latest = await agent
      .get('/api/v1/interview-stories/F1')
      .expect(200)
      .then((response) => response.body.data);

    for (let index = latest.flow.answeredCount; index < f1Answers.length; index += 1) {
      const question = latest.flow.answers[index];
      const response = await agent
        .patch('/api/v1/interview-stories/F1/flow/answer')
        .send({ questionId: question.id, answer: f1Answers[index] })
        .expect(200);
      latest = response.body.data;
    }

    expect(latest.flow.complete).toBe(true);

    const review = await agent.get('/api/v1/interview-stories/F1/flow/review').expect(200);
    expect(review.body.data.flow.answers).toHaveLength(12);
    expect(review.body.data.flow.answers[3]).toMatchObject({
      id: 'university',
      answer: 'Glenville State University'
    });

    const generated = await agent
      .post('/api/v1/interview-stories/F1/generate')
      .send({})
      .expect(201);

    expect(generated.body.data.creditCost).toBe(10);
    expect(generated.body.data.story.storyText.split(/\s+/).length).toBeGreaterThanOrEqual(150);

    const afterFirst = await agent.get('/api/v1/users/me/usage').expect(200);
    expect(afterFirst.body.data.subscription.availableCredits).toBe(10);
  });

  test('regeneration pre-fills existing answers, allows edits for free, and charges another 10 credits', async () => {
    const restart = await agent
      .post('/api/v1/interview-stories/F1/flow/start')
      .send({ reset: true })
      .expect(200);

    expect(restart.body.data.flow.question.id).toBe('country');
    expect(restart.body.data.flow.question.answer).toBe(f1Answers[0]);
    expect(restart.body.data.flow.complete).toBe(true);

    const edited = await agent
      .patch('/api/v1/interview-stories/F1/flow/answer')
      .send({
        questionId: 'program',
        answer: 'Bachelor of Applied Mathematics',
        nextIndex: 11
      })
      .expect(200);

    expect(edited.body.data.flow.answers[4].answer).toContain('Applied Mathematics');

    const afterEdit = await agent.get('/api/v1/users/me/usage').expect(200);
    expect(afterEdit.body.data.subscription.availableCredits).toBe(10);

    const regenerated = await agent
      .post('/api/v1/interview-stories/F1/generate')
      .send({})
      .expect(201);

    expect(regenerated.body.data.story.answers.turns[4].answer).toContain('Applied Mathematics');

    const afterSecond = await agent.get('/api/v1/users/me/usage').expect(200);
    expect(afterSecond.body.data.subscription.availableCredits).toBe(0);
  });

  test('returns insufficient credits when generating without enough balance', async () => {
    await agent
      .post('/api/v1/interview-stories/F1/generate')
      .send({})
      .expect(402)
      .expect((response) => {
        expect(response.body.errorCode).toBe('INSUFFICIENT_CREDITS');
      });
  });

  test('supports B1/B2 wizard story generation for a separate user', async () => {
    const second = await registerAgent(app, 'Visitor User');
    await completeStoryFlow(second, 'B1_B2', b1b2Answers);

    const generated = await second
      .post('/api/v1/interview-stories/B1_B2/generate')
      .send({})
      .expect(201);

    expect(generated.body.data.story.visaType).toBe('B1_B2');
    expect(generated.body.data.story.storyText).toContain('I');
  });

  test('refunds credits when story generation fails after debit', async () => {
    const failing = await registerAgent(app, 'Fail User');
    await completeStoryFlow(failing, 'F1', f1Answers);

    process.env.STORY_BUILDER_MOCK_FAILURE = 'true';
    await failing
      .post('/api/v1/interview-stories/F1/generate')
      .send({})
      .expect(502);
    delete process.env.STORY_BUILDER_MOCK_FAILURE;

    const after = await failing.get('/api/v1/users/me/usage').expect(200);
    expect(after.body.data.subscription.availableCredits).toBe(20);
  });

  test('does not expose one user story to another user account', async () => {
    const isolated = await registerAgent(app, 'Isolated User');
    const loaded = await isolated.get('/api/v1/interview-stories/F1').expect(200);
    expect(loaded.body.data.story).toBeNull();
    expect(loaded.body.data.flow.answers.every((answer) => !answer.answer)).toBe(true);
  });
});
