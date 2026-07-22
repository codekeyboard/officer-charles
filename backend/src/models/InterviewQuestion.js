'use strict';

module.exports = (sequelize, DataTypes) => {
  return sequelize.define('InterviewQuestion', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    visaType: {
      type: DataTypes.STRING(40),
      allowNull: false,
      field: 'visa_type'
    },
    questionText: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'question_text'
    },
    category: {
      type: DataTypes.STRING(120),
      allowNull: false
    },
    difficulty: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: 'medium'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active'
    }
  }, {
    tableName: 'interview_questions',
    underscored: true
  });
};
