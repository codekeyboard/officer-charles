require('../../core/util/register-aliases');

const request = require('supertest');
const createApp = require('../../src/app');

describe('AI chat routes', () => {
  const originalPath = process.env.PATH;
  let app;
  let interviewId;
  let warnSpy;

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    process.env.AZURE_AI_AUTH_TOKEN = '';
    process.env.FOUNDRY_RESPONSE_TIMEOUT_MS = '1';
    process.env.FOUNDRY_FINAL_EVALUATION_MOCK = 'valid';
    process.env.PATH = '';
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    app = createApp();
  });

  afterAll(() => {
    warnSpy.mockRestore();
    process.env.PATH = originalPath;
  });

  test('GET /health responds with backend status', async () => {
    const response = await request(app).get('/health').expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('ok');
  });

  test('POST /api/ai/chat/start starts a UI-compatible interview', async () => {
    const response = await request(app)
      .post('/api/ai/chat/start')
      .send({
        userName: 'Adam',
        visaType: 'F1',
        mode: 'TRAINING'
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.interviewId).toBeTruthy();
    expect(response.body.data.message).toEqual(expect.any(String));
    expect(response.body.data.mode).toBe('TRAINING');
    expect(response.body.data.visaType).toBe('F1');

    interviewId = response.body.data.interviewId;
  });

  test('POST /api/ai/chat/:interviewId/message sends an answer', async () => {
    const response = await request(app)
      .post(`/api/ai/chat/${encodeURIComponent(interviewId)}/message`)
      .send({
        message: 'I chose this university because the program matches my academic goals and my family will sponsor my tuition.'
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.assistantMessage).toEqual(expect.any(String));
  });

  test('POST /api/ai/chat/:interviewId/complete completes the interview', async () => {
    const response = await request(app)
      .post(`/api/ai/chat/${encodeURIComponent(interviewId)}/complete`)
      .send({})
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('COMPLETED');
    expect(response.body.data.finalEvaluation).toBeTruthy();
  });
});
