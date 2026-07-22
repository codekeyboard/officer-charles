'use strict';

module.exports = (sequelize, DataTypes) => {
  const LiveInterviewSession = sequelize.define('LiveInterviewSession', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    interviewId: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'interview_id'
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id'
    },
    provider: {
      type: DataTypes.STRING(40),
      allowNull: false
    },
    status: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: 'active'
    },
    connectionStatus: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: 'created',
      field: 'connection_status'
    },
    connectionInfo: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'connection_info'
    },
    sessionConfig: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'session_config'
    },
    enableAvatar: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'enable_avatar'
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'expires_at'
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'started_at'
    },
    endedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'ended_at'
    }
  }, {
    tableName: 'live_interview_sessions',
    underscored: true
  });

  LiveInterviewSession.associate = (models) => {
    LiveInterviewSession.belongsTo(models.Interview, { foreignKey: 'interviewId', as: 'interview' });
    LiveInterviewSession.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    LiveInterviewSession.hasMany(models.LiveTranscript, { foreignKey: 'sessionId', as: 'transcripts' });
  };

  return LiveInterviewSession;
};
