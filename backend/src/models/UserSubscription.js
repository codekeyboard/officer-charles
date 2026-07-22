'use strict';

module.exports = (sequelize, DataTypes) => {
  const UserSubscription = sequelize.define('UserSubscription', {
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
      allowNull: false,
      field: 'plan_id'
    },
    status: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: 'active'
    },
    chatRemaining: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'chat_remaining'
    },
    liveRemaining: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'live_remaining'
    },
    stripeSubscriptionId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true,
      field: 'stripe_subscription_id'
    },
    stripeSubscriptionItemId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'stripe_subscription_item_id'
    },
    stripePriceId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'stripe_price_id'
    },
    planKey: {
      type: DataTypes.STRING(40),
      allowNull: true,
      field: 'plan_key'
    },
    currentPeriodStart: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'current_period_start'
    },
    currentPeriodEnd: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'current_period_end'
    },
    cancelAtPeriodEnd: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'cancel_at_period_end'
    },
    canceledAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'canceled_at'
    }
  }, {
    tableName: 'user_subscriptions',
    underscored: true
  });

  UserSubscription.associate = (models) => {
    UserSubscription.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    UserSubscription.belongsTo(models.SubscriptionPlan, { foreignKey: 'planId', as: 'plan' });
    UserSubscription.hasMany(models.SubscriptionUsage, { foreignKey: 'subscriptionId', as: 'usagePeriods' });
  };

  return UserSubscription;
};
