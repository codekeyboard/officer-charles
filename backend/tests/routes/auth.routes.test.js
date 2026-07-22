require('../../core/util/register-aliases');

process.env.NODE_ENV = 'test';
process.env.AUTH_STORAGE = 'memory';
process.env.GOOGLE_CLIENT_ID = '';
process.env.GOOGLE_CLIENT_SECRET = '';

const request = require('supertest');
const createApp = require('../../src/app');

describe('v1 health and auth routes', () => {
  let app;
  let agent;
  let accessToken;
  const email = `adam.${Date.now()}@example.com`;

  beforeAll(() => {
    app = createApp();
    agent = request.agent(app);
  });

  test('GET /api/v1/health responds with standard shape', async () => {
    const response = await request(app).get('/api/v1/health').expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toEqual(expect.any(String));
    expect(response.body.data.status).toBe('ok');
  });

  test('GET /api/v1/health/ai responds for development admin user', async () => {
    const response = await request(app).get('/api/v1/health/ai').expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.foundryConfigured).toEqual(expect.any(Boolean));
  });

  test('POST /api/v1/auth/register sends a verification code', async () => {
    const response = await agent
      .post('/api/v1/auth/register')
      .send({
        name: 'Adam',
        email,
        password: 'Password123!'
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Verification code sent.');
    expect(response.body.data.email).toBe(email);
    expect(response.body.data.verificationRequired).toBe(true);
    expect(response.body.data.devCode).toMatch(/^\d{6}$/);
    expect(response.headers['set-cookie']).toBeUndefined();
  });

  test('POST /api/v1/auth/register/verify activates user and auth cookie', async () => {
    const pending = await agent
      .post('/api/v1/auth/register/resend')
      .send({ email })
      .expect(200);

    const response = await agent
      .post('/api/v1/auth/register/verify')
      .send({ email, code: pending.body.data.devCode })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Email verified.');
    expect(response.body.data.user.email).toBe(email);
    expect(response.body.data.accessToken).toEqual(expect.any(String));
    expect(response.headers['set-cookie'].join(';')).toContain('oc_refresh_token');
    accessToken = response.body.data.accessToken;
  });

  test('GET /api/v1/auth/me returns the bearer-token user', async () => {
    const response = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe(email);
  });

  test('POST /api/v1/auth/refresh rotates session from cookie', async () => {
    const response = await agent
      .post('/api/v1/auth/refresh')
      .send({})
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Token refreshed.');
    expect(response.body.data.accessToken).toEqual(expect.any(String));
  });

  test('POST /api/v1/auth/login authenticates by email/password', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password: 'Password123!' })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe(email);
  });

  test('GET /api/v1/auth/google reports missing config', async () => {
    const response = await request(app).get('/api/v1/auth/google').expect(501);

    expect(response.body.success).toBe(false);
    expect(response.body.errorCode).toBe('GOOGLE_OAUTH_NOT_CONFIGURED');
  });

  test('GET /api/v1/auth/google/callback requires authorization code', async () => {
    const response = await request(app).get('/api/v1/auth/google/callback').expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.errorCode).toBe('GOOGLE_CODE_REQUIRED');
  });

  test('POST /api/v1/auth/logout clears cookies', async () => {
    const response = await agent
      .post('/api/v1/auth/logout')
      .send({})
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.loggedOut).toBe(true);
  });
});
