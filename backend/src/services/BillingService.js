const AppErrorModule = require('@src/utils/classes/AppError');
const { createBillingRepository } = require('@src/services/BillingRepository');
const { createAuthRepository } = require('@src/services/AuthRepository');
const { createAdminRepository } = require('@src/services/AdminRepository');
const { getStripe } = require('@src/config/stripe');
const { getPaystackClient, isPaystackConfigured, PaystackApiError } = require('@src/services/PaystackClient');
const { getPlan, getPlanByStripePriceId, getStripePriceId, getPaystackPaymentDetails, isUpgrade, CREDIT_COSTS } = require('@src/config/plans');
const { periodFromSeconds } = require('@src/services/BillingRepository');
const { buildFreeLimits } = require('@src/services/UsersService');
const notificationService = require('@src/services/NotificationService');

const AppError = AppErrorModule.default || AppErrorModule.AppError;
const ACCESSIBLE_STATUSES = ['active', 'trialing'];

class BillingService {
  constructor({
    repository = createBillingRepository(),
    authRepository = createAuthRepository(),
    adminRepository = createAdminRepository()
  } = {}) {
    this.repository = repository;
    this.authRepository = authRepository;
    this.adminRepository = adminRepository;
  }

  async listPlans() {
    return this.repository.listPlans();
  }

  async getStatus(userId) {
    const creditCosts = await this.getCreditCosts();
    const latest = await this.repository.getCreditStatus(userId);
    if (!latest) {
      return {
        status: 'none',
        plan: null,
        planId: null,
        planKey: null,
        chatRemaining: 0,
        liveRemaining: 0,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        usage: null,
        stripeConfigured: this.hasStripeBasics(),
        paystackConfigured: this.hasPaystackBasics(),
        creditCosts
      };
    }
    return this.applyCreditCosts({
      ...latest,
      stripeConfigured: this.hasStripeBasics(),
      paystackConfigured: this.hasPaystackBasics(),
      paymentRequired: false,
      creditCosts
    }, creditCosts);
  }

  async getSubscription(userId) {
    return this.getStatus(userId);
  }

  async createCheckout(userId, input = {}, headers = {}) {
    const planKeyOrId = typeof input === 'string' ? input : input.planKey || input.planId;
    if (!planKeyOrId) throw this.error(400, 'planKey is required.', 'VALIDATION_ERROR');
    const plan = await this.requirePlan(planKeyOrId);
    const provider = String(typeof input === 'object' ? input.provider || 'stripe' : 'stripe').trim().toLowerCase();
    if (provider === 'paystack') return this.createPaystackCheckout(userId, plan, headers);
    if (provider !== 'stripe') throw this.error(400, 'Unsupported payment provider.', 'UNSUPPORTED_PAYMENT_PROVIDER');
    return this.createStripeCheckout(userId, plan, headers);
  }

  async createStripeCheckout(userId, plan, headers = {}) {
    const stripe = this.requireStripe();

    const user = await this.requireUser(userId);
    const stripeCustomerId = await this.ensureStripeCustomer(stripe, user);
    const frontendUrl = this.frontendUrl();
    const stripePriceId = getStripePriceId(plan.key);
    const lineItem = await this.buildCreditLineItem(stripe, plan, stripePriceId);
    const payment = await this.repository.createPendingPayment({ userId, plan });
    const metadata = {
      userId,
      planKey: plan.key,
      creditAmount: String(plan.creditAmount || plan.chatLimit || 0),
      paymentId: payment.id
    };
    const sessionParams = {
      mode: 'payment',
      customer: stripeCustomerId,
      customer_update: {
        name: 'auto',
        address: 'auto',
        shipping: 'auto'
      },
      line_items: [lineItem],
      success_url: `${frontendUrl}/user/billing?stripe=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/user/billing?stripe=cancelled`,
      metadata,
      payment_intent_data: {
        metadata,
        receipt_email: user.email
      }
    };

    const session = await stripe.checkout.sessions.create(
      sessionParams,
      this.idempotencyOptions(headers, `checkout:payment:${userId}:${plan.key}:${payment.id}`)
    );

    await this.repository.updatePayment(payment.id, {
      checkoutUrl: session.url,
      stripeCheckoutSessionId: session.id
    });
    await notificationService.createForUser(userId, {
      title: 'Checkout started',
      body: `${plan.name} credit checkout is pending. Credits are added after Stripe confirms payment.`,
      type: 'billing'
    });

    return {
      checkoutUrl: session.url,
      sessionId: session.id,
      paymentId: payment.id,
      planKey: plan.key,
      provider: 'stripe',
      mode: 'payment'
    };
  }

