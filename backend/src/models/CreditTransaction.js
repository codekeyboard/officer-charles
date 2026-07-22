'use strict';

module.exports = (sequelize, DataTypes) => {
  const CreditTransaction = sequelize.define('CreditTransaction', {
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
    paymentId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'payment_id'
    },
    interviewId: {
      type: DataTypes.STRING(120),
      allowNull: true,
      field: 'interview_id'
    },
    type: {
      type: DataTypes.STRING(40),
      allowNull: false
    },
    credits: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    balanceAfter: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'balance_after'
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  }, {
    tableName: 'credit_transactions',
    underscored: true
  });

  CreditTransaction.associate = (models) => {
    CreditTransaction.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    CreditTransaction.belongsTo(models.Payment, { foreignKey: 'paymentId', as: 'payment' });
  };

  return CreditTransaction;
};
