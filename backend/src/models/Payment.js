'use strict';

module.exports = (sequelize, DataTypes) => {
  const Payment = sequelize.define('Payment', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id'
    },
    planId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'plan_id'
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    provider: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: 'stripe'
    },
    status: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: 'pending'
    },
    checkoutUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'checkout_url'
    },
    stripeCheckoutSessionId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true,
      field: 'stripe_checkout_session_id'
    },
    stripeInvoiceId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'stripe_invoice_id'
    },
    stripePaymentIntentId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'stripe_payment_intent_id'
    },
    paystackReference: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true,
      field: 'paystack_reference'
    },
    paystackAccessCode: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'paystack_access_code'
    },
    paystackTransactionId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'paystack_transaction_id'
    },
    paystackCustomerCode: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'paystack_customer_code'
    },
    currency: {
      type: DataTypes.STRING(12),
      allowNull: false,
      defaultValue: 'usd'
    },
    amountCents: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'amount_cents'
    },
    failureReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'failure_reason'
    },
    paidAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'paid_at'
    }
  }, {
    tableName: 'payments',
    underscored: true
  });

  Payment.associate = (models) => {
    Payment.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    Payment.belongsTo(models.SubscriptionPlan, { foreignKey: 'planId', as: 'plan' });
  };

  return Payment;
};
