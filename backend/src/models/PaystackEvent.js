'use strict';

module.exports = (sequelize, DataTypes) => {
  return sequelize.define('PaystackEvent', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    paystackEventKey: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      field: 'paystack_event_key'
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
    tableName: 'paystack_events',
    underscored: true
  });
};
