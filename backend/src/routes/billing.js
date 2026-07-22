const { requireAuth } = require('@src/middlewares/requireAuth');

module.exports = [
  { method: 'GET', path: '/status', name: 'status', middleware: requireAuth, handler: 'billing/BillingController.status' },
  { method: 'GET', path: '/subscription', name: 'subscription', middleware: requireAuth, handler: 'billing/BillingController.subscription' },
  { method: 'POST', path: '/checkout', name: 'checkout', middleware: requireAuth, handler: 'billing/BillingController.checkout' },
  { method: 'POST', path: '/checkout/sync', name: 'syncCheckout', middleware: requireAuth, handler: 'billing/BillingController.syncCheckout' },
  { method: 'POST', path: '/paystack/verify', name: 'verifyPaystack', middleware: requireAuth, handler: 'billing/BillingController.verifyPaystack' },
  { method: 'POST', path: '/change-plan', name: 'changePlan', middleware: requireAuth, handler: 'billing/BillingController.changePlan' },
  { method: 'POST', path: '/portal', name: 'portal', middleware: requireAuth, handler: 'billing/BillingController.portal' },
  { method: 'GET', path: '/history', name: 'history', middleware: requireAuth, handler: 'billing/BillingController.history' },
  { method: 'POST', path: '/cancel', name: 'cancel', middleware: requireAuth, handler: 'billing/BillingController.cancel' }
];
