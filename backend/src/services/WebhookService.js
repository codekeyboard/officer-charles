const crypto = require('crypto');
const Stripe = require('stripe');
const AppErrorModule = require('@src/utils/classes/AppError');
const { createBillingRepository, periodFromSeconds } = require('@src/services/BillingRepository');
const { createAuthRepository } = require('@src/services/AuthRepository');
const { getStripe } = require('@src/config/stripe');
const { getPlan, getPlanByStripePriceId } = require('@src/config/plans');
const billingService = require('@src/services/BillingService');
const notificationService = require('@src/services/NotificationService');

const AppError = AppErrorModule.default || AppErrorModule.AppError;

class WebhookService {
  constructor({
    billingRepository = createBillingRepository(),
    authRepository = createAuthRepository()
  } = {}) {
    this.billingRepository = billingRepository;
    this.authRepository = authRepository;
  }

  async handleStripe({ rawBody, signature }) {
    const stripe = getStripe() || new Stripe('sk_test_webhook_verifier', { apiVersion: '2024-06-20' });
    const body = this.ensureBuffer(rawBody);
    const secret = String(process.env.STRIPE_WEBHOOK_SECRET || '').trim();
    if (!secret) throw this.error(503, 'Stripe webhook secret is not configured.', 'STRIPE_NOT_CONFIGURED');

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, secret);
    } catch (error) {
      throw this.error(400, 'Invalid Stripe webhook signature.', 'INVALID_STRIPE_SIGNATURE');
    }

    if (await this.billingRepository.hasStripeEvent(event.id)) {
      return { received: true, duplicate: true, provider: 'stripe', eventType: event.type || null };
    }

    await this.applyStripeEvent(event, stripe);
    await this.billingRepository.recordStripeEvent(event);
    return { received: true, provider: 'stripe', eventType: event.type || null };
  }

  async handlePaypal({ rawBody, signature }) {
    const body = this.ensureBuffer(rawBody);
    this.verifyPaypalSignature(body, signature);
    const event = JSON.parse(body.toString('utf8') || '{}');
    await this.applyLegacyPaymentEvent(event);
    return { received: true, provider: 'paypal', eventType: event.event_type || event.type || null };
  }

  async handlePaystack({ rawBody, signature }) {
    const body = this.ensureBuffer(rawBody);
    this.verifyPaystackSignature(body, signature);

    let event;
    try {
      event = JSON.parse(body.toString('utf8') || '{}');
    } catch {
      throw this.error(400, 'Invalid Paystack webhook JSON.', 'INVALID_PAYSTACK_WEBHOOK_JSON');
    }

    const eventKey = this.paystackEventKey(event, body);
    if (await this.billingRepository.hasPaystackEvent(eventKey)) {
      return { received: true, duplicate: true, provider: 'paystack', eventType: event.event || null };
    }

    await this.applyPaystackEvent(event);
    await this.billingRepository.recordPaystackEvent(eventKey, event);
    return { received: true, provider: 'paystack', eventType: event.event || null };
  }

  async applyStripeEvent(event, stripe) {
    const object = event.data?.object || {};
    if (event.type === 'checkout.session.completed') {
      await this.handleCheckoutCompleted(object);
      return;
    }
    if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
      await this.syncSubscription(object);
      return;
    }
    if (event.type === 'customer.subscription.deleted') {
      await this.handleSubscriptionDeleted(object);
      return;
    }
    if (event.type === 'invoice.paid') {
      await this.handleInvoicePaid(object, stripe);
      return;
    }
    if (event.type === 'invoice.payment_failed') {
      await this.handleInvoicePaymentFailed(object, stripe);
    }
  }

  async handleCheckoutCompleted(session) {
    const paymentId = session.metadata?.paymentId;
    const plan = getPlan(session.metadata?.planKey);
    const userId = session.metadata?.userId || await this.resolveUserId(session);
    if (paymentId) {
      await this.billingRepository.updatePayment(paymentId, {
        status: 'paid',
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId: session.payment_intent || null,
        amountCents: session.amount_total || undefined,
        currency: session.currency || undefined
      });
    }
    if (userId && plan) {
      const balance = await this.billingRepository.grantCredits({
        userId,
        credits: plan.creditAmount || plan.chatLimit || 0,
        paymentId,
        metadata: { planKey: plan.key, checkoutSessionId: session.id }
      });
      await notificationService.createForUser(userId, {
        title: 'Credits added',
        body: `${plan.creditAmount || plan.chatLimit || 0} credits were added to your account.`,
        type: 'billing'
      });
      return balance;
    }
    return null;
  }

  async handleInvoicePaid(invoice, stripe) {
    const subscriptionId = invoice.subscription;
    let subscription = null;
    if (subscriptionId) {
      subscription = typeof subscriptionId === 'string'
        ? await stripe.subscriptions.retrieve(subscriptionId)
        : subscriptionId;
      await this.syncSubscription(subscription);
    }
    const userId = await this.resolveUserId(subscription || invoice);
    const plan = getPlanFromStripeSubscription(subscription) || getPlan('starter');
    if (userId) {
      const payment = await this.billingRepository.createPendingPayment({
        userId,
        plan,
        checkoutUrl: null,
        stripeCheckoutSessionId: null
      }).then((payment) => this.billingRepository.updatePayment(payment.id, {
        status: 'paid',
        stripeInvoiceId: invoice.id,
        stripePaymentIntentId: invoice.payment_intent || null,
        amountCents: invoice.amount_paid || invoice.total || 0,
        amount: Number(invoice.amount_paid || invoice.total || 0) / 100,
        currency: invoice.currency || 'usd'
      }));
      await notificationService.createForUser(userId, {
        title: 'Payment confirmed',
        body: 'Stripe confirmed your invoice payment.',
        type: 'billing'
      });
    }
  }

  async handleInvoicePaymentFailed(invoice, stripe) {
    const subscriptionId = invoice.subscription;
    let subscription = null;
    if (subscriptionId) {
      subscription = typeof subscriptionId === 'string'
        ? await stripe.subscriptions.retrieve(subscriptionId)
        : subscriptionId;
      await this.billingRepository.markStripeSubscriptionStatus(subscription.id, 'past_due');
    }
    const userId = await this.resolveUserId(subscription || invoice);
    if (userId) {
      await notificationService.createForUser(userId, {
        title: 'Payment failed',
        body: 'Stripe could not collect your subscription payment. Please update your billing details.',
        type: 'billing'
      });
    }
  }

  async handleSubscriptionDeleted(subscription) {
    const updated = await this.billingRepository.markStripeSubscriptionStatus(subscription.id, 'cancelled', {
      canceledAt: subscription.canceled_at ? periodFromSeconds(subscription.canceled_at) : new Date(),
      cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end)
    });
    if (updated?.userId) {
      await notificationService.createForUser(updated.userId, {
        title: 'Subscription ended',
        body: 'Your paid subscription ended. Free interview limits now apply.',
        type: 'billing'
      });
    }
  }

  async syncSubscription(subscription, checkoutSession = null) {
    const item = subscription.items?.data?.[0] || {};
    const stripePriceId = item.price?.id || subscription.plan?.id || null;
    const plan = getPlanByStripePriceId(stripePriceId) || getPlan(subscription.metadata?.planKey || checkoutSession?.metadata?.planKey);
    if (!plan) return null;
    const userId = await this.resolveUserId(subscription, checkoutSession);
    if (!userId) return null;
    if (subscription.customer) {
      await this.authRepository.updateStripeCustomerId?.(userId, typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id);
      await this.billingRepository.setUserStripeCustomerId(userId, typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id);
    }
    const synced = await this.billingRepository.upsertSubscriptionFromStripe({
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
    if (synced && ['active', 'trialing'].includes(synced.status)) {
      await notificationService.createForUser(userId, {
        title: 'Subscription active',
        body: `${synced.plan?.name || plan.name} is active for this billing period.`,
        type: 'billing'
      });
    }
    return synced;
  }

  async resolveUserId(primary = {}, secondary = null) {
    const userId = primary.metadata?.userId || secondary?.metadata?.userId;
    if (userId) return userId;
    const customerId = typeof primary.customer === 'string'
      ? primary.customer
      : primary.customer?.id || (typeof secondary?.customer === 'string' ? secondary.customer : secondary?.customer?.id);
    if (!customerId) return null;
    const user = await this.authRepository.findUserByStripeCustomerId?.(customerId) || await this.billingRepository.findUserByStripeCustomerId(customerId);
    return user?.id || null;
  }

  async applyLegacyPaymentEvent(event) {
    const type = event.type || event.event_type || '';
    const paymentId = event.data?.object?.metadata?.paymentId || event.data?.paymentId || event.resource?.custom_id || event.paymentId;
    if (!paymentId) return;
    if (type.includes('PAYMENT.CAPTURE.COMPLETED')) {
      const payment = await this.billingRepository.activateSubscriptionFromPayment(paymentId);
      if (payment?.userId || payment?.user_id) {
        await notificationService.createForUser(payment.userId || payment.user_id, {
          title: 'Payment confirmed',
          body: 'Your payment was received.',
          type: 'billing'
        });
      }
    }
    if (type.includes('PAYMENT.CAPTURE.DENIED')) {
      const payment = await this.billingRepository.markPaymentStatus(paymentId, 'failed');
      if (payment?.userId || payment?.user_id) {
        await notificationService.createForUser(payment.userId || payment.user_id, {
          title: 'Payment failed',
          body: 'Your payment could not be completed. Please try again from Billing.',
          type: 'billing'
        });
      }
    }
  }

  async applyPaystackEvent(event) {
    if (event.event !== 'charge.success') return;
    const reference = event.data?.reference;
    if (!reference) return;
    await billingService.syncPaystackTransaction(null, { reference, source: 'paystack_webhook' });
  }

  verifyPaypalSignature(body, signature) {
    const secret = process.env.PAYPAL_WEBHOOK_SECRET;
    if (!secret) {
      if (process.env.NODE_ENV === 'production') throw this.error(500, 'PayPal webhook secret is not configured.', 'PAYPAL_WEBHOOK_SECRET_MISSING');
      return true;
    }
    const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
    if (!signature || !safeEqual(expected, signature)) {
      throw this.error(400, 'Invalid PayPal webhook signature.', 'INVALID_PAYPAL_SIGNATURE');
    }
    return true;
  }

  verifyPaystackSignature(body, signature) {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
      throw this.error(503, 'Paystack webhook secret is not configured.', 'PAYSTACK_NOT_CONFIGURED');
    }
    const expected = crypto.createHmac('sha512', secret).update(body).digest('hex');
    if (!signature || !safeEqual(expected, signature)) {
      throw this.error(400, 'Invalid Paystack webhook signature.', 'INVALID_PAYSTACK_SIGNATURE');
    }
    return true;
  }

  paystackEventKey(event, body) {
    const eventType = event.event || event.type || 'unknown';
    const reference = event.data?.reference || event.data?.id || event.data?.transaction_id;
    if (reference) return `${eventType}:${reference}`;
    return `${eventType}:${crypto.createHash('sha256').update(body).digest('hex')}`;
  }

  ensureBuffer(body) {
    if (Buffer.isBuffer(body)) return body;
    if (typeof body === 'string') return Buffer.from(body);
    return Buffer.from(JSON.stringify(body || {}));
  }

  error(statusCode, publicMessage, errorCode) {
    return new AppError({ statusCode, publicMessage, internalMessage: publicMessage, errorCode });
  }
}

function getPlanFromStripeSubscription(subscription) {
  if (!subscription) return null;
  const item = subscription.items?.data?.[0] || {};
  return getPlanByStripePriceId(item.price?.id) || getPlan(subscription.metadata?.planKey);
}

function safeEqual(expected, actual) {
  const expectedBuffer = Buffer.from(String(expected));
  const actualBuffer = Buffer.from(String(actual));
  return expectedBuffer.length === actualBuffer.length && crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

module.exports = new WebhookService();
module.exports.WebhookService = WebhookService;
