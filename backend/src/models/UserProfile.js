'use strict';

module.exports = (sequelize, DataTypes) => {
  const UserProfile = sequelize.define('UserProfile', {
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
    displayName: {
      type: DataTypes.STRING(120),
      allowNull: true,
      field: 'display_name'
    },
    avatarUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'avatar_url'
    },
    country: {
      type: DataTypes.STRING(120),
      allowNull: true
    },
    targetVisa: {
      type: DataTypes.STRING(40),
      allowNull: true,
      field: 'target_visa'
    }
  }, {
    tableName: 'user_profiles',
    underscored: true
  });

  UserProfile.associate = (models) => {
    UserProfile.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  };

  return UserProfile;
};
