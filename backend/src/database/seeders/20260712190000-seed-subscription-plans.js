'use strict';

const { PLAN_DEFINITIONS, PLAN_ORDER } = require('../../config/plans');

const now = new Date();
const PLAN_IDS = PLAN_ORDER.map((key) => PLAN_DEFINITIONS[key].id);

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkDelete('subscription_plans', { id: PLAN_IDS });
    await queryInterface.bulkInsert('subscription_plans', PLAN_ORDER.map((key) => {
      const plan = PLAN_DEFINITIONS[key];
      return {
        id: plan.id,
        key: plan.key,
        name: plan.name,
        price: plan.price,
        price_cents: plan.priceCents,
        currency: plan.currency,
        billing_interval: plan.billingInterval,
        credit_amount: plan.creditAmount,
        stripe_price_id: process.env[plan.stripePriceEnv] || null,
        chat_limit: plan.chatLimit,
        live_limit: plan.liveLimit,
        active: true,
        created_at: now,
        updated_at: now
      };
    }));
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('subscription_plans', { id: PLAN_IDS });
  }
};
