'use strict';

module.exports = (sequelize, DataTypes) => {
  const UserCreditBalance = sequelize.define('UserCreditBalance', {
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
    availableCredits: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 20,
      field: 'available_credits'
    },
    lifetimeGrantedCredits: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 20,
      field: 'lifetime_granted_credits'
    },
    lifetimePurchasedCredits: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'lifetime_purchased_credits'
    },
    lifetimeUsedCredits: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'lifetime_used_credits'
    }
  }, {
    tableName: 'user_credit_balances',
    underscored: true
  });

  UserCreditBalance.associate = (models) => {
    UserCreditBalance.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  };

  return UserCreditBalance;
};
