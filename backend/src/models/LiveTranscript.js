'use strict';

module.exports = (sequelize, DataTypes) => {
  const LiveTranscript = sequelize.define('LiveTranscript', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    sessionId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'session_id'
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
    speaker: {
      type: DataTypes.STRING(30),
      allowNull: false
    },
    text: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    timestampMs: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'timestamp_ms'
    },
    isFinal: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_final'
    }
  }, {
    tableName: 'live_transcripts',
    underscored: true
  });

  LiveTranscript.associate = (models) => {
    LiveTranscript.belongsTo(models.LiveInterviewSession, { foreignKey: 'sessionId', as: 'session' });
    LiveTranscript.belongsTo(models.Interview, { foreignKey: 'interviewId', as: 'interview' });
    LiveTranscript.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  };

  return LiveTranscript;
};
