'use strict';

module.exports = (sequelize, DataTypes) => {
  return sequelize.define('SubscriptionPlan', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(80),
      allowNull: false
    },
    key: {
      type: DataTypes.STRING(40),
      allowNull: true,
      unique: true
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    priceCents: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'price_cents'
    },
    currency: {
      type: DataTypes.STRING(12),
      allowNull: false,
      defaultValue: 'usd'
    },
    billingInterval: {
      type: DataTypes.STRING(30),
      allowNull: true,
      defaultValue: null,
      field: 'billing_interval'
    },
    creditAmount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'credit_amount'
    },
    stripePriceId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'stripe_price_id'
    },
    chatLimit: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'chat_limit'
    },
    liveLimit: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'live_limit'
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'subscription_plans',
    underscored: true
  });
};
