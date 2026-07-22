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

describe('v1 user profile and interview routes', () => {
  let app;
  let agent;
  let interviewId;
  let warnSpy;
  const email = `profile.${Date.now()}@example.com`;

  beforeAll(async () => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    app = createApp();
    agent = request.agent(app);

    const registered = await agent
      .post('/api/v1/auth/register')
      .send({
        name: 'Adam',
        email,
        password: 'Password123!'
      })
      .expect(201);

    await agent
      .post('/api/v1/auth/register/verify')
      .send({ email, code: registered.body.data.devCode })
      .expect(200);
  });

  afterAll(() => {
    warnSpy.mockRestore();
  });

  test('GET /api/v1/users/me returns profile', async () => {
    const response = await agent.get('/api/v1/users/me').expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.email).toBe(email);
    expect(response.body.data.name).toBe('Adam');
  });

  test('PATCH /api/v1/users/me updates profile fields', async () => {
    const response = await agent
      .patch('/api/v1/users/me')
      .send({
        name: 'Adam Smith',
        country: 'Pakistan',
        targetVisa: 'F1'
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe('Adam Smith');
    expect(response.body.data.country).toBe('Pakistan');
    expect(response.body.data.targetVisa).toBe('F1');
  });

  test('POST /api/v1/users/me/change-password updates password credentials', async () => {
    const response = await agent
      .post('/api/v1/users/me/change-password')
      .send({
        oldPassword: 'Password123!',
        newPassword: 'Password456!'
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.changed).toBe(true);

    await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password: 'Password456!' })
      .expect(200);
  });

  test('GET and PATCH notification routes work for current user', async () => {
    const list = await agent.get('/api/v1/users/me/notifications').expect(200);
    expect(list.body.success).toBe(true);
    expect(list.body.data.notifications.length).toBeGreaterThanOrEqual(1);

    const notificationId = list.body.data.notifications[0].id;
    const read = await agent
      .patch(`/api/v1/users/me/notifications/${notificationId}/read`)
      .send({})
      .expect(200);

    expect(read.body.data.readAt).toBeTruthy();
  });

  test('GET /api/v1/users/me/usage returns quota summary', async () => {
    const response = await agent.get('/api/v1/users/me/usage').expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.freeChatLimit).toEqual(expect.any(Number));
    expect(response.body.data.usedChat).toBe(0);
    expect(response.body.data.subscription.availableCredits).toBe(20);
  });

  test('POST /api/v1/interviews/chat/start creates persisted chat interview', async () => {
    const response = await agent
      .post('/api/v1/interviews/chat/start')
      .send({ visaType: 'F1', mode: 'TRAINING' })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.interviewType).toBe('CHAT');
    expect(response.body.data.visaType).toBe('F1');
    expect(response.body.data.mode).toBe('TRAINING');
    expect(response.body.data.currentQuestion).toEqual(expect.any(String));
    expect(response.body.data.message).toContain('passport');
    expect(response.body.data.message).toContain('Form I-20');
    expect(response.body.data.currentQuestion).toContain('passport');
    expect(response.body.data.currentQuestion).toContain('Form I-20');

    interviewId = response.body.data.interviewId;
  });

  test('POST /api/v1/interviews/chat/:interviewId/message stores answer and response', async () => {
    const response = await agent
      .post(`/api/v1/interviews/chat/${encodeURIComponent(interviewId)}/message`)
      .send({
        message: 'I chose this university because its computer science program matches my career goals and my family will sponsor my studies.'
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.assistantMessage).toEqual(expect.any(String));
  });

  test('POST /api/v1/interviews/chat/:interviewId/complete persists evaluation', async () => {
    const response = await agent
      .post(`/api/v1/interviews/chat/${encodeURIComponent(interviewId)}/complete`)
      .send({})
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('COMPLETED');
    expect(response.body.data.finalScore).toEqual(expect.any(Number));
    expect(response.body.data.finalEvaluation.scoringAuthority).toBe('foundry_agent');
    expect(response.body.data.finalEvaluation.categoryScores).toBeTruthy();
  });

  test('GET interview summary/messages/evaluation endpoints return persisted data', async () => {
    const summary = await agent.get(`/api/v1/interviews/${encodeURIComponent(interviewId)}`).expect(200);
    const messages = await agent.get(`/api/v1/interviews/${encodeURIComponent(interviewId)}/messages`).expect(200);
    const evaluation = await agent.get(`/api/v1/interviews/${encodeURIComponent(interviewId)}/evaluation`).expect(200);

    expect(summary.body.data.id).toBe(interviewId);
    expect(summary.body.data.status).toBe('COMPLETED');
    expect(messages.body.data.messages.length).toBeGreaterThanOrEqual(3);
    expect(evaluation.body.data.finalScore).toEqual(expect.any(Number));
    expect(evaluation.body.data.finalEvaluation.scoringAuthority).toBe('foundry_agent');
  });

  test('GET /api/v1/users/me/interviews returns interview history with filters', async () => {
    const response = await agent
      .get('/api/v1/users/me/interviews?type=chat&visaType=F1&status=completed')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.total).toBeGreaterThanOrEqual(1);
    expect(response.body.data.items[0].interviewType).toBe('CHAT');
  });

  test('GET /api/v1/interviews returns current user interview history alias', async () => {
    const response = await agent
      .get('/api/v1/interviews?type=chat')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.total).toBeGreaterThanOrEqual(1);
  });

  test('GET /api/v1/users/me/usage includes completed chat count', async () => {
    const response = await agent.get('/api/v1/users/me/usage').expect(200);

    expect(response.body.data.subscription.availableCredits).toBe(15);
    expect(response.body.data.buckets.chatTraining.limit).toBe(3);
    expect(response.body.data.buckets.chatSimulation.limit).toBe(1);
    expect(response.body.data.subscription.creditCosts.CHAT_TRAINING).toBe(5);
    expect(response.body.data.subscription.creditCosts.CHAT_SIMULATION).toBe(10);
  });

  test('chat credits are consumed by mode and stale active chats are auto-closed', async () => {
    const active = await agent
      .post('/api/v1/interviews/chat/start')
      .send({ visaType: 'F1', mode: 'TRAINING' })
      .expect(201);

    const fresh = await agent
      .post('/api/v1/interviews/chat/start')
      .send({ visaType: 'F1', mode: 'TRAINING' })
      .expect(201);

    expect(fresh.body.data.interviewId).not.toBe(active.body.data.interviewId);

    const abandoned = await agent
      .get(`/api/v1/interviews/${encodeURIComponent(active.body.data.interviewId)}`)
      .expect(200);
    expect(abandoned.body.data.status).toBe('ABANDONED');

    const afterAutoClose = await agent.get('/api/v1/users/me/usage').expect(200);
    expect(afterAutoClose.body.data.subscription.availableCredits).toBe(10);

    await agent
      .post(`/api/v1/interviews/chat/${encodeURIComponent(fresh.body.data.interviewId)}/complete`)
      .send({})
      .expect(200);

    const simulation = await agent
      .post('/api/v1/interviews/chat/start')
      .send({ visaType: 'F1', mode: 'SIMULATION' })
      .expect(201);
    await agent
      .post(`/api/v1/interviews/chat/${encodeURIComponent(simulation.body.data.interviewId)}/complete`)
      .send({})
      .expect(200);

    const usage = await agent.get('/api/v1/users/me/usage').expect(200);
    expect(usage.body.data.subscription.availableCredits).toBe(0);

    await agent
      .post('/api/v1/interviews/chat/start')
      .send({ visaType: 'F1', mode: 'TRAINING' })
      .expect(402)
      .expect((response) => {
        expect(response.body.errorCode).toBe('INSUFFICIENT_CREDITS');
      });

    const empty = await agent.get('/api/v1/users/me/usage').expect(200);
    expect(empty.body.data.subscription.availableCredits).toBe(0);
  });
});
