const crypto = require('crypto');
const { Op } = require('sequelize');
const db = require('@src/models');
const {
  PLAN_DEFINITIONS,
  PLAN_ORDER,
  getPlan,
  getPlanByStripePriceId,
  getStripePriceId,
  FREE_SIGNUP_CREDITS,
  CREDIT_COSTS,
  toPublicPlan,
  publicPlans
} = require('@src/config/plans');

const ACCESSIBLE_SUBSCRIPTION_STATUSES = ['active', 'trialing'];
const PAYMENT_BLOCKING_STATUSES = ['past_due', 'unpaid', 'incomplete', 'incomplete_expired'];

function plain(row) {
  return typeof row?.get === 'function' ? row.get({ plain: true }) : row;
}

function normalizeUser(row) {
  const item = plain(row);
  if (!item) return null;
  return {
    id: item.id,
    name: item.name || null,
    email: item.email || null,
    role: item.role || null,
    status: item.status || null
  };
}

function periodFromSeconds(value) {
  return value ? new Date(Number(value) * 1000) : null;
}

function normalizeSubscription(row, usage = null) {
  const item = plain(row);
  if (!item) return null;
  const plan = getPlan(item.planKey || item.plan_key || item.plan?.key || item.planId || item.plan_id) || item.plan || null;
  const usageRow = plain(usage || item.currentUsage || item.usagePeriods?.[0]) || null;
  const chatLimit = Number(usageRow?.chatLimit ?? usageRow?.chat_limit ?? item.chatRemaining ?? item.chat_remaining ?? plan?.chatLimit ?? 0);
  const liveLimit = Number(usageRow?.liveLimit ?? usageRow?.live_limit ?? item.liveRemaining ?? item.live_remaining ?? plan?.liveLimit ?? 0);
  const chatUsed = Number(usageRow?.chatUsed ?? usageRow?.chat_used ?? Math.max(chatLimit - Number(item.chatRemaining ?? item.chat_remaining ?? chatLimit), 0));
  const liveUsed = Number(usageRow?.liveUsed ?? usageRow?.live_used ?? Math.max(liveLimit - Number(item.liveRemaining ?? item.live_remaining ?? liveLimit), 0));
  const status = item.status || 'none';
  return {
    id: item.id,
    userId: item.userId || item.user_id,
    user: normalizeUser(item.user),
    status,
    plan: plan ? toPublicPlan({ ...plan, stripePriceId: item.stripePriceId || item.stripe_price_id }) : null,
    planId: item.planId || item.plan_id || plan?.id || null,
    planKey: item.planKey || item.plan_key || plan?.key || null,
    stripeSubscriptionId: item.stripeSubscriptionId || item.stripe_subscription_id || null,
    stripeSubscriptionItemId: item.stripeSubscriptionItemId || item.stripe_subscription_item_id || null,
    stripePriceId: item.stripePriceId || item.stripe_price_id || null,
    currentPeriodStart: item.currentPeriodStart || item.current_period_start || null,
    currentPeriodEnd: item.currentPeriodEnd || item.current_period_end || null,
    cancelAtPeriodEnd: Boolean(item.cancelAtPeriodEnd ?? item.cancel_at_period_end),
    canceledAt: item.canceledAt || item.canceled_at || null,
    createdAt: item.createdAt || item.created_at || null,
    updatedAt: item.updatedAt || item.updated_at || null,
    chatLimit,
    liveLimit,
    chatUsed,
    liveUsed,
    chatRemaining: Math.max(chatLimit - chatUsed, 0),
    liveRemaining: Math.max(liveLimit - liveUsed, 0),
    usage: usageRow ? {
      id: usageRow.id,
      periodStart: usageRow.periodStart || usageRow.period_start,
      periodEnd: usageRow.periodEnd || usageRow.period_end,
      chatLimit,
      liveLimit,
      chatUsed,
      liveUsed,
      chatRemaining: Math.max(chatLimit - chatUsed, 0),
      liveRemaining: Math.max(liveLimit - liveUsed, 0)
    } : null
  };
}

function normalizePayment(row) {
  const item = plain(row);
  if (!item) return null;
  const plan = getPlan(item.planKey || item.plan_key || item.plan?.key || item.planId || item.plan_id) || item.plan || null;
  return {
    id: item.id,
    userId: item.userId || item.user_id,
    user: normalizeUser(item.user),
    planId: item.planId || item.plan_id || plan?.id || null,
    plan: plan ? toPublicPlan(plan) : null,
    planKey: item.planKey || item.plan_key || plan?.key || null,
    planName: item.planName || item.plan_name || plan?.name || null,
    amount: item.amount,
    amountCents: item.amountCents ?? item.amount_cents ?? Math.round(Number(item.amount || 0) * 100),
    currency: item.currency || 'usd',
    provider: item.provider || 'stripe',
    status: item.status,
    checkoutUrl: item.checkoutUrl || item.checkout_url || null,
    stripeCheckoutSessionId: item.stripeCheckoutSessionId || item.stripe_checkout_session_id || null,
    stripeInvoiceId: item.stripeInvoiceId || item.stripe_invoice_id || null,
    stripePaymentIntentId: item.stripePaymentIntentId || item.stripe_payment_intent_id || null,
    paystackReference: item.paystackReference || item.paystack_reference || null,
    paystackAccessCode: item.paystackAccessCode || item.paystack_access_code || null,
    paystackTransactionId: item.paystackTransactionId || item.paystack_transaction_id || null,
    paystackCustomerCode: item.paystackCustomerCode || item.paystack_customer_code || null,
    failureReason: item.failureReason || item.failure_reason || null,
    paidAt: item.paidAt || item.paid_at || null,
    createdAt: item.createdAt || item.created_at || null
  };
}

