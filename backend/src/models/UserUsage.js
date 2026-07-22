'use strict';

module.exports = (sequelize, DataTypes) => {
  const UserUsage = sequelize.define('UserUsage', {
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
    chatInterviewsUsed: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'chat_interviews_used'
    },
    liveInterviewsUsed: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'live_interviews_used'
    },
    chatTrainingUsed: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'chat_training_used'
    },
    chatSimulationUsed: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'chat_simulation_used'
    },
    liveTrainingUsed: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'live_training_used'
    },
    liveSimulationUsed: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'live_simulation_used'
    }
  }, {
    tableName: 'user_usage',
    underscored: true
  });

  UserUsage.associate = (models) => {
    UserUsage.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  };

  return UserUsage;
};
