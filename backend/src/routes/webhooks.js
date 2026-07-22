module.exports = [
  { method: 'POST', path: '/stripe', name: 'stripe', handler: 'webhooks/WebhookController.stripe' },
  { method: 'POST', path: '/paypal', name: 'paypal', handler: 'webhooks/WebhookController.paypal' },
  { method: 'POST', path: '/paystack', name: 'paystack', handler: 'webhooks/WebhookController.paystack' }
];