function normalizeCreditBalance(row, plan = null) {
  const item = plain(row) || {};
  const availableCredits = Number(item.availableCredits ?? item.available_credits ?? FREE_SIGNUP_CREDITS);
  const lifetimePurchasedCredits = Number(item.lifetimePurchasedCredits ?? item.lifetime_purchased_credits ?? 0);
  const lifetimeGrantedCredits = Number(item.lifetimeGrantedCredits ?? item.lifetime_granted_credits ?? FREE_SIGNUP_CREDITS);
  const lifetimeUsedCredits = Number(item.lifetimeUsedCredits ?? item.lifetime_used_credits ?? 0);
  const publicPlan = plan ? toPublicPlan(plan) : null;
  return {
    status: 'credits',
    plan: publicPlan,
    planId: publicPlan?.id || null,
    planKey: publicPlan?.key || null,
    availableCredits,
    lifetimePurchasedCredits,
    lifetimeGrantedCredits,
    lifetimeUsedCredits,
    creditCosts: CREDIT_COSTS,
    chatRemaining: Math.floor(availableCredits / CREDIT_COSTS.CHAT_TRAINING),
    liveRemaining: 0,
    chatLimit: availableCredits,
    liveLimit: 0,
    chatUsed: lifetimeUsedCredits,
    liveUsed: 0,
    usage: {
      availableCredits,
      lifetimePurchasedCredits,
      lifetimeGrantedCredits,
      lifetimeUsedCredits
    }
  };
}

function creditCost(interviewType, mode) {
  if (interviewType === 'LIVE') return mode === 'TRAINING' ? CREDIT_COSTS.LIVE_TRAINING : CREDIT_COSTS.LIVE_SIMULATION;
  return mode === 'TRAINING' ? CREDIT_COSTS.CHAT_TRAINING : CREDIT_COSTS.CHAT_SIMULATION;
}

class SequelizeBillingRepository {
  async listPlans() {
    const rows = await db.SubscriptionPlan.findAll({ where: { active: true }, order: [['price', 'ASC']] });
    if (rows.length === 0) return publicPlans();
    const byKey = new Map(rows.map((row) => {
      const item = plain(row);
      return [item.key || getPlan(item.id)?.key, item];
    }));
    return PLAN_ORDER.map((key) => toPublicPlan({ ...PLAN_DEFINITIONS[key], ...(byKey.get(key) || {}) }));
  }

  async findPlan(planKeyOrId) {
    const fallback = getPlan(planKeyOrId);
    const where = fallback ? { [Op.or]: [{ key: fallback.key }, { id: fallback.id }] } : { id: planKeyOrId };
    const row = await db.SubscriptionPlan.findOne({ where });
    return toPublicPlan({ ...(fallback || {}), ...(plain(row) || {}) });
  }

  async getLatestSubscription(userId) {
    return this.getCreditStatus(userId);
  }

  async getCreditStatus(userId) {
    const balance = await this.ensureCreditBalance(userId);
    const plan = await this.getLatestPaidPlan(userId);
    return normalizeCreditBalance(balance, plan);
  }

  async getLatestPaidPlan(userId) {
    const payment = await db.Payment.findOne({
      where: { userId, status: 'paid', planId: { [Op.ne]: null } },
      order: [['updatedAt', 'DESC']]
    });
    if (!payment?.planId) return null;
    const plan = await db.SubscriptionPlan.findByPk(payment.planId);
    return plan ? plain(plan) : getPlan(payment.planId);
  }

  async ensureCreditBalance(userId, transaction = null) {
    const [balance] = await db.UserCreditBalance.findOrCreate({
      where: { userId },
      defaults: {
        userId,
        availableCredits: FREE_SIGNUP_CREDITS,
        lifetimeGrantedCredits: FREE_SIGNUP_CREDITS,
        lifetimePurchasedCredits: 0,
        lifetimeUsedCredits: 0
      },
      transaction
    });
    return balance;
  }

  async grantCredits({ userId, credits, paymentId = null, metadata = {} }) {
    return db.sequelize.transaction(async (transaction) => {
      const balance = await this.ensureCreditBalance(userId, transaction);
      await balance.increment({
        availableCredits: credits,
        lifetimePurchasedCredits: credits
      }, { transaction });
      const updated = await db.UserCreditBalance.findByPk(balance.id, { transaction });
      await db.CreditTransaction.create({
        userId,
        paymentId,
        type: 'purchase',
        credits,
        balanceAfter: updated.availableCredits,
        metadata
      }, { transaction });
      return normalizeCreditBalance(updated);
    });
  }

