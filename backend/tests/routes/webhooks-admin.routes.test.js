require('../../core/util/register-aliases');

process.env.NODE_ENV = 'test';
process.env.AUTH_STORAGE = 'memory';
process.env.STRIPE_WEBHOOK_SECRET = 'stripe_test_secret';
process.env.STRIPE_SECRET_KEY = 'sk_test_unit';
process.env.STRIPE_PRICE_STARTER = 'price_starter';
process.env.STRIPE_PRICE_PRO = 'price_pro';
process.env.STRIPE_PRICE_PREMIUM = 'price_premium';
process.env.PAYPAL_WEBHOOK_SECRET = 'paypal_test_secret';
process.env.PAYSTACK_SECRET_KEY = 'paystack_test_secret';
process.env.AZURE_AI_AUTH_TOKEN = '';
process.env.FOUNDRY_RESPONSE_TIMEOUT_MS = '1';
process.env.PATH = '';

const crypto = require('crypto');
const request = require('supertest');
const createApp = require('../../src/app');
const { setStripeClientForTests, resetStripeClientForTests } = require('../../src/config/stripe');
const { setPaystackClientForTests, resetPaystackClientForTests } = require('../../src/services/PaystackClient');

jest.setTimeout(20000);

describe('v1 webhooks and admin routes', () => {
  let app;
  let userAgent;
  let userId;
  let interviewId;
  let paymentId;
  let checkoutSessionId;
  let checkoutMetadata;
  let paystackReference;
  let paystackTransactions;
  let paystackInitializePayloads;
  let paystackVerifyOverride;
  let questionId;
  let warnSpy;

  beforeAll(async () => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    setStripeClientForTests(fakeStripeClient({
      onCheckout(session) {
        checkoutSessionId = session.id;
        checkoutMetadata = session.metadata;
      }
    }));
    paystackTransactions = new Map();
    paystackInitializePayloads = [];
    paystackVerifyOverride = null;
    setPaystackClientForTests(fakePaystackClient({
      transactions: paystackTransactions,
      initializePayloads: paystackInitializePayloads,
      getVerifyOverride: () => paystackVerifyOverride
    }));
    app = createApp();
    userAgent = request.agent(app);

    const email = `admin.target.${Date.now()}@example.com`;
    const registered = await userAgent
      .post('/api/v1/auth/register')
      .send({ name: 'Admin Target', email, password: 'Password123!' })
      .expect(201);
    const verified = await userAgent
      .post('/api/v1/auth/register/verify')
      .send({ email, code: registered.body.data.devCode })
      .expect(200);
    userId = verified.body.data.user.id;

    const started = await userAgent
      .post('/api/v1/interviews/chat/start')
      .send({ visaType: 'F1', mode: 'TRAINING' })
      .expect(201);
    interviewId = started.body.data.interviewId;

    const plans = await request(app).get('/api/v1/plans').expect(200);
    const checkout = await userAgent
      .post('/api/v1/billing/checkout')
      .send({ planKey: plans.body.data[0].key })
      .expect(201);
    paymentId = checkout.body.data.paymentId;
    checkoutSessionId = checkout.body.data.sessionId;
  });

  afterAll(() => {
    resetStripeClientForTests();
    resetPaystackClientForTests();
    warnSpy.mockRestore();
  });

  test('POST /api/v1/webhooks/stripe verifies signature and activates payment', async () => {
    const event = {
      type: 'checkout.session.completed',
      data: {
        object: {
          id: checkoutSessionId,
          customer: 'cus_test',
          amount_total: 1000,
          currency: 'usd',
          metadata: { ...checkoutMetadata, paymentId }
        }
      }
    };
    const body = JSON.stringify(event);

    const response = await request(app)
      .post('/api/v1/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .set('Stripe-Signature', signStripeBody(body))
      .send(body)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.eventType).toBe('checkout.session.completed');

    const subscription = await userAgent.get('/api/v1/billing/subscription').expect(200);
    expect(subscription.body.data.status).toBe('credits');
    expect(subscription.body.data.availableCredits).toBeGreaterThanOrEqual(115);

    const notifications = await userAgent.get('/api/v1/users/me/notifications').expect(200);
    expect(notifications.body.data.notifications.some((item) => item.title === 'Credits added')).toBe(true);
  });

  test('POST /api/v1/webhooks/stripe rejects bad signature', async () => {
    await request(app)
      .post('/api/v1/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .set('Stripe-Signature', 't=123,v1=bad')
      .send(JSON.stringify({ type: 'checkout.session.completed' }))
      .expect(400);
  });

  test('POST /api/v1/webhooks/paypal verifies configured signature', async () => {
    const body = JSON.stringify({ event_type: 'PAYMENT.CAPTURE.COMPLETED', paymentId });
    const signature = crypto.createHmac('sha256', process.env.PAYPAL_WEBHOOK_SECRET).update(Buffer.from(body)).digest('hex');
    const response = await request(app)
      .post('/api/v1/webhooks/paypal')
      .set('Content-Type', 'application/json')
      .set('PayPal-Signature', signature)
      .send(body)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.provider).toBe('paypal');
  });

  test('Paystack checkout verifies success and does not double grant credits', async () => {
    const checkout = await userAgent
      .post('/api/v1/billing/checkout')
      .send({ planKey: 'starter', provider: 'paystack' })
      .expect(201);

    expect(checkout.body.data.provider).toBe('paystack');
    expect(checkout.body.data.checkoutUrl).toContain('checkout.paystack.test');
    expect(paystackInitializePayloads.at(-1).email).toMatch(/^admin\.target\.\d+@example\.com$/);
    paystackReference = checkout.body.data.reference;

    const first = await userAgent
      .post('/api/v1/billing/paystack/verify')
      .send({ reference: paystackReference })
      .expect(200);
    expect(first.body.data.synced).toBe(true);

    const afterFirst = await userAgent.get('/api/v1/billing/subscription').expect(200);
    const balanceAfterFirst = afterFirst.body.data.availableCredits;

    await userAgent
      .post('/api/v1/billing/paystack/verify')
      .send({ reference: paystackReference })
      .expect(200);

    const afterSecond = await userAgent.get('/api/v1/billing/subscription').expect(200);
    expect(afterSecond.body.data.availableCredits).toBe(balanceAfterFirst);
  });

  test('Paystack verification rejects amount mismatch', async () => {
    const checkout = await userAgent
      .post('/api/v1/billing/checkout')
      .send({ planKey: 'pro', provider: 'paystack' })
      .expect(201);

    paystackVerifyOverride = (reference) => ({
      ...paystackTransactions.get(reference),
      amount: 1,
      status: 'success'
    });

    const response = await userAgent
      .post('/api/v1/billing/paystack/verify')
      .send({ reference: checkout.body.data.reference })
      .expect(409);

    expect(response.body.errorCode).toBe('PAYMENT_DETAILS_MISMATCH');
    paystackVerifyOverride = null;
  });

  test('POST /api/v1/webhooks/paystack verifies signature and syncs payment', async () => {
    const checkout = await userAgent
      .post('/api/v1/billing/checkout')
      .send({ planKey: 'premium', provider: 'paystack' })
      .expect(201);
    const body = JSON.stringify({ event: 'charge.success', data: { reference: checkout.body.data.reference } });
    const signature = signPaystackBody(body);

    const response = await request(app)
      .post('/api/v1/webhooks/paystack')
      .set('Content-Type', 'application/json')
      .set('x-paystack-signature', signature)
      .send(body)
      .expect(200);

    expect(response.body.data.provider).toBe('paystack');
    expect(response.body.data.eventType).toBe('charge.success');

    const duplicate = await request(app)
      .post('/api/v1/webhooks/paystack')
      .set('Content-Type', 'application/json')
      .set('x-paystack-signature', signature)
      .send(body)
      .expect(200);
    expect(duplicate.body.data.duplicate).toBe(true);
  });

  test('POST /api/v1/webhooks/paystack rejects bad signature', async () => {
    await request(app)
      .post('/api/v1/webhooks/paystack')
      .set('Content-Type', 'application/json')
      .set('x-paystack-signature', 'bad')
      .send(JSON.stringify({ event: 'charge.success' }))
      .expect(400);
  });

  test('admin dashboard, users, user detail, and status routes work', async () => {
    const dashboard = await request(app).get('/api/v1/admin/dashboard').expect(200);
    const users = await request(app).get('/api/v1/admin/users?limit=5').expect(200);
    const user = await request(app).get(`/api/v1/admin/users/${userId}`).expect(200);
    const status = await request(app).patch(`/api/v1/admin/users/${userId}/status`).send({ status: 'suspended' }).expect(200);

    expect(dashboard.body.data.totalUsers).toBeGreaterThanOrEqual(1);
    expect(users.body.data.total).toBeGreaterThanOrEqual(1);
    expect(user.body.data.profile.id).toBe(userId);
    expect(status.body.data.status).toBe('suspended');
  });

  test('admin interview, subscriptions, payments, revenue, usage, and settings routes work', async () => {
    const interviews = await request(app).get('/api/v1/admin/interviews?type=CHAT').expect(200);
    const interview = await request(app).get(`/api/v1/admin/interviews/${interviewId}`).expect(200);
    const subscriptions = await request(app).get('/api/v1/admin/subscriptions').expect(200);
    const payments = await request(app).get('/api/v1/admin/payments?status=paid').expect(200);
    const revenue = await request(app).get('/api/v1/admin/revenue').expect(200);
    const usage = await request(app).get('/api/v1/admin/ai-usage').expect(200);
    const settings = await request(app).get('/api/v1/admin/settings').expect(200);
    const updatedSettings = await request(app)
      .patch('/api/v1/admin/settings')
      .send({
        enableVoiceLive: true,
        freeChatTrainingLimit: 3,
        freeChatSimulationLimit: 1,
        freeLiveTrainingLimit: 1,
        freeLiveSimulationLimit: 1,
        chatTrainingCreditCost: 5,
        chatSimulationCreditCost: 10,
        liveTrainingCreditCost: 15,
        liveSimulationCreditCost: 25,
        storyBuilderCreditCost: 10
      })
      .expect(200);

    expect(interviews.body.data.total).toBeGreaterThanOrEqual(1);
    expect(interview.body.data.interview.id).toBe(interviewId);
    expect(subscriptions.body.data.subscriptions.length).toBeGreaterThanOrEqual(0);
    expect(subscriptions.body.data.payments.length).toBeGreaterThanOrEqual(1);
    expect(subscriptions.body.data.payments[0]).toEqual(expect.objectContaining({
      userId,
      plan: expect.objectContaining({ name: expect.any(String) })
    }));
    expect(payments.body.data.payments.length).toBeGreaterThanOrEqual(1);
    expect(revenue.body.data.totalRevenue).toBeGreaterThanOrEqual(0);
    expect(usage.body.data.inputTokens).toEqual(expect.any(Number));
    expect(settings.body.data.trainingMaxQuestions).toEqual(expect.any(Number));
    expect(settings.body.data.freeChatTrainingLimit).toBe(3);
    expect(settings.body.data.chatTrainingCreditCost).toBe(5);
    expect(settings.body.data.storyBuilderCreditCost).toBe(10);
    expect(updatedSettings.body.data.enableVoiceLive).toBe(true);
    expect(updatedSettings.body.data.freeLiveSimulationLimit).toBe(1);
    expect(updatedSettings.body.data.liveSimulationCreditCost).toBe(25);
  });

  test('admin question bank lifecycle works with soft delete', async () => {
    const created = await request(app)
      .post('/api/v1/admin/question-bank')
      .send({
        visaType: 'F1',
        questionText: 'Why did you choose this university?',
        category: 'university_choice',
        difficulty: 'medium'
      })
      .expect(201);
    questionId = created.body.data.id;

    const listed = await request(app).get('/api/v1/admin/question-bank?visaType=F1').expect(200);
    const updated = await request(app)
      .patch(`/api/v1/admin/question-bank/${questionId}`)
      .send({ difficulty: 'hard' })
      .expect(200);
    const deleted = await request(app).delete(`/api/v1/admin/question-bank/${questionId}`).expect(200);

    expect(listed.body.data.questions.some((item) => item.id === questionId)).toBe(true);
    expect(updated.body.data.difficulty).toBe('hard');
    expect(deleted.body.data.isActive).toBe(false);
  });
});

