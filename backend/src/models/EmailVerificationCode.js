'use strict';

module.exports = (sequelize, DataTypes) => {
  const EmailVerificationCode = sequelize.define('EmailVerificationCode', {
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
    codeHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'code_hash'
    },
    purpose: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: 'registration'
    },
    attempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'expires_at'
    },
    consumedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'consumed_at'
    },
    lastSentAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_sent_at'
    }
  }, {
    tableName: 'email_verification_codes',
    underscored: true
  });

  EmailVerificationCode.associate = (models) => {
    EmailVerificationCode.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  };

  return EmailVerificationCode;
};
