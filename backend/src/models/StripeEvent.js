'use strict';

module.exports = (sequelize, DataTypes) => {
  return sequelize.define('StripeEvent', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    stripeEventId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      field: 'stripe_event_id'
    },
    type: {
      type: DataTypes.STRING(120),
      allowNull: false
    },
    status: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: 'processed'
    },
    payload: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    processedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'processed_at'
    }
  }, {
    tableName: 'stripe_events',
    underscored: true
  });
};