  async consumeCredits({ userId, credits, interviewType, mode, interviewId = null }) {
    if (!credits || credits <= 0) return { ok: false, reason: 'CREDIT_COST_NOT_CONFIGURED' };
    return db.sequelize.transaction(async (transaction) => {
      const balance = await this.ensureCreditBalance(userId, transaction);
      await balance.reload({ transaction, lock: transaction.LOCK.UPDATE });
      if (Number(balance.availableCredits || 0) < credits) {
        return { ok: false, reason: 'INSUFFICIENT_CREDITS', balance: normalizeCreditBalance(balance), requiredCredits: credits };
      }
      await balance.increment({
        availableCredits: -credits,
        lifetimeUsedCredits: credits
      }, { transaction });
      const updated = await db.UserCreditBalance.findByPk(balance.id, { transaction });
      await db.CreditTransaction.create({
        userId,
        interviewId,
        type: 'debit',
        credits: -credits,
        balanceAfter: updated.availableCredits,
        metadata: { interviewType, mode }
      }, { transaction });
      return { ok: true, source: 'credits', creditsConsumed: credits, balance: normalizeCreditBalance(updated) };
    });
  }

  async refundCredits({ userId, credits, interviewType, mode, interviewId = null, reason = 'system_error', metadata = {} }) {
    if (!credits || credits <= 0) return { ok: false, reason: 'CREDIT_COST_NOT_CONFIGURED' };
    return db.sequelize.transaction(async (transaction) => {
      if (interviewId) {
        const existingRefund = await db.CreditTransaction.findOne({
          where: { userId, interviewId, type: 'refund' },
          transaction,
          lock: transaction.LOCK.UPDATE
        });
        if (existingRefund) {
          const balance = await this.ensureCreditBalance(userId, transaction);
          return { ok: true, alreadyRefunded: true, balance: normalizeCreditBalance(balance) };
        }
      }

      const balance = await this.ensureCreditBalance(userId, transaction);
      await balance.reload({ transaction, lock: transaction.LOCK.UPDATE });
      const updatedValues = {
        availableCredits: Number(balance.availableCredits || 0) + credits,
        lifetimeUsedCredits: Math.max(Number(balance.lifetimeUsedCredits || 0) - credits, 0)
      };
      await balance.update(updatedValues, { transaction });
      const updated = await db.UserCreditBalance.findByPk(balance.id, { transaction });
      await db.CreditTransaction.create({
        userId,
        interviewId,
        type: 'refund',
        credits,
        balanceAfter: updated.availableCredits,
        metadata: { interviewType, mode, reason, ...metadata }
      }, { transaction });
      return { ok: true, source: 'refund', creditsRefunded: credits, balance: normalizeCreditBalance(updated) };
    });
  }

  async getLegacyLatestSubscription(userId) {
    const subscription = await db.UserSubscription.findOne({
      where: { userId },
      include: [{ model: db.SubscriptionPlan, as: 'plan' }],
      order: [['createdAt', 'DESC']]
    });
    if (!subscription) return null;
    const usage = await this.getCurrentSubscriptionUsage(userId, plain(subscription));
    return normalizeSubscription(subscription, usage);
  }

  async getActiveSubscription(userId) {
    const subscription = await db.UserSubscription.findOne({
      where: { userId, status: { [Op.in]: ACCESSIBLE_SUBSCRIPTION_STATUSES } },
      include: [{ model: db.SubscriptionPlan, as: 'plan' }],
      order: [['createdAt', 'DESC']]
    });
    if (!subscription) return null;
    const usage = await this.getCurrentSubscriptionUsage(userId, plain(subscription));
    return normalizeSubscription(subscription, usage);
  }

  async getPaymentBlockingSubscription(userId) {
    const subscription = await db.UserSubscription.findOne({
      where: { userId, status: { [Op.in]: PAYMENT_BLOCKING_STATUSES } },
      include: [{ model: db.SubscriptionPlan, as: 'plan' }],
      order: [['createdAt', 'DESC']]
    });
    return normalizeSubscription(subscription);
  }

  async createPendingPayment({
    userId,
    plan,
    checkoutUrl = null,
    stripeCheckoutSessionId = null,
    provider = 'stripe',
    paystackReference = null,
    paystackAccessCode = null,
    amount = null,
    amountCents = null,
    currency = null
  }) {
    const payment = await db.Payment.create({
      userId,
      planId: isUuid(plan.id) ? plan.id : null,
      amount: amount ?? plan.price,
      amountCents: amountCents ?? plan.priceCents,
      currency: currency ?? plan.currency,
      provider,
      status: 'pending',
      checkoutUrl,
      stripeCheckoutSessionId,
      paystackReference,
      paystackAccessCode
    });
    return normalizePayment(payment);
  }

  async findPaymentById(paymentId) {
    return normalizePayment(await db.Payment.findByPk(paymentId));
  }

