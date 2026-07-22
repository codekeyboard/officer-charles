'use strict';

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(120),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true
    },
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'password_hash'
    },
    googleId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true,
      field: 'google_id'
    },
    role: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: 'user'
    },
    status: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: 'active'
    },
    stripeCustomerId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true,
      field: 'stripe_customer_id'
    },
    emailVerifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'email_verified_at'
    }
  }, {
    tableName: 'users',
    underscored: true
  });

  User.associate = (models) => {
    User.hasOne(models.UserProfile, { foreignKey: 'userId', as: 'profile' });
    User.hasOne(models.UserUsage, { foreignKey: 'userId', as: 'usage' });
    User.hasOne(models.UserCreditBalance, { foreignKey: 'userId', as: 'creditBalance' });
    User.hasMany(models.InterviewStory, { foreignKey: 'userId', as: 'interviewStories' });
    User.hasMany(models.RefreshToken, { foreignKey: 'userId', as: 'refreshTokens' });
    User.hasMany(models.Notification, { foreignKey: 'userId', as: 'notifications' });
    User.hasMany(models.EmailVerificationCode, { foreignKey: 'userId', as: 'emailVerificationCodes' });
  };

  return User;
};
