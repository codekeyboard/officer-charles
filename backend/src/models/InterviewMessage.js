'use strict';

module.exports = (sequelize, DataTypes) => {
  const InterviewMessage = sequelize.define('InterviewMessage', {
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
    role: {
      type: DataTypes.STRING(30),
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    question: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    score: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    feedback: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  }, {
    tableName: 'interview_messages',
    underscored: true
  });

  InterviewMessage.associate = (models) => {
    InterviewMessage.belongsTo(models.Interview, { foreignKey: 'interviewId', as: 'interview' });
    InterviewMessage.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  };

  return InterviewMessage;
};
