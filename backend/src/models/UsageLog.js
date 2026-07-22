'use strict';

module.exports = (sequelize, DataTypes) => {
  const UsageLog = sequelize.define('UsageLog', {
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
    interviewId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'interview_id'
    },
    eventType: {
      type: DataTypes.STRING(60),
      allowNull: false,
      field: 'event_type'
    },
    provider: {
      type: DataTypes.STRING(60),
      allowNull: true
    },
    inputTokens: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'input_tokens'
    },
    outputTokens: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'output_tokens'
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  }, {
    tableName: 'usage_logs',
    underscored: true
  });

  UsageLog.associate = (models) => {
    UsageLog.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    UsageLog.belongsTo(models.Interview, { foreignKey: 'interviewId', as: 'interview' });
  };

  return UsageLog;
};
