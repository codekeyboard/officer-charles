'use strict';

module.exports = (sequelize, DataTypes) => {
  const AiEventLog = sequelize.define('AiEventLog', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    sessionId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'session_id'
    },
    interviewId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'interview_id'
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id'
    },
    eventType: {
      type: DataTypes.STRING(120),
      allowNull: false,
      field: 'event_type'
    },
    payload: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  }, {
    tableName: 'ai_event_logs',
    underscored: true
  });

  return AiEventLog;
};
