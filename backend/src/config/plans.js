const PLAN_IDS = {
  starter: '11111111-1111-4111-8111-111111111111',
  pro: '22222222-2222-4222-8222-222222222222',
  premium: '33333333-3333-4333-8333-333333333333'
};

const PLAN_DEFINITIONS = {
  starter: {
    id: PLAN_IDS.starter,
    key: 'starter',
    name: 'Starter',
    price: 9.99,
    priceCents: 999,
    currency: 'usd',
    billingInterval: 'one_time',
    creditAmount: 100,
    chatLimit: 100,
    liveLimit: 0,
    stripePriceEnv: 'STRIPE_PRICE_STARTER',
    features: ['100 credits']
  },
  pro: {
    id: PLAN_IDS.pro,
    key: 'pro',
    name: 'Pro',
    price: 24.99,
    priceCents: 2499,
    currency: 'usd',
    billingInterval: 'one_time',
    creditAmount: 300,
    chatLimit: 300,
    liveLimit: 0,
    stripePriceEnv: 'STRIPE_PRICE_PRO',
    features: ['300 credits']
  },
  premium: {
    id: PLAN_IDS.premium,
    key: 'premium',
    name: 'Premium',
    price: 39.99,
    priceCents: 3999,
    currency: 'usd',
    billingInterval: 'one_time',
    creditAmount: 500,
    chatLimit: 500,
    liveLimit: 0,
    stripePriceEnv: 'STRIPE_PRICE_PREMIUM',
    features: ['500 credits']
  }
};

const PLAN_ORDER = ['starter', 'pro', 'premium'];
const FREE_SIGNUP_CREDITS = 20;
const DEFAULT_PAYSTACK_USD_TO_GHS_RATE = 11.5;
const CREDIT_COSTS = {
  CHAT_TRAINING: 5,
  CHAT_SIMULATION: 10,
  LIVE_TRAINING: 15,
  LIVE_SIMULATION: 25,
  STORY_BUILDER: 10,
  VIDEO_TRAINING: 15,
  VIDEO_SIMULATION: 25
};

function getPlan(planKeyOrId) {
  const normalized = String(planKeyOrId || '').trim().toLowerCase();
  return PLAN_DEFINITIONS[normalized]
    || Object.values(PLAN_DEFINITIONS).find((plan) => plan.id === planKeyOrId)
    || null;
}

function getPlanByStripePriceId(stripePriceId) {
  if (!stripePriceId) return null;
  return Object.values(PLAN_DEFINITIONS).find((plan) => getStripePriceId(plan.key) === stripePriceId) || null;
}

function getStripePriceId(planKey) {
  const plan = getPlan(planKey);
  return plan ? String(process.env[plan.stripePriceEnv] || '').trim() : '';
}

function getPaystackCurrency() {
  return String(process.env.PAYSTACK_CURRENCY || '').trim().toLowerCase();
}

function getPaystackUsdToGhsRate() {
  const configured = Number(String(process.env.PAYSTACK_USD_TO_GHS_RATE || '').trim());
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_PAYSTACK_USD_TO_GHS_RATE;
}

function getPaystackPriceCents(planKey) {
  const plan = getPlan(planKey);
  if (!plan) return 0;
  const envKey = `PAYSTACK_PRICE_${String(plan.key).toUpperCase()}_CENTS`;
  const configured = Number(String(process.env[envKey] || '').trim());
  if (Number.isFinite(configured) && configured > 0) return Math.round(configured);

  const currency = getPaystackCurrency();
  if (currency === 'ghs') {
    return Math.round(Number(plan.priceCents || 0) * getPaystackUsdToGhsRate());
  }

  return Number(plan.priceCents || 0);
}

function getPaystackPaymentDetails(plan) {
  const base = getPlan(plan?.key || plan?.id) || plan;
  const amountCents = getPaystackPriceCents(base.key);
  const currency = getPaystackCurrency() || String(base.currency || 'usd').toLowerCase();
  return {
    amountCents,
    amount: amountCents / 100,
    currency
  };
}

function getPlanIndex(planKey) {
  return PLAN_ORDER.indexOf(String(planKey || '').toLowerCase());
}

function isUpgrade(currentPlanKey, targetPlanKey) {
  return getPlanIndex(targetPlanKey) > getPlanIndex(currentPlanKey);
}

function toPublicPlan(planInput) {
  const base = getPlan(planInput?.key || planInput?.id) || planInput;
  const stripePriceId = planInput?.stripePriceId || planInput?.stripe_price_id || getStripePriceId(base.key);
  const paystackConfigured = Boolean(String(process.env.PAYSTACK_SECRET_KEY || '').trim());
  const paystack = getPaystackPaymentDetails(base);
  return {
    id: base.id,
    key: base.key,
    name: base.name,
    price: Number(base.price ?? (base.priceCents || base.price_cents || 0) / 100),
    formattedPrice: `$${Number(base.price ?? (base.priceCents || base.price_cents || 0) / 100).toFixed(2)}`,
    priceCents: Number(base.priceCents ?? base.price_cents ?? Number(base.price || 0) * 100),
    currency: base.currency || 'usd',
    paystackPrice: paystack.amount,
    paystackFormattedPrice: new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: paystack.currency.toUpperCase()
    }).format(paystack.amount),
    paystackPriceCents: paystack.amountCents,
    paystackCurrency: paystack.currency,
    billingInterval: base.billingInterval ?? base.billing_interval ?? null,
    creditAmount: Number(base.creditAmount ?? base.credit_amount ?? base.chatLimit ?? base.chat_limit ?? 0),
    chatLimit: Number(base.chatLimit ?? base.chat_limit ?? 0),
    liveLimit: Number(base.liveLimit ?? base.live_limit ?? 0),
    features: Array.isArray(base.features) ? base.features : [],
    active: base.active !== false,
    stripeConfigured: Boolean(stripePriceId),
    paystackConfigured
  };
}

function publicPlans() {
  return PLAN_ORDER.map((key) => toPublicPlan(PLAN_DEFINITIONS[key]));
}

module.exports = {
  PLAN_IDS,
  PLAN_DEFINITIONS,
  PLAN_ORDER,
  FREE_SIGNUP_CREDITS,
  CREDIT_COSTS,
  getPlan,
  getPlanByStripePriceId,
  getStripePriceId,
  getPaystackCurrency,
  getPaystackUsdToGhsRate,
  getPaystackPriceCents,
  getPaystackPaymentDetails,
  getPlanIndex,
  isUpgrade,
  toPublicPlan,
  publicPlans
};
