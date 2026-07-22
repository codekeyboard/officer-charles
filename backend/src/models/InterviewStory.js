'use strict';

module.exports = (sequelize, DataTypes) => {
  const InterviewStory = sequelize.define('InterviewStory', {
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
    visaType: {
      type: DataTypes.STRING(40),
      allowNull: false,
      field: 'visa_type'
    },
    answers: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {}
    },
    storyText: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'story_text'
    },
    status: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: 'draft'
    },
    generatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'generated_at'
    }
  }, {
    tableName: 'interview_stories',
    underscored: true
  });

  InterviewStory.associate = (models) => {
    InterviewStory.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  };

  return InterviewStory;
};
