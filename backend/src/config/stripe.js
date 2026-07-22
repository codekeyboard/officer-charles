const Stripe = require('stripe');

let stripeClient = null;
let testClient = null;

function isStripeConfigured() {
  return Boolean(String(process.env.STRIPE_SECRET_KEY || '').trim());
}

function isWebhookConfigured() {
  return Boolean(String(process.env.STRIPE_WEBHOOK_SECRET || '').trim());
}

function getStripe() {
  if (testClient) return testClient;
  const secretKey = String(process.env.STRIPE_SECRET_KEY || '').trim();
  if (!secretKey) return null;
  if (!stripeClient) {
    stripeClient = new Stripe(secretKey, { apiVersion: '2024-06-20' });
  }
  return stripeClient;
}

function setStripeClientForTests(client) {
  testClient = client;
}

function resetStripeClientForTests() {
  testClient = null;
  stripeClient = null;
}

module.exports = {
  getStripe,
  isStripeConfigured,
  isWebhookConfigured,
  setStripeClientForTests,
  resetStripeClientForTests
};
