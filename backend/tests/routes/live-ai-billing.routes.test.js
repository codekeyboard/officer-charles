require('../../core/util/register-aliases');

process.env.NODE_ENV = 'test';
process.env.AUTH_STORAGE = 'memory';
process.env.AZURE_AI_AUTH_TOKEN = '';
process.env.FOUNDRY_RESPONSE_TIMEOUT_MS = '1';
process.env.FOUNDRY_FINAL_EVALUATION_MOCK = 'valid';
process.env.PATH = '';
process.env.STRIPE_SECRET_KEY = '';
process.env.STRIPE_PRICE_STARTER = '';
process.env.STRIPE_PRICE_PRO = '';
process.env.STRIPE_PRICE_PREMIUM = '';
process.env.PAYSTACK_SECRET_KEY = '';

const request = require('supertest');
const createApp = require('../../src/app');
const { createBillingRepository } = require('../../src/services/BillingRepository');
const { createInterviewRepository } = require('../../src/services/InterviewRepository');
const VoiceLiveClientModule = require('../../src/utils/classes/VoiceLiveClient');

const VoiceLiveClient = VoiceLiveClientModule.default || VoiceLiveClientModule.VoiceLiveClient;

jest.setTimeout(20000);

describe('v1 live interview, AI admin, plans, and billing routes', () => {
  let app;
  let agent;
  let sessionId;
  let planId;
  let warnSpy;

  beforeAll(async () => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    app = createApp();
    agent = request.agent(app);

    const email = `live.${Date.now()}@example.com`;
    const registered = await agent
      .post('/api/v1/auth/register')
      .send({
        name: 'Live User',
        email,
        password: 'Password123!'
      })
      .expect(201);

    await agent
      .post('/api/v1/auth/register/verify')
      .send({ email, code: registered.body.data.devCode })
      .expect(200);

    const me = await agent.get('/api/v1/users/me').expect(200);
    await createBillingRepository().grantCredits({
      userId: me.body.data.id,
      credits: 200,
      metadata: { source: 'live_route_test_setup' }
    });
  });

  afterAll(() => {
    warnSpy.mockRestore();
  });

  test('POST /api/v1/live-interviews/start creates safe live session', async () => {
    const response = await agent
      .post('/api/v1/live-interviews/start')
      .send({
        visaType: 'B1_B2',
        mode: 'SIMULATION',
        provider: 'VOICE_LIVE',
        enableAvatar: true
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.sessionId).toEqual(expect.any(String));
    expect(response.body.data.sessionId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(response.body.data.sessionId).not.toMatch(/^live_/);
    expect(response.body.data.provider).toBe('VOICE_LIVE');
    expect(response.body.data.connectionInfo).toBeTruthy();
    expect(response.body.data.sessionConfig.avatar.character).toEqual(expect.any(String));
    expect(response.body.data.sessionConfig.avatar.outputProtocol).toBe('webrtc');
    expect([undefined, 'photo-avatar']).toContain(response.body.data.sessionConfig.avatar.type);
    expect(JSON.stringify(response.body.data)).not.toMatch(/api[-_]?key/i);
    sessionId = response.body.data.sessionId;
  });

  test('Voice Live avatar session config uses supported WebRTC avatar and can be omitted', () => {
    const client = new VoiceLiveClient();
    const avatarEnabled = client.createSessionConfig({}, { avatar: { enabled: true } });
    expect(avatarEnabled.avatar).toMatchObject({
      outputProtocol: 'webrtc',
      video: {
        codec: 'h264',
        resolution: { width: 1920, height: 1080 },
        crop: {
          topLeft: [560, 0],
          bottomRight: [1360, 1080]
        },
        bitrate: 1000000
      }
    });
    expect(avatarEnabled.avatar.character).toEqual(expect.any(String));
    expect([undefined, 'photo-avatar']).toContain(avatarEnabled.avatar.type);
    expect(avatarEnabled.avatar.customized).toBeUndefined();

    const avatarDisabled = client.createSessionConfig({}, { avatar: { enabled: false } });
    expect(avatarDisabled.avatar).toBeUndefined();
  });

  test('live token/config/transcript/event/status/complete routes work', async () => {
    const token = await agent
      .post(`/api/v1/live-interviews/${sessionId}/token`)
      .send({ provider: 'AZURE_REALTIME' })
      .expect(200);
    expect(token.body.data.clientSecret).toEqual(expect.any(String));

    const config = await agent
      .post(`/api/v1/live-interviews/${sessionId}/config`)
      .send({})
      .expect(200);
    expect(config.body.data.sessionId).toBe(sessionId);

    const transcript = await agent
      .post(`/api/v1/live-interviews/${sessionId}/transcript`)
      .send({
        speaker: 'user',
        text: 'I want to visit the United States for tourism.',
        timestampMs: 12345,
        isFinal: true
      })
      .expect(201);
    expect(transcript.body.data.stored).toBe(true);

    const event = await agent
      .post(`/api/v1/live-interviews/${sessionId}/event`)
      .send({ eventType: 'response.done', payload: { token: 'secret-value', ok: true } })
      .expect(201);
    expect(event.body.data.eventType).toBe('response.done');

    const status = await agent
      .get(`/api/v1/live-interviews/${sessionId}/status`)
      .expect(200);
    expect(status.body.data.transcriptCount).toBe(1);

    const complete = await agent
      .post(`/api/v1/live-interviews/${sessionId}/complete`)
      .send({})
      .expect(200);
    expect(complete.body.data.finalScore).toEqual(expect.any(Number));
    expect(complete.body.data.recommendations.length).toBeGreaterThan(0);
  });

  test('live starts consume credits by mode and training feedback still works', async () => {
    const before = await agent.get('/api/v1/billing/subscription').expect(200);

    const first = await agent
      .post('/api/v1/live-interviews/start')
      .send({
        visaType: 'B1_B2',
        mode: 'SIMULATION',
        provider: 'VOICE_LIVE',
        enableAvatar: true
      })
      .expect(201);
    await agent
      .post(`/api/v1/live-interviews/${first.body.data.sessionId}/complete`)
      .send({})
      .expect(200);

    const afterSimulation = await agent.get('/api/v1/billing/subscription').expect(200);
    expect(afterSimulation.body.data.availableCredits).toBe(before.body.data.availableCredits - 25);
    expect(afterSimulation.body.data.creditCosts.LIVE_TRAINING).toBe(15);
    expect(afterSimulation.body.data.creditCosts.LIVE_SIMULATION).toBe(25);

    const training = await agent
      .post('/api/v1/live-interviews/start')
      .send({
        visaType: 'F1',
        mode: 'TRAINING',
        provider: 'VOICE_LIVE',
        enableAvatar: false
      })
      .expect(201);

    await agent
      .post(`/api/v1/live-interviews/${training.body.data.sessionId}/transcript`)
      .send({
        speaker: 'assistant',
        text: 'Who will sponsor your education?',
        isFinal: true
      })
      .expect(201);

    const feedback = await agent
      .post(`/api/v1/live-interviews/${training.body.data.sessionId}/transcript`)
      .send({
        speaker: 'user',
        text: 'My father will sponsor my studies with documented savings and business income.',
        isFinal: true
      })
      .expect(201);
    expect(feedback.body.data.trainingFeedback.score).toEqual(expect.any(Number));
    expect(feedback.body.data.trainingFeedback.feedback.good).toEqual(expect.any(String));
    expect(feedback.body.data.trainingFeedback.nextAction).toMatch(/ASK_NEXT_QUESTION|REPEAT_QUESTION/);

    await agent
      .post(`/api/v1/live-interviews/${training.body.data.sessionId}/complete`)
      .send({})
      .expect(200);

    const afterTraining = await agent.get('/api/v1/billing/subscription').expect(200);
    expect(afterTraining.body.data.availableCredits).toBe(afterSimulation.body.data.availableCredits - 15);

    await agent
      .post('/api/v1/live-interviews/start')
      .send({
        visaType: 'F1',
        mode: 'TRAINING',
        provider: 'VOICE_LIVE',
        enableAvatar: false
      })
      .expect(201);

    const afterSecondTraining = await agent.get('/api/v1/billing/subscription').expect(200);
    expect(afterSecondTraining.body.data.availableCredits).toBe(afterTraining.body.data.availableCredits - 15);
  });

  test('live transcript final answers do not auto-complete before explicit completion', async () => {
    const live = await agent
      .post('/api/v1/live-interviews/start')
      .send({
        visaType: 'F1',
        mode: 'SIMULATION',
        provider: 'VOICE_LIVE',
        enableAvatar: false
      })
      .expect(201);

    let finalResponse;
    for (let index = 1; index <= 12; index += 1) {
      await agent
        .post(`/api/v1/live-interviews/${live.body.data.sessionId}/transcript`)
        .send({
          speaker: 'assistant',
          text: `Simulation question ${index}?`,
          isFinal: true
        })
        .expect(201);

      finalResponse = await agent
        .post(`/api/v1/live-interviews/${live.body.data.sessionId}/transcript`)
        .send({
          speaker: 'user',
          text: `Answer ${index} with clear funding, purpose, and home ties.`,
          isFinal: true
        })
        .expect(201);
    }

    expect(finalResponse.body.data.status).toBeUndefined();
    expect(finalResponse.body.data.nextAction).toBeUndefined();
    expect(finalResponse.body.data.finalEvaluation).toBeUndefined();

    const status = await agent
      .get(`/api/v1/live-interviews/${live.body.data.sessionId}/status`)
      .expect(200);
    expect(status.body.data.status).toBe('active');

    const complete = await agent
      .post(`/api/v1/live-interviews/${live.body.data.sessionId}/complete`)
      .send({})
      .expect(200);
    expect(complete.body.data.finalScore).toEqual(expect.any(Number));
    expect(complete.body.data.finalEvaluation.scoringAuthority).toBe('foundry_agent');
    expect(complete.body.data.finalEvaluation.categoryScores).toBeTruthy();
    expect(complete.body.data.finalEvaluation.questionReviews.length).toBeGreaterThan(0);
  });

  test('live assistant completion phrase ends through agent signal', async () => {
    const live = await agent
      .post('/api/v1/live-interviews/start')
      .send({
        visaType: 'F1',
        mode: 'SIMULATION',
        provider: 'VOICE_LIVE',
        enableAvatar: false
      })
      .expect(201);

    await agent
      .post(`/api/v1/live-interviews/${live.body.data.sessionId}/transcript`)
      .send({
        speaker: 'user',
        text: 'I chose this university because the curriculum matches my goals and my family can fund it.',
        isFinal: true
      })
      .expect(201);

    const response = await agent
      .post(`/api/v1/live-interviews/${live.body.data.sessionId}/transcript`)
      .send({
        speaker: 'assistant',
        text: 'This completes the interview. I will prepare your evaluation now.',
        isFinal: true
      })
      .expect(201);

    expect(response.body.data.status).toBe('COMPLETED');
    expect(response.body.data.nextAction).toBe('COMPLETE_INTERVIEW');
    expect(response.body.data.finalEvaluation.scoringAuthority).toBe('foundry_agent');
    expect(response.body.data.finalEvaluation.categoryScores).toBeTruthy();
  });

  test('invalid Foundry evaluation blocks live completion without ending session', async () => {
    const live = await agent
      .post('/api/v1/live-interviews/start')
      .send({
        visaType: 'B1_B2',
        mode: 'SIMULATION',
        provider: 'VOICE_LIVE',
        enableAvatar: false
      })
      .expect(201);

    await agent
      .post(`/api/v1/live-interviews/${live.body.data.sessionId}/transcript`)
      .send({
        speaker: 'user',
        text: 'I will visit New York for tourism for two weeks and return to my job.',
        isFinal: true
      })
      .expect(201);

    process.env.FOUNDRY_FINAL_EVALUATION_MOCK = 'invalid';
    try {
      await agent
        .post(`/api/v1/live-interviews/${live.body.data.sessionId}/complete`)
        .send({})
        .expect(503)
        .expect((response) => {
          expect(response.body.errorCode).toBe('EVALUATION_UNAVAILABLE');
        });
    } finally {
      process.env.FOUNDRY_FINAL_EVALUATION_MOCK = 'valid';
    }

    const status = await agent
      .get(`/api/v1/live-interviews/${live.body.data.sessionId}/status`)
      .expect(200);
    expect(status.body.data.status).toBe('active');
  });

  test('stale live parent interview without active session does not block new start', async () => {
    const me = await agent.get('/api/v1/users/me').expect(200);
    const repository = createInterviewRepository();
    await repository.createInterview({
      id: `live_stale_${Date.now()}`,
      userId: me.body.data.id,
      interviewType: 'LIVE',
      visaType: 'F1',
      mode: 'SIMULATION',
      status: 'ACTIVE'
    });

    const response = await agent
      .post('/api/v1/live-interviews/start')
      .send({
        visaType: 'F1',
        mode: 'SIMULATION',
        provider: 'VOICE_LIVE',
        enableAvatar: false
      })
      .expect(201);

    expect(response.body.data.sessionId).toMatch(/^[0-9a-f-]{36}$/i);
  });

  test('stuck active live session is auto-closed and refunded before new start', async () => {
    const isolatedAgent = request.agent(app);
    const email = `stuck.live.${Date.now()}@example.com`;
    const registered = await isolatedAgent
      .post('/api/v1/auth/register')
      .send({
        name: 'Stuck Live User',
        email,
        password: 'Password123!'
      })
      .expect(201);
    await isolatedAgent
      .post('/api/v1/auth/register/verify')
      .send({ email, code: registered.body.data.devCode })
      .expect(200);

    const before = await isolatedAgent.get('/api/v1/billing/subscription').expect(200);
    const oldLive = await isolatedAgent
      .post('/api/v1/live-interviews/start')
      .send({
        visaType: 'F1',
        mode: 'TRAINING',
        provider: 'VOICE_LIVE',
        enableAvatar: false
      })
      .expect(201);

    const freshLive = await isolatedAgent
      .post('/api/v1/live-interviews/start')
      .send({
        visaType: 'F1',
        mode: 'TRAINING',
        provider: 'VOICE_LIVE',
        enableAvatar: false
      })
      .expect(201);

    expect(freshLive.body.data.sessionId).not.toBe(oldLive.body.data.sessionId);

    const oldStatus = await isolatedAgent
      .get(`/api/v1/live-interviews/${oldLive.body.data.sessionId}/status`)
      .expect(200);
    expect(oldStatus.body.data.status).toBe('ended');

    const after = await isolatedAgent.get('/api/v1/billing/subscription').expect(200);
    expect(after.body.data.availableCredits).toBe(before.body.data.availableCredits - 15);

    await isolatedAgent
      .post(`/api/v1/live-interviews/${freshLive.body.data.sessionId}/complete`)
      .send({})
      .expect(200);
  });

  test('AI config test endpoints return frontend-safe config', async () => {
    const voice = await request(app).post('/api/v1/ai/voice-live/test-config').send({}).expect(200);
    const realtime = await request(app).post('/api/v1/ai/realtime/test-config').send({}).expect(200);
    const endpoints = await request(app).get('/api/v1/ai/endpoints').expect(200);

    expect(voice.body.data.sessionConfig).toBeTruthy();
    expect(voice.body.data.endpoints.webRtcUrl).toContain('/voice-live/realtime/calls?');
    expect(realtime.body.data.sessionConfig).toBeTruthy();
    expect(endpoints.body.data.voiceLive.websocketModel).toContain('/voice-live/realtime?');
  });

  test('AI chat test endpoint fails cleanly without auth/provider access', async () => {
    const response = await request(app)
      .post('/api/v1/ai/chat/test')
      .send({ message: 'Ask me one F1 visa question.' })
      .expect(504);

    expect(response.body.success).toBe(false);
    expect(response.body.errorCode).toBe('AI_PROVIDER_ERROR');
  });

  test('AI foundry-agent test endpoint fails cleanly without auth/provider access', async () => {
    const response = await request(app)
      .post('/api/v1/ai/foundry-agent/test')
      .send({ message: 'Ask me one F1 visa question.' })
      .expect(504);

    expect(response.body.success).toBe(false);
    expect(response.body.errorCode).toBe('AI_PROVIDER_ERROR');
  });

  test('plans and billing endpoints work', async () => {
    const plans = await request(app).get('/api/v1/plans').expect(200);
    expect(plans.body.data.length).toBeGreaterThanOrEqual(2);
    planId = plans.body.data[0].id;
    expect(plans.body.data[0].key).toBe('starter');
    expect(plans.body.data[0].creditAmount).toBe(100);
    expect(plans.body.data[0].features).toEqual(['100 credits']);

    const subscription = await agent.get('/api/v1/billing/subscription').expect(200);
    expect(subscription.body.data.status).toBe('credits');
    expect(subscription.body.data.availableCredits).toEqual(expect.any(Number));

    const checkoutUnavailable = await agent
      .post('/api/v1/billing/checkout')
      .send({ planKey: 'starter' })
      .expect(503);
    expect(checkoutUnavailable.body.errorCode).toBe('STRIPE_NOT_CONFIGURED');

    const paystackUnavailable = await agent
      .post('/api/v1/billing/checkout')
      .send({ planKey: 'starter', provider: 'paystack' })
      .expect(503);
    expect(paystackUnavailable.body.errorCode).toBe('PAYSTACK_NOT_CONFIGURED');

    const afterCheckout = await agent.get('/api/v1/billing/subscription').expect(200);
    expect(afterCheckout.body.data.status).toBe('credits');

    const notifications = await agent.get('/api/v1/users/me/notifications').expect(200);
    expect(notifications.body.data.notifications.some((item) => item.title === 'Checkout started')).toBe(false);

    const history = await agent.get('/api/v1/billing/history').expect(200);
    expect(history.body.data.payments.length).toBe(0);
  });
});
