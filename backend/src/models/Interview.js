'use strict';

module.exports = (sequelize, DataTypes) => {
  const Interview = sequelize.define('Interview', {
    id: {
      type: DataTypes.STRING(100),
      primaryKey: true,
      allowNull: false
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id'
    },
    interviewType: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'interview_type'
    },
    visaType: {
      type: DataTypes.STRING(40),
      allowNull: false,
      field: 'visa_type'
    },
    mode: {
      type: DataTypes.STRING(40),
      allowNull: false
    },
    status: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: 'ACTIVE'
    },
    currentQuestion: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'current_question'
    },
    finalScore: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'final_score'
    },
    finalFeedback: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'final_feedback'
    },
    strengths: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    weaknesses: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    recommendations: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    finalEvaluation: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'final_evaluation'
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
    tableName: 'interviews',
    underscored: true
  });

  Interview.associate = (models) => {
    Interview.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    Interview.hasMany(models.InterviewMessage, { foreignKey: 'interviewId', as: 'messages' });
    Interview.hasMany(models.UsageLog, { foreignKey: 'interviewId', as: 'usageLogs' });
  };

  return Interview;
};