  async updatePayment(paymentId, updates = {}) {
    const payment = await db.Payment.findByPk(paymentId);
    if (!payment) return null;
    await payment.update(updates);
    return normalizePayment(payment);
  }

  async markPaymentStatus(paymentId, status, extra = {}) {
    return this.updatePayment(paymentId, { status, ...extra });
  }

  async activateSubscriptionFromPayment(paymentId) {
    return this.updatePayment(paymentId, { status: 'paid' });
  }

  async findPaymentByCheckoutSession(stripeCheckoutSessionId) {
    return normalizePayment(await db.Payment.findOne({ where: { stripeCheckoutSessionId } }));
  }

  async findPaymentByPaystackReference(paystackReference) {
    return normalizePayment(await db.Payment.findOne({ where: { paystackReference } }));
  }

  async listPayments(userId) {
    const payments = await db.Payment.findAll({ where: { userId }, order: [['createdAt', 'DESC']] });
    return payments.map(normalizePayment);
  }

  async listAllPayments(filters = {}) {
    const where = {};
    if (filters.provider) where.provider = filters.provider;
    if (filters.status) where.status = filters.status;
    const payments = await db.Payment.findAll({
      where,
      include: [
        { model: db.User, as: 'user', attributes: ['id', 'name', 'email', 'role', 'status'] },
        { model: db.SubscriptionPlan, as: 'plan' }
      ],
      order: [['createdAt', 'DESC']]
    });
    return payments.map(normalizePayment);
  }

  async listAllSubscriptions() {
    const subscriptions = await db.UserSubscription.findAll({
      include: [
        { model: db.User, as: 'user', attributes: ['id', 'name', 'email', 'role', 'status'] },
        { model: db.SubscriptionPlan, as: 'plan' }
      ],
      order: [['createdAt', 'DESC']]
    });
    return Promise.all(subscriptions.map(async (subscription) => normalizeSubscription(subscription, await this.getCurrentSubscriptionUsage(subscription.userId, plain(subscription)))));
  }

  async setUserStripeCustomerId(userId, stripeCustomerId) {
    const user = await db.User.findByPk(userId);
    if (!user) return null;
    await user.update({ stripeCustomerId });
    return plain(user);
  }

  async findUserByStripeCustomerId(stripeCustomerId) {
    return plain(await db.User.findOne({ where: { stripeCustomerId } }));
  }

  async upsertSubscriptionFromStripe(data) {
    const plan = getPlan(data.planKey) || getPlanByStripePriceId(data.stripePriceId);
    if (!plan) return null;
    const periodStart = data.currentPeriodStart || new Date();
    const periodEnd = data.currentPeriodEnd || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return db.sequelize.transaction(async (transaction) => {
      const [subscription] = await db.UserSubscription.findOrCreate({
        where: { stripeSubscriptionId: data.stripeSubscriptionId },
        defaults: {
          userId: data.userId,
          planId: plan.id,
          planKey: plan.key,
          stripeSubscriptionId: data.stripeSubscriptionId,
          stripeSubscriptionItemId: data.stripeSubscriptionItemId,
          stripePriceId: data.stripePriceId,
          status: data.status,
          chatRemaining: plan.chatLimit,
          liveRemaining: plan.liveLimit,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: Boolean(data.cancelAtPeriodEnd),
          canceledAt: data.canceledAt || null
        },
        transaction
      });
      await subscription.update({
        userId: data.userId,
        planId: plan.id,
        planKey: plan.key,
        stripeSubscriptionItemId: data.stripeSubscriptionItemId,
        stripePriceId: data.stripePriceId,
        status: data.status,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: Boolean(data.cancelAtPeriodEnd),
        canceledAt: data.canceledAt || null
      }, { transaction });

      const [usage] = await db.SubscriptionUsage.findOrCreate({
        where: { userId: data.userId, periodStart, periodEnd },
        defaults: {
          userId: data.userId,
          subscriptionId: subscription.id,
          planKey: plan.key,
          periodStart,
          periodEnd,
          chatLimit: plan.chatLimit,
          liveLimit: plan.liveLimit,
          chatUsed: 0,
          liveUsed: 0
        },
        transaction
      });
      await usage.update({
        subscriptionId: subscription.id,
        planKey: plan.key,
        chatLimit: plan.chatLimit,
        liveLimit: plan.liveLimit
      }, { transaction });
      return normalizeSubscription(plain(subscription), plain(usage));
    });
  }

  async markStripeSubscriptionStatus(stripeSubscriptionId, status, extra = {}) {
    const subscription = await db.UserSubscription.findOne({ where: { stripeSubscriptionId } });
    if (!subscription) return null;
    await subscription.update({ status, ...extra });
    return normalizeSubscription(subscription);
  }

