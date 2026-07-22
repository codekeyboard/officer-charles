const billingService = require('@src/services/BillingService');

exports.index = async (_req, res, next) => {
  try {
    const data = await billingService.listPlans();
    res.json({ success: true, message: 'Plans loaded.', data });
  } catch (error) {
    next(error);
  }
};
