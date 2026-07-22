'use strict';

module.exports = (sequelize, DataTypes) => {
  const SubscriptionUsage = sequelize.define('SubscriptionUsage', {
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
    subscriptionId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'subscription_id'
    },
    planKey: {
      type: DataTypes.STRING(40),
      allowNull: false,
      field: 'plan_key'
    },
    periodStart: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'period_start'
    },
    periodEnd: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'period_end'
    },
    chatLimit: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'chat_limit'
    },
    liveLimit: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'live_limit'
    },
    chatUsed: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'chat_used'
    },
    liveUsed: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'live_used'
    }
  }, {
    tableName: 'subscription_usage',
    underscored: true
  });

  SubscriptionUsage.associate = (models) => {
    SubscriptionUsage.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    SubscriptionUsage.belongsTo(models.UserSubscription, { foreignKey: 'subscriptionId', as: 'subscription' });
  };

  return SubscriptionUsage;
};