  async createPaystackCheckout(userId, plan, headers = {}) {
    const paystack = this.requirePaystack();
    const user = await this.requireUser(userId);
    const customerEmail = this.requirePaymentEmail(user);
    const paystackPrice = getPaystackPaymentDetails(plan);
    const payment = await this.repository.createPendingPayment({
      userId,
      plan,
      provider: 'paystack',
      amount: paystackPrice.amount,
      amountCents: paystackPrice.amountCents,
      currency: paystackPrice.currency
    });
    const reference = this.buildPaystackReference(plan, payment.id);
    const metadata = {
      userId,
      planKey: plan.key,
      creditAmount: String(plan.creditAmount || plan.chatLimit || 0),
      paymentId: payment.id,
      provider: 'paystack'
    };

    try {
      const transaction = await paystack.initializeTransaction({
        email: customerEmail,
        amount: paystackPrice.amountCents,
        currency: paystackPrice.currency.toUpperCase(),
        reference,
        callback_url: `${this.frontendUrl()}/user/billing?paystack=success`,
        metadata
      }, this.idempotencyOptions(headers, `checkout:paystack:${userId}:${plan.key}:${payment.id}`));

      const checkoutUrl = transaction.authorization_url || transaction.authorizationUrl;
      if (!checkoutUrl) throw this.error(502, 'Paystack did not return a checkout URL.', 'PAYSTACK_CHECKOUT_URL_MISSING');

      await this.repository.updatePayment(payment.id, {
        checkoutUrl,
        paystackReference: transaction.reference || reference,
        paystackAccessCode: transaction.access_code || transaction.accessCode || null
      });
      await notificationService.createForUser(userId, {
        title: 'Checkout started',
        body: `${plan.name} credit checkout is pending. Credits are added after Paystack confirms payment.`,
        type: 'billing'
      });

      return {
        checkoutUrl,
        reference: transaction.reference || reference,
        paymentId: payment.id,
        planKey: plan.key,
        provider: 'paystack',
        mode: 'payment'
      };
    } catch (error) {
      await this.repository.updatePayment(payment.id, {
        status: 'failed',
        paystackReference: reference,
        failureReason: error.publicMessage || error.message || 'Paystack checkout failed.'
      });
      throw this.normalizePaystackError(error);
    }
  }

  async changePlan(userId, input = {}, headers = {}) {
    const planKeyOrId = input.planKey || input.planId;
    if (!planKeyOrId) throw this.error(400, 'planKey is required.', 'VALIDATION_ERROR');
    const targetPlan = await this.requirePlan(planKeyOrId);
    const stripe = this.requireStripe(targetPlan);
    const subscription = await this.repository.getActiveSubscription(userId);
    if (!subscription) throw this.error(404, 'Active subscription is required to change plans.', 'ACTIVE_SUBSCRIPTION_REQUIRED');
    if (!subscription.stripeSubscriptionId || !subscription.stripeSubscriptionItemId) {
      throw this.error(409, 'This subscription is not connected to Stripe.', 'STRIPE_SUBSCRIPTION_REQUIRED');
    }

    const params = {
      items: [{ id: subscription.stripeSubscriptionItemId, price: getStripePriceId(targetPlan.key) }],
      metadata: { userId, planKey: targetPlan.key },
      proration_behavior: isUpgrade(subscription.planKey, targetPlan.key) ? 'always_invoice' : 'none',
      cancel_at_period_end: false
    };

    if (!isUpgrade(subscription.planKey, targetPlan.key)) {
      params.proration_behavior = 'none';
      params.billing_cycle_anchor = 'unchanged';
    }

    const updated = await stripe.subscriptions.update(subscription.stripeSubscriptionId, params, this.idempotencyOptions(headers, `change:${userId}:${targetPlan.key}`));
    await notificationService.createForUser(userId, {
      title: isUpgrade(subscription.planKey, targetPlan.key) ? 'Plan upgrade requested' : 'Plan change scheduled',
      body: isUpgrade(subscription.planKey, targetPlan.key)
        ? 'Stripe is processing your upgrade. Your local plan updates after webhook confirmation.'
        : 'Your downgrade is scheduled through Stripe and will apply after webhook confirmation.',
      type: 'billing'
    });
    return {
      requested: true,
      stripeSubscriptionId: updated.id,
      planKey: targetPlan.key,
      mode: isUpgrade(subscription.planKey, targetPlan.key) ? 'upgrade' : 'downgrade'
    };
  }