  async getCurrentSubscriptionUsage(userId, subscription = null) {
    const now = new Date();
    const where = { userId };
    if (subscription?.currentPeriodStart || subscription?.current_period_start) where.periodStart = subscription.currentPeriodStart || subscription.current_period_start;
    if (subscription?.currentPeriodEnd || subscription?.current_period_end) where.periodEnd = subscription.currentPeriodEnd || subscription.current_period_end;
    const usage = await db.SubscriptionUsage.findOne({
      where: Object.keys(where).length > 1 ? where : { userId, periodStart: { [Op.lte]: now }, periodEnd: { [Op.gt]: now } },
      order: [['periodEnd', 'DESC']]
    });
    return plain(usage);
  }

  async consumeInterviewAttempt({ userId, interviewType, mode, limits, interviewId = null, credits = null }) {
    return this.consumeCredits({ userId, interviewType, mode, interviewId, credits: credits ?? creditCost(interviewType, mode) });
  }

  async consumeSubscriptionUsage({ userId, interviewType, subscription }) {
    return db.sequelize.transaction(async (transaction) => {
      const usage = await db.SubscriptionUsage.findOne({
        where: { userId, periodStart: subscription.currentPeriodStart, periodEnd: subscription.currentPeriodEnd },
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      if (!usage) return { ok: false, reason: 'ACTIVE_SUBSCRIPTION_REQUIRED', subscription };
      const field = interviewType === 'LIVE' ? 'liveUsed' : 'chatUsed';
      const limitField = interviewType === 'LIVE' ? 'liveLimit' : 'chatLimit';
      if (Number(usage[field] || 0) >= Number(usage[limitField] || 0)) {
        return { ok: false, reason: interviewType === 'LIVE' ? 'LIVE_INTERVIEW_LIMIT_REACHED' : 'CHAT_INTERVIEW_LIMIT_REACHED', subscription };
      }
      await usage.increment(field, { by: 1, transaction });
      const updated = await db.SubscriptionUsage.findByPk(usage.id, { transaction });
      return { ok: true, source: 'subscription', subscription: normalizeSubscription(subscription, updated) };
    });
  }

  async consumeFreeUsage({ userId, interviewType, mode, limits }) {
    return db.sequelize.transaction(async (transaction) => {
      const [usage] = await db.UserUsage.findOrCreate({ where: { userId }, defaults: { userId }, transaction, lock: transaction.LOCK.UPDATE });
      const field = freeUsageField(interviewType, mode);
      const limit = limits[freeLimitKey(interviewType, mode)] ?? 0;
      if (Number(usage[field] || 0) >= Number(limit || 0)) {
        return { ok: false, reason: interviewType === 'LIVE' ? 'LIVE_INTERVIEW_LIMIT_REACHED' : 'CHAT_INTERVIEW_LIMIT_REACHED' };
      }
      await usage.increment(field, { by: 1, transaction });
      await usage.increment(interviewType === 'LIVE' ? 'liveInterviewsUsed' : 'chatInterviewsUsed', { by: 1, transaction });
      return { ok: true, source: 'free' };
    });
  }

  async getFreeUsageCounters(userId) {
    const usage = await db.UserUsage.findOne({ where: { userId } });
    const item = plain(usage) || {};
    return {
      chatTraining: Number(item.chatTrainingUsed ?? item.chat_training_used ?? 0),
      chatSimulation: Number(item.chatSimulationUsed ?? item.chat_simulation_used ?? 0),
      liveTraining: Number(item.liveTrainingUsed ?? item.live_training_used ?? 0),
      liveSimulation: Number(item.liveSimulationUsed ?? item.live_simulation_used ?? 0),
      usedChat: Number(item.chatInterviewsUsed ?? item.chat_interviews_used ?? 0),
      usedLive: Number(item.liveInterviewsUsed ?? item.live_interviews_used ?? 0)
    };
  }

  async recordStripeEvent(event, status = 'processed') {
    const existing = await db.StripeEvent.findOne({ where: { stripeEventId: event.id } });
    if (existing) return { duplicate: true, event: plain(existing) };
    const row = await db.StripeEvent.create({
      stripeEventId: event.id,
      type: event.type,
      status,
      payload: event,
      processedAt: status === 'processed' ? new Date() : null
    });
    return { duplicate: false, event: plain(row) };
  }

  async hasStripeEvent(stripeEventId) {
    return Boolean(await db.StripeEvent.findOne({ where: { stripeEventId } }));
  }

  async recordPaystackEvent(eventKey, event, status = 'processed') {
    const existing = await db.PaystackEvent.findOne({ where: { paystackEventKey: eventKey } });
    if (existing) return { duplicate: true, event: plain(existing) };
    const row = await db.PaystackEvent.create({
      paystackEventKey: eventKey,
      type: event.event || event.type || 'unknown',
      status,
      payload: event,
      processedAt: status === 'processed' ? new Date() : null
    });
    return { duplicate: false, event: plain(row) };
  }

  async hasPaystackEvent(eventKey) {
    return Boolean(await db.PaystackEvent.findOne({ where: { paystackEventKey: eventKey } }));
  }

  async revenueSummary() {
    const payments = await this.listAllPayments({ status: 'paid' });
    return summarizeRevenue(payments, await this.listPlans());
  }
}

class MemoryBillingRepository {
  constructor() {
    this.plans = publicPlans();
    this.subscriptions = new Map();
    this.payments = new Map();
    this.freeUsage = new Map();
    this.creditBalances = new Map();
    this.creditTransactions = [];
    this.stripeEvents = new Map();
    this.paystackEvents = new Map();
    this.stripeCustomers = new Map();
  }

  async listPlans() {
    const paystackConfigured = Boolean(String(process.env.PAYSTACK_SECRET_KEY || '').trim());
    return this.plans.filter((plan) => plan.active !== false).map((plan) => ({
      ...plan,
      stripeConfigured: Boolean(getStripePriceId(plan.key)),
      paystackConfigured
    }));
  }

  async findPlan(planKeyOrId) {
    const plan = this.plans.find((item) => item.key === String(planKeyOrId).toLowerCase() || item.id === planKeyOrId);
    return plan ? {
      ...plan,
      stripeConfigured: Boolean(getStripePriceId(plan.key)),
      paystackConfigured: Boolean(String(process.env.PAYSTACK_SECRET_KEY || '').trim())
    } : null;
  }

  async getLatestSubscription(userId) {
    return this.getCreditStatus(userId);
  }

  async getCreditStatus(userId) {
    return normalizeCreditBalance(this.ensureCreditBalance(userId));
  }

  ensureCreditBalance(userId) {
    if (!this.creditBalances.has(userId)) {
      this.creditBalances.set(userId, {
        id: crypto.randomUUID(),
        userId,
        availableCredits: FREE_SIGNUP_CREDITS,
        lifetimeGrantedCredits: FREE_SIGNUP_CREDITS,
        lifetimePurchasedCredits: 0,
        lifetimeUsedCredits: 0
      });
    }
    return this.creditBalances.get(userId);
  }

  async grantCredits({ userId, credits, paymentId = null, metadata = {} }) {
    const balance = this.ensureCreditBalance(userId);
    balance.availableCredits += credits;
    balance.lifetimePurchasedCredits += credits;
    const normalized = normalizeCreditBalance(balance);
    this.creditTransactions.push({
      id: crypto.randomUUID(),
      userId,
      paymentId,
      type: 'purchase',
      credits,
      balanceAfter: normalized.availableCredits,
      metadata,
      createdAt: new Date().toISOString()
    });
    return normalized;
  }

  async consumeCredits({ userId, credits, interviewType, mode, interviewId = null }) {
    if (!credits || credits <= 0) return { ok: false, reason: 'CREDIT_COST_NOT_CONFIGURED' };
    const balance = this.ensureCreditBalance(userId);
    if (balance.availableCredits < credits) {
      return { ok: false, reason: 'INSUFFICIENT_CREDITS', balance: normalizeCreditBalance(balance), requiredCredits: credits };
    }
    balance.availableCredits -= credits;
    balance.lifetimeUsedCredits += credits;
    const normalized = normalizeCreditBalance(balance);
    this.creditTransactions.push({
      id: crypto.randomUUID(),
      userId,
      interviewId,
      type: 'debit',
      credits: -credits,
      balanceAfter: normalized.availableCredits,
      metadata: { interviewType, mode },
      createdAt: new Date().toISOString()
    });
    return { ok: true, source: 'credits', creditsConsumed: credits, balance: normalized };
  }

  async refundCredits({ userId, credits, interviewType, mode, interviewId = null, reason = 'system_error', metadata = {} }) {
    if (!credits || credits <= 0) return { ok: false, reason: 'CREDIT_COST_NOT_CONFIGURED' };
    if (interviewId && this.creditTransactions.some((item) => item.userId === userId && item.interviewId === interviewId && item.type === 'refund')) {
      return { ok: true, alreadyRefunded: true, balance: normalizeCreditBalance(this.ensureCreditBalance(userId)) };
    }

    const balance = this.ensureCreditBalance(userId);
    balance.availableCredits += credits;
    balance.lifetimeUsedCredits = Math.max(Number(balance.lifetimeUsedCredits || 0) - credits, 0);
    const normalized = normalizeCreditBalance(balance);
    this.creditTransactions.push({
      id: crypto.randomUUID(),
      userId,
      interviewId,
      type: 'refund',
      credits,
      balanceAfter: normalized.availableCredits,
      metadata: { interviewType, mode, reason, ...metadata },
      createdAt: new Date().toISOString()
    });
    return { ok: true, source: 'refund', creditsRefunded: credits, balance: normalized };
  }

  async getActiveSubscription(userId) {
    const subscription = this.subscriptions.get(userId);
    return subscription && ACCESSIBLE_SUBSCRIPTION_STATUSES.includes(subscription.status) ? subscription : null;
  }

  async getPaymentBlockingSubscription(userId) {
    const subscription = this.subscriptions.get(userId);
    return subscription && PAYMENT_BLOCKING_STATUSES.includes(subscription.status) ? subscription : null;
  }

  async createPendingPayment({
    userId,
    plan,
    checkoutUrl = null,
    stripeCheckoutSessionId = null,
    provider = 'stripe',
    paystackReference = null,
    paystackAccessCode = null,
    amount = null,
    amountCents = null,
    currency = null
  }) {
    const payment = {
      id: crypto.randomUUID(),
      userId,
      planId: plan.id,
      plan: toPublicPlan(plan),
      planKey: plan.key,
      planName: plan.name,
      amount: amount ?? plan.price,
      amountCents: amountCents ?? plan.priceCents,
      currency: currency ?? plan.currency,
      provider,
      status: 'pending',
      checkoutUrl,
      stripeCheckoutSessionId,
      paystackReference,
      paystackAccessCode,
      createdAt: new Date().toISOString()
    };
    const list = this.payments.get(userId) || [];
    list.unshift(payment);
    this.payments.set(userId, list);
    return payment;
  }

  async updatePayment(paymentId, updates = {}) {
    const payment = this.findPayment(paymentId);
    if (!payment) return null;
    Object.assign(payment, updates);
    return payment;
  }

  async markPaymentStatus(paymentId, status, extra = {}) {
    return this.updatePayment(paymentId, { status, ...extra });
  }

  async activateSubscriptionFromPayment(paymentId) {
    return this.updatePayment(paymentId, { status: 'paid' });
  }

  async findPaymentById(paymentId) {
    return this.findPayment(paymentId);
  }

  async findPaymentByCheckoutSession(stripeCheckoutSessionId) {
    return [...this.payments.values()].flat().find((item) => item.stripeCheckoutSessionId === stripeCheckoutSessionId) || null;
  }

  async findPaymentByPaystackReference(paystackReference) {
    return [...this.payments.values()].flat().find((item) => item.paystackReference === paystackReference) || null;
  }

  async listPayments(userId) {
    return this.payments.get(userId) || [];
  }

  async listAllPayments(filters = {}) {
    let payments = [...this.payments.values()].flat();
    if (filters.provider) payments = payments.filter((payment) => payment.provider === filters.provider);
    if (filters.status) payments = payments.filter((payment) => payment.status === filters.status);
    return payments;
  }

  async listAllSubscriptions() {
    return [...this.subscriptions.values()];
  }

  async setUserStripeCustomerId(userId, stripeCustomerId) {
    this.stripeCustomers.set(stripeCustomerId, userId);
    return { id: userId, stripeCustomerId };
  }

  async findUserByStripeCustomerId(stripeCustomerId) {
    const userId = this.stripeCustomers.get(stripeCustomerId);
    return userId ? { id: userId, stripeCustomerId } : null;
  }

  async upsertSubscriptionFromStripe(data) {
    const plan = getPlan(data.planKey) || getPlanByStripePriceId(data.stripePriceId);
    if (!plan) return null;
    const periodStart = (data.currentPeriodStart || new Date()).toISOString?.() || data.currentPeriodStart;
    const periodEnd = (data.currentPeriodEnd || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)).toISOString?.() || data.currentPeriodEnd;
    const current = this.subscriptions.get(data.userId);
    const usage = current?.usage?.periodStart === periodStart && current?.usage?.periodEnd === periodEnd
      ? current.usage
      : {
          id: crypto.randomUUID(),
          periodStart,
          periodEnd,
          chatUsed: 0,
          liveUsed: 0
        };
    const subscription = normalizeSubscription({
      id: current?.id || crypto.randomUUID(),
      userId: data.userId,
      planId: plan.id,
      planKey: plan.key,
      status: data.status,
      stripeSubscriptionId: data.stripeSubscriptionId,
      stripeSubscriptionItemId: data.stripeSubscriptionItemId,
      stripePriceId: data.stripePriceId,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: Boolean(data.cancelAtPeriodEnd),
      canceledAt: data.canceledAt || null,
      plan
    }, {
      ...usage,
      planKey: plan.key,
      chatLimit: plan.chatLimit,
      liveLimit: plan.liveLimit
    });
    this.subscriptions.set(data.userId, subscription);
    return subscription;
  }

  async markStripeSubscriptionStatus(stripeSubscriptionId, status, extra = {}) {
    const subscription = [...this.subscriptions.values()].find((item) => item.stripeSubscriptionId === stripeSubscriptionId);
    if (!subscription) return null;
    Object.assign(subscription, extra, { status });
    this.subscriptions.set(subscription.userId, normalizeSubscription(subscription, subscription.usage));
    return this.subscriptions.get(subscription.userId);
  }

  async consumeInterviewAttempt({ userId, interviewType, mode, limits, interviewId = null, credits = null }) {
    return this.consumeCredits({ userId, interviewType, mode, interviewId, credits: credits ?? creditCost(interviewType, mode) });
  }

  async consumeSubscriptionUsage({ userId, interviewType, subscription }) {
    const field = interviewType === 'LIVE' ? 'liveUsed' : 'chatUsed';
    const limit = interviewType === 'LIVE' ? subscription.liveLimit : subscription.chatLimit;
    const used = Number(subscription.usage?.[field] ?? subscription[field] ?? 0);
    if (used >= Number(limit || 0)) {
      return { ok: false, reason: interviewType === 'LIVE' ? 'LIVE_INTERVIEW_LIMIT_REACHED' : 'CHAT_INTERVIEW_LIMIT_REACHED', subscription };
    }
    const usage = { ...(subscription.usage || {}), [field]: used + 1 };
    const updated = normalizeSubscription(subscription, usage);
    this.subscriptions.set(userId, updated);
    return { ok: true, source: 'subscription', subscription: updated };
  }

  async consumeFreeUsage({ userId, interviewType, mode, limits }) {
    const current = this.freeUsage.get(userId) || { chatTraining: 0, chatSimulation: 0, liveTraining: 0, liveSimulation: 0, usedChat: 0, usedLive: 0 };
    const key = freeLimitKey(interviewType, mode);
    const counter = freeCounterKey(interviewType, mode);
    if (Number(current[counter] || 0) >= Number(limits[key] || 0)) {
      return { ok: false, reason: interviewType === 'LIVE' ? 'LIVE_INTERVIEW_LIMIT_REACHED' : 'CHAT_INTERVIEW_LIMIT_REACHED' };
    }
    current[counter] += 1;
    current[interviewType === 'LIVE' ? 'usedLive' : 'usedChat'] += 1;
    this.freeUsage.set(userId, current);
    return { ok: true, source: 'free' };
  }

  async getFreeUsageCounters(userId) {
    return this.freeUsage.get(userId) || { chatTraining: 0, chatSimulation: 0, liveTraining: 0, liveSimulation: 0, usedChat: 0, usedLive: 0 };
  }

  async recordStripeEvent(event, status = 'processed') {
    if (this.stripeEvents.has(event.id)) return { duplicate: true, event: this.stripeEvents.get(event.id) };
    const row = { id: crypto.randomUUID(), stripeEventId: event.id, type: event.type, status, payload: event, processedAt: new Date().toISOString() };
    this.stripeEvents.set(event.id, row);
    return { duplicate: false, event: row };
  }

  async hasStripeEvent(stripeEventId) {
    return this.stripeEvents.has(stripeEventId);
  }

  async recordPaystackEvent(eventKey, event, status = 'processed') {
    if (this.paystackEvents.has(eventKey)) return { duplicate: true, event: this.paystackEvents.get(eventKey) };
    const row = {
      id: crypto.randomUUID(),
      paystackEventKey: eventKey,
      type: event.event || event.type || 'unknown',
      status,
      payload: event,
      processedAt: new Date().toISOString()
    };
    this.paystackEvents.set(eventKey, row);
    return { duplicate: false, event: row };
  }

  async hasPaystackEvent(eventKey) {
    return this.paystackEvents.has(eventKey);
  }

  async revenueSummary() {
    return summarizeRevenue(await this.listAllPayments({ status: 'paid' }), this.plans);
  }

  findPayment(paymentId) {
    return [...this.payments.values()].flat().find((item) => item.id === paymentId) || null;
  }
}

function freeUsageField(interviewType, mode) {
  if (interviewType === 'LIVE') return mode === 'TRAINING' ? 'liveTrainingUsed' : 'liveSimulationUsed';
  return mode === 'TRAINING' ? 'chatTrainingUsed' : 'chatSimulationUsed';
}

function freeCounterKey(interviewType, mode) {
  if (interviewType === 'LIVE') return mode === 'TRAINING' ? 'liveTraining' : 'liveSimulation';
  return mode === 'TRAINING' ? 'chatTraining' : 'chatSimulation';
}

function freeLimitKey(interviewType, mode) {
  if (interviewType === 'LIVE') return mode === 'TRAINING' ? 'liveTraining' : 'liveSimulation';
  return mode === 'TRAINING' ? 'chatTraining' : 'chatSimulation';
}

function summarizeRevenue(payments, plans) {
  const totalRevenue = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const byMonth = payments.reduce((acc, payment) => {
    const month = String(payment.createdAt || payment.created_at || new Date().toISOString()).slice(0, 7);
    acc[month] = (acc[month] || 0) + Number(payment.amount || 0);
    return acc;
  }, {});
  return {
    totalRevenue,
    mrr: Object.values(byMonth).at(-1) || 0,
    byMonth: Object.entries(byMonth).map(([month, revenue]) => ({ month, revenue })),
    planDistribution: plans.map((plan) => ({
      plan: plan.name,
      activeSubscriptions: payments.filter((payment) => String(payment.planId) === String(plan.id)).length
    }))
  };
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value));
}

let repositorySingleton = null;

function createBillingRepository() {
  if (repositorySingleton) return repositorySingleton;
  if (process.env.AUTH_STORAGE === 'memory' || process.env.NODE_ENV === 'test') {
    repositorySingleton = new MemoryBillingRepository();
    return repositorySingleton;
  }
  repositorySingleton = new SequelizeBillingRepository();
  return repositorySingleton;
}

module.exports = {
  ACCESSIBLE_SUBSCRIPTION_STATUSES,
  PAYMENT_BLOCKING_STATUSES,
  SequelizeBillingRepository,
  MemoryBillingRepository,
  createBillingRepository,
  periodFromSeconds,
  normalizeSubscription,
  normalizePayment
};
