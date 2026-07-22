const billingService = require('@src/services/BillingService');

exports.subscription = async (req, res, next) => {
  try {
    const data = await billingService.getSubscription(req.user.id);
    res.json({ success: true, message: 'Subscription loaded.', data });
  } catch (error) {
    next(error);
  }
};

exports.status = async (req, res, next) => {
  try {
    const data = await billingService.getStatus(req.user.id);
    res.json({ success: true, message: 'Billing status loaded.', data });
  } catch (error) {
    next(error);
  }
};

exports.checkout = async (req, res, next) => {
  try {
    const data = await billingService.createCheckout(req.user.id, req.body || {}, req.headers || {});
    res.status(201).json({ success: true, message: 'Checkout session created.', data });
  } catch (error) {
    next(error);
  }
};

exports.syncCheckout = async (req, res, next) => {
  try {
    const data = await billingService.syncCheckoutSession(req.user.id, req.body || {});
    res.json({ success: true, message: 'Checkout session synced.', data });
  } catch (error) {
    next(error);
  }
};

exports.verifyPaystack = async (req, res, next) => {
  try {
    const data = await billingService.syncPaystackTransaction(req.user.id, req.body || {});
    res.json({ success: true, message: 'Paystack payment synced.', data });
  } catch (error) {
    next(error);
  }
};

exports.changePlan = async (req, res, next) => {
  try {
    const data = await billingService.changePlan(req.user.id, req.body || {}, req.headers || {});
    res.json({ success: true, message: 'Plan change requested.', data });
  } catch (error) {
    next(error);
  }
};

exports.portal = async (req, res, next) => {
  try {
    const data = await billingService.createPortal(req.user.id);
    res.json({ success: true, message: 'Customer portal session created.', data });
  } catch (error) {
    next(error);
  }
};

exports.history = async (req, res, next) => {
  try {
    const data = await billingService.getHistory(req.user.id);
    res.json({ success: true, message: 'Billing history loaded.', data });
  } catch (error) {
    next(error);
  }
};

exports.cancel = async (req, res, next) => {
  try {
    const data = await billingService.cancelSubscription(req.user.id);
    res.json({ success: true, message: 'Subscription cancellation requested.', data });
  } catch (error) {
    next(error);
  }
};