  async syncCheckoutSession(userId, input = {}) {
    const sessionId = String(input.sessionId || input.session_id || '').trim();
    if (!sessionId) throw this.error(400, 'sessionId is required.', 'VALIDATION_ERROR');

    const stripe = this.requireStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'line_items.data.price']
    });

    const metadata = session.metadata || {};
    const payment = await this.repository.findPaymentByCheckoutSession(session.id);
    if ((metadata.userId && metadata.userId !== userId) || (payment?.userId && payment.userId !== userId)) {
      throw this.error(403, 'Checkout session does not belong to this user.', 'FORBIDDEN');
    }

    const completed = session.status === 'complete' && (!session.payment_status || session.payment_status === 'paid');
    if (!completed) {
      return {
        synced: false,
        sessionId: session.id,
        status: session.status,
        paymentStatus: session.payment_status || null,
        payment
      };
    }

    const plan = this.planFromCheckoutSession(session);
    const paymentId = metadata.paymentId || payment?.id || null;
    const alreadyPaid = payment?.status === 'paid';
    let updatedPayment = payment;

    if (paymentId) {
      updatedPayment = await this.repository.updatePayment(paymentId, {
        status: 'paid',
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id || null,
        amountCents: session.amount_total || undefined,
        amount: session.amount_total ? Number(session.amount_total) / 100 : undefined,
        currency: session.currency || undefined,
        paidAt: new Date()
      });
    }

    if (session.subscription) {
      const subscription = typeof session.subscription === 'string'
        ? await stripe.subscriptions.retrieve(session.subscription)
        : session.subscription;
      await this.syncStripeSubscription(userId, subscription, session);
    }

    if (!alreadyPaid && plan) {
      await this.repository.grantCredits({
        userId,
        credits: plan.creditAmount || plan.chatLimit || 0,
        paymentId,
        metadata: { planKey: plan.key, checkoutSessionId: session.id, source: 'checkout_sync' }
      });
      await notificationService.createForUser(userId, {
        title: 'Credits added',
        body: `${plan.creditAmount || plan.chatLimit || 0} credits were added to your account.`,
        type: 'billing'
      });
    }

    return {
      synced: true,
      sessionId: session.id,
      status: session.status,
      paymentStatus: session.payment_status || null,
      payment: updatedPayment,
      subscription: await this.getStatus(userId)
    };
  }

  async syncPaystackTransaction(userId, input = {}) {
    const reference = String(input.reference || input.paystackReference || '').trim();
    if (!reference) throw this.error(400, 'reference is required.', 'VALIDATION_ERROR');

    const paystack = this.requirePaystack();
    let transaction;
    try {
      transaction = await paystack.verifyTransaction(reference);
    } catch (error) {
      throw this.normalizePaystackError(error);
    }

    const result = await this.completePaystackTransaction(transaction, {
      expectedUserId: userId,
      source: input.source || 'paystack_callback'
    });
    const statusUserId = userId || result.payment?.userId;
    return {
      synced: result.synced,
      reference,
      status: transaction.status || null,
      paymentStatus: transaction.status || null,
      payment: result.payment,
      subscription: statusUserId ? await this.getStatus(statusUserId) : null
    };
  }

  async completePaystackTransaction(transaction = {}, { expectedUserId = null, source = 'paystack' } = {}) {
    const reference = String(transaction.reference || '').trim();
    if (!reference) throw this.error(400, 'Paystack transaction reference is missing.', 'PAYSTACK_REFERENCE_MISSING');

    const payment = await this.repository.findPaymentByPaystackReference(reference);
    if (!payment) throw this.error(404, 'Payment attempt was not found.', 'PAYMENT_NOT_FOUND');
    if (expectedUserId && payment.userId !== expectedUserId) {
      throw this.error(403, 'Payment reference does not belong to this user.', 'FORBIDDEN');
    }

    const plan = await this.requirePlan(payment.planId || transaction.metadata?.planKey);
    const status = String(transaction.status || '').toLowerCase();
    if (status !== 'success') {
      const terminal = ['failed', 'abandoned', 'reversed'].includes(status);
      const updated = await this.repository.updatePayment(payment.id, {
        status: terminal ? 'failed' : 'pending',
        failureReason: transaction.gateway_response || transaction.message || `Paystack status: ${status || 'unknown'}`
      });
      return { synced: false, payment: updated };
    }

    const expectedAmount = Number(payment.amountCents || plan.priceCents || 0);
    const expectedCurrency = String(payment.currency || plan.currency || 'usd').toLowerCase();
    const actualAmount = Number(transaction.amount || 0);
    const actualCurrency = String(transaction.currency || '').toLowerCase();
    if (actualAmount !== expectedAmount || actualCurrency !== expectedCurrency) {
      await this.repository.updatePayment(payment.id, {
        status: 'failed',
        failureReason: 'Verified Paystack payment amount or currency did not match the selected plan.'
      });
      throw this.error(409, 'The verified payment details did not match the selected plan.', 'PAYMENT_DETAILS_MISMATCH');
    }

    const alreadyPaid = payment.status === 'paid';
    const updatedPayment = await this.repository.updatePayment(payment.id, {
      status: 'paid',
      provider: 'paystack',
      paystackReference: reference,
      paystackTransactionId: transaction.id ? String(transaction.id) : null,
      paystackCustomerCode: transaction.customer?.customer_code || transaction.customer_code || null,
      amountCents: actualAmount,
      amount: actualAmount / 100,
      currency: actualCurrency || expectedCurrency,
      paidAt: transaction.paid_at ? new Date(transaction.paid_at) : new Date(),
      failureReason: null
    });

    if (!alreadyPaid) {
      await this.repository.grantCredits({
        userId: payment.userId,
        credits: plan.creditAmount || plan.chatLimit || 0,
        paymentId: payment.id,
        metadata: { planKey: plan.key, paystackReference: reference, source }
      });
      await notificationService.createForUser(payment.userId, {
        title: 'Credits added',
        body: `${plan.creditAmount || plan.chatLimit || 0} credits were added to your account.`,
        type: 'billing'
      });
    }

    return { synced: true, payment: updatedPayment, alreadyPaid };
  }

  async createPortal(userId) {
    const stripe = this.requireStripe();
    const user = await this.requireUser(userId);
    const stripeCustomerId = await this.ensureStripeCustomer(stripe, user);
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${this.frontendUrl()}/user/billing?portal=returned`
    });
    return { portalUrl: session.url };
  }

  async cancelSubscription(userId) {
    const stripe = this.requireStripe();
    const subscription = await this.repository.getActiveSubscription(userId);
    if (!subscription) throw this.error(404, 'Active subscription not found.', 'SUBSCRIPTION_NOT_FOUND');
    if (!subscription.stripeSubscriptionId) {
      throw this.error(409, 'This subscription is not connected to Stripe.', 'STRIPE_SUBSCRIPTION_REQUIRED');
    }
    const updated = await stripe.subscriptions.update(subscription.stripeSubscriptionId, { cancel_at_period_end: true });
    await notificationService.createForUser(userId, {
      title: 'Cancellation requested',
      body: 'Your Stripe subscription will remain active until the end of the billing period.',
      type: 'billing'
    });
    return {
      ...subscription,
      status: updated.status || subscription.status,
      cancelAtPeriodEnd: true,
      currentPeriodEnd: subscription.currentPeriodEnd
    };
  }

  async getHistory(userId) {
    return { payments: await this.repository.listPayments(userId) };
  }

  async consumeInterviewAttempt(userId, interviewType, mode, options = {}) {
    const settings = await this.adminRepository.getSettings();
    const creditCosts = buildCreditCosts(settings);
    const result = await this.repository.consumeInterviewAttempt({
      userId,
      interviewType,
      mode,
      interviewId: options.interviewId || null,
      limits: buildFreeLimits(settings),
      credits: interviewCreditCost(interviewType, mode, creditCosts)
    });
    if (result.ok) return result;

    if (result.reason === 'SUBSCRIPTION_PAYMENT_FAILED') {
      throw this.error(402, 'Your payment needs attention before buying or using credits.', 'SUBSCRIPTION_PAYMENT_FAILED');
    }
    if (result.reason === 'ACTIVE_SUBSCRIPTION_REQUIRED') {
      throw this.error(402, 'Active subscription is required for this allowance.', 'ACTIVE_SUBSCRIPTION_REQUIRED');
    }
    if (result.reason === 'CREDIT_COST_NOT_CONFIGURED') {
      throw this.error(409, 'This interview type is coming soon.', 'INTERVIEW_TYPE_COMING_SOON');
    }
    const code = result.reason || 'INSUFFICIENT_CREDITS';
    const required = result.requiredCredits ? ` You need ${result.requiredCredits} credits.` : '';
    throw this.error(402, `You do not have enough credits to start this interview.${required}`, code);
  }

  async refundInterviewAttempt(userId, interviewType, mode, options = {}) {
    const credits = interviewCreditCost(interviewType, mode, await this.getCreditCosts());
    if (!credits) return { ok: false, reason: 'CREDIT_COST_NOT_CONFIGURED' };
    return this.repository.refundCredits({
      userId,
      interviewType,
      mode,
      credits,
      interviewId: options.interviewId || null,
      reason: options.reason || 'system_error',
      metadata: options.metadata || {}
    });
  }

  async consumeStoryBuilder(userId, options = {}) {
    const credits = (await this.getCreditCosts()).STORY_BUILDER;
    const result = await this.repository.consumeCredits({
      userId,
      credits,
      interviewType: 'STORY_BUILDER',
      mode: 'GENERATE',
      interviewId: options.operationId || null
    });
    if (result.ok) return result;
    const code = result.reason || 'INSUFFICIENT_CREDITS';
    const required = result.requiredCredits ? ` You need ${result.requiredCredits} credits.` : '';
    throw this.error(402, `You do not have enough credits to generate your interview story.${required}`, code);
  }

  async refundStoryBuilder(userId, options = {}) {
    const credits = (await this.getCreditCosts()).STORY_BUILDER;
    return this.repository.refundCredits({
      userId,
      credits,
      interviewType: 'STORY_BUILDER',
      mode: 'GENERATE',
      interviewId: options.operationId || null,
      reason: options.reason || 'system_error',
      metadata: options.metadata || {}
    });
  }

  async requireUser(userId) {
    const user = await this.authRepository.findUserById(userId);
    if (!user) throw this.error(404, 'User not found.', 'USER_NOT_FOUND');
    return typeof user.get === 'function' ? user.get({ plain: true }) : user;
  }

  requirePaymentEmail(user = {}) {
    const email = String(user.email || '').trim().toLowerCase();
    if (!isValidPaymentEmail(email)) {
      throw this.error(
        400,
        'Your account email address is invalid for payment checkout. Please update your profile email or sign in with a valid email address.',
        'INVALID_PAYMENT_EMAIL'
      );
    }
    return email;
  }

  async ensureStripeCustomer(stripe, user) {
    const existingCustomerId = user.stripeCustomerId || user.stripe_customer_id;
    if (existingCustomerId && stripe?.customers?.retrieve) {
      try {
        const customer = await stripe.customers.retrieve(existingCustomerId);
        if (!customer?.deleted) return existingCustomerId;
      } catch (error) {
        if (!this.isMissingStripeCustomer(error)) throw error;
      }
    } else if (existingCustomerId) {
      return existingCustomerId;
    }

    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: { userId: user.id }
    });
    await this.authRepository.updateStripeCustomerId?.(user.id, customer.id);
    await this.repository.setUserStripeCustomerId(user.id, customer.id);
    return customer.id;
  }

  async requirePlan(planKeyOrId) {
    const plan = await this.repository.findPlan(planKeyOrId);
    if (!plan || !plan.key) throw this.error(404, 'Plan not found.', 'PLAN_NOT_FOUND');
    return plan;
  }

  requireStripe(plan = null) {
    const stripe = getStripe();
    if (!stripe) throw this.error(503, 'Stripe is not configured for billing actions.', 'STRIPE_NOT_CONFIGURED');
    if (plan && !getStripePriceId(plan.key)) {
      throw this.error(503, `${plan.name} Stripe price is not configured.`, 'STRIPE_NOT_CONFIGURED');
    }
    return stripe;
  }

  hasStripeBasics() {
    return Boolean(getStripe());
  }

  requirePaystack() {
    const paystack = getPaystackClient();
    if (!paystack) throw this.error(503, 'Paystack is not configured for billing actions.', 'PAYSTACK_NOT_CONFIGURED');
    return paystack;
  }

  hasPaystackBasics() {
    return isPaystackConfigured();
  }

  buildPaystackReference(plan, paymentId) {
    return `oc_${plan.key}_${String(paymentId).replace(/[^a-zA-Z0-9_.=-]/g, '')}`.slice(0, 100);
  }

  async resolveCheckoutMode(stripe, stripePriceId) {
    if (!stripe?.prices?.retrieve) return 'payment';
    const price = await stripe.prices.retrieve(stripePriceId);
    return price?.recurring ? 'subscription' : 'payment';
  }

  async buildCreditLineItem(stripe, plan, stripePriceId = '') {
    if (stripePriceId && stripe?.prices?.retrieve) {
      const price = await stripe.prices.retrieve(stripePriceId);
      if (!price?.recurring) return { price: stripePriceId, quantity: 1 };
    }

    return {
      price_data: {
        currency: plan.currency || 'usd',
        unit_amount: Number(plan.priceCents || Math.round(Number(plan.price || 0) * 100)),
        product_data: {
          name: `${plan.name} credits`,
          metadata: {
            planKey: plan.key,
            creditAmount: String(plan.creditAmount || plan.chatLimit || 0)
          }
        }
      },
      quantity: 1
    };
  }

  planFromCheckoutSession(session) {
    const lineItem = session.line_items?.data?.[0];
    const stripePriceId = lineItem?.price?.id || lineItem?.price || null;
    return getPlanByStripePriceId(stripePriceId) || getPlan(session.metadata?.planKey);
  }

  async syncStripeSubscription(userId, subscription, checkoutSession = null) {
    if (!subscription) return null;
    const item = subscription.items?.data?.[0] || {};
    const stripePriceId = item.price?.id || subscription.plan?.id || null;
    const plan = getPlanByStripePriceId(stripePriceId) || getPlan(subscription.metadata?.planKey || checkoutSession?.metadata?.planKey);
    if (!plan) return null;
    return this.repository.upsertSubscriptionFromStripe({
      userId,
      stripeSubscriptionId: subscription.id,
      stripeSubscriptionItemId: item.id || null,
      stripePriceId,
      planKey: plan.key,
      status: subscription.status,
      currentPeriodStart: periodFromSeconds(subscription.current_period_start || item.current_period_start),
      currentPeriodEnd: periodFromSeconds(subscription.current_period_end || item.current_period_end),
      cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
      canceledAt: subscription.canceled_at ? periodFromSeconds(subscription.canceled_at) : null
    });
  }

  frontendUrl() {
    return String(process.env.FRONTEND_URL || process.env.AUTH_SUCCESS_REDIRECT_URL || 'http://localhost:8081').replace(/\/$/, '');
  }

  idempotencyOptions(headers = {}, fallback) {
    const value = headers['idempotency-key'] || headers['Idempotency-Key'] || headers['x-idempotency-key'];
    return { idempotencyKey: String(value || fallback) };
  }

  error(statusCode, publicMessage, errorCode) {
    return new AppError({ statusCode, publicMessage, internalMessage: publicMessage, errorCode });
  }

  normalizePaystackError(error) {
    if (error instanceof AppError) return error;
    if (error instanceof PaystackApiError) {
      if (/invalid email/i.test(String(error.message || ''))) {
        return this.error(
          400,
          'Paystack rejected the checkout because the account email address is invalid. Please update your profile email or sign in again with a valid email address.',
          'INVALID_PAYMENT_EMAIL'
        );
      }
      if ([400, 403, 422].includes(Number(error.statusCode))) {
        return this.error(400, error.message, error.paystackCode || 'INVALID_PAYMENT_REQUEST');
      }
      if (error.statusCode === 401) return this.error(500, 'Paystack is not configured correctly.', 'PAYMENT_CONFIGURATION_ERROR');
      if (error.statusCode === 404) return this.error(404, error.message, error.paystackCode || 'PAYMENT_RESOURCE_NOT_FOUND');
      if (error.statusCode === 429 || error.paystackCode === 'PAYSTACK_RATE_LIMIT') {
        return this.error(503, 'The payment service is temporarily busy. Please try again.', 'PAYMENT_SERVICE_BUSY');
      }
      if (error.statusCode >= 500) {
        return this.error(503, 'Paystack is temporarily unavailable. Please try again.', error.paystackCode || 'PAYMENT_SERVICE_UNAVAILABLE');
      }
      return this.error(503, error.message || 'The payment provider is temporarily unavailable.', error.paystackCode || 'PAYMENT_SERVICE_UNAVAILABLE');
    }
    return error;
  }

  isMissingStripeCustomer(error) {
    return error?.code === 'resource_missing'
      && /No such customer/i.test(String(error?.message || ''));
  }

  async getCreditCosts() {
    return buildCreditCosts(await this.adminRepository.getSettings());
  }

  async getStoryBuilderCreditCost() {
    return (await this.getCreditCosts()).STORY_BUILDER;
  }

  applyCreditCosts(status, creditCosts) {
    const availableCredits = Number(status?.availableCredits ?? status?.usage?.availableCredits ?? 0);
    const chatTrainingCost = Math.max(Number(creditCosts.CHAT_TRAINING || 0), 1);
    const liveTrainingCost = Math.max(Number(creditCosts.LIVE_TRAINING || 0), 1);
    return {
      ...status,
      creditCosts,
      chatRemaining: Math.floor(availableCredits / chatTrainingCost),
      liveRemaining: Math.floor(availableCredits / liveTrainingCost),
      usage: status?.usage ? { ...status.usage, creditCosts } : status?.usage
    };
  }
}

function isValidPaymentEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email || '').trim());
}

function buildCreditCosts(settings = {}) {
  return {
    CHAT_TRAINING: readCreditCost(settings.chatTrainingCreditCost, CREDIT_COSTS.CHAT_TRAINING),
    CHAT_SIMULATION: readCreditCost(settings.chatSimulationCreditCost, CREDIT_COSTS.CHAT_SIMULATION),
    LIVE_TRAINING: readCreditCost(settings.liveTrainingCreditCost, CREDIT_COSTS.LIVE_TRAINING),
    LIVE_SIMULATION: readCreditCost(settings.liveSimulationCreditCost, CREDIT_COSTS.LIVE_SIMULATION),
    STORY_BUILDER: readCreditCost(settings.storyBuilderCreditCost, CREDIT_COSTS.STORY_BUILDER),
    VIDEO_TRAINING: readCreditCost(settings.liveTrainingCreditCost, CREDIT_COSTS.VIDEO_TRAINING),
    VIDEO_SIMULATION: readCreditCost(settings.liveSimulationCreditCost, CREDIT_COSTS.VIDEO_SIMULATION)
  };
}

function readCreditCost(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 1) return fallback;
  return Math.floor(number);
}

function interviewCreditCost(interviewType, mode, creditCosts = CREDIT_COSTS) {
  const type = String(interviewType || '').toUpperCase();
  const normalizedMode = String(mode || '').toUpperCase();
  return creditCosts[`${type}_${normalizedMode}`] || 0;
}

module.exports = new BillingService();
module.exports.BillingService = BillingService;
module.exports.ACCESSIBLE_STATUSES = ACCESSIBLE_STATUSES;
module.exports.buildCreditCosts = buildCreditCosts;
module.exports.isValidPaymentEmail = isValidPaymentEmail;
module.exports.interviewCreditCost = interviewCreditCost;
