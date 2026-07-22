const webhookService = require('@src/services/WebhookService');

exports.stripe = async (req, res, next) => {
  try {
    const data = await webhookService.handleStripe({
      rawBody: req.body,
      signature: req.headers['stripe-signature']
    });
    res.json({ success: true, message: 'Stripe webhook received.', data });
  } catch (error) {
    next(error);
  }
};

exports.paypal = async (req, res, next) => {
  try {
    const data = await webhookService.handlePaypal({
      rawBody: req.body,
      signature: req.headers['paypal-signature'] || req.headers['x-paypal-signature']
    });
    res.json({ success: true, message: 'PayPal webhook received.', data });
  } catch (error) {
    next(error);
  }
};

exports.paystack = async (req, res, next) => {
  try {
    const data = await webhookService.handlePaystack({
      rawBody: req.body,
      signature: req.headers['x-paystack-signature']
    });
    res.json({ success: true, message: 'Paystack webhook received.', data });
  } catch (error) {
    next(error);
  }
};