function fakeStripeClient({ onCheckout } = {}) {
  let lastMetadata = {};
  return {
    customers: {
      create: jest.fn(async () => ({ id: 'cus_test' }))
    },
    checkout: {
      sessions: {
        create: jest.fn(async (params) => {
          const session = {
            id: `cs_test_${Date.now()}`,
            url: `https://checkout.stripe.test/session?plan=${params.metadata.planKey}`,
            customer: params.customer,
            metadata: params.metadata
          };
          lastMetadata = params.metadata;
          onCheckout?.(session);
          return session;
        })
      }
    },
    subscriptions: {
      retrieve: jest.fn(async () => ({
        id: 'sub_test',
        customer: 'cus_test',
        status: 'active',
        metadata: { userId: lastMetadata.userId, planKey: lastMetadata.planKey || 'starter' },
        current_period_start: 1783950000,
        current_period_end: 1786628400,
        cancel_at_period_end: false,
        items: { data: [{ id: 'si_test', current_period_start: 1783950000, current_period_end: 1786628400, price: { id: 'price_starter' } }] }
      })),
      update: jest.fn(async () => ({ id: 'sub_test', status: 'active', cancel_at_period_end: true }))
    },
    billingPortal: {
      sessions: {
        create: jest.fn(async () => ({ url: 'https://billing.stripe.test/session' }))
      }
    },
    webhooks: {
      constructEvent: jest.fn((body, signature, secret) => {
        const [timestampPart, signaturePart] = String(signature || '').split(',');
        const timestamp = timestampPart?.split('=')[1];
        const signatureValue = signaturePart?.split('=')[1];
        const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.${body.toString('utf8')}`).digest('hex');
        if (!timestamp || signatureValue !== expected) throw new Error('bad signature');
        return JSON.parse(body.toString('utf8'));
      })
    }
  };
}

function signStripeBody(body) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto.createHmac('sha256', process.env.STRIPE_WEBHOOK_SECRET).update(`${timestamp}.${body}`).digest('hex');
  return `t=${timestamp},v1=${signature}`;
}

function fakePaystackClient({ transactions, initializePayloads, getVerifyOverride }) {
  return {
    initializeTransaction: jest.fn(async (payload) => {
      initializePayloads?.push(payload);
      const transaction = {
        id: `trx_${transactions.size + 1}`,
        reference: payload.reference,
        status: 'success',
        amount: payload.amount,
        currency: String(payload.currency || 'USD').toLowerCase(),
        paid_at: new Date().toISOString(),
        customer: { customer_code: 'CUS_paystack_test' }
      };
      transactions.set(payload.reference, transaction);
      return {
        authorization_url: `https://checkout.paystack.test/${payload.reference}`,
        access_code: `access_${payload.reference}`,
        reference: payload.reference
      };
    }),
    verifyTransaction: jest.fn(async (reference) => {
      const override = getVerifyOverride?.();
      if (override) return override(reference);
      return transactions.get(reference) || {
        reference,
        status: 'failed',
        amount: 0,
        currency: 'usd'
      };
    })
  };
}

function signPaystackBody(body) {
  return crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY).update(Buffer.from(body)).digest('hex');
}
