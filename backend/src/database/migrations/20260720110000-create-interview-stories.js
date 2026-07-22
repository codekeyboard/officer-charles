'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('interview_stories', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      visa_type: {
        type: Sequelize.STRING(40),
        allowNull: false
      },
      answers: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {}
      },
      story_text: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      status: {
        type: Sequelize.STRING(40),
        allowNull: false,
        defaultValue: 'draft'
      },
      generated_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    await queryInterface.addIndex('interview_stories', ['user_id']);
    await queryInterface.addIndex('interview_stories', ['user_id', 'visa_type'], {
      unique: true,
      name: 'interview_stories_user_id_visa_type_unique'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('interview_stories');
  }
};
