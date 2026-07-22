'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('interviews', {
      id: {
        type: Sequelize.STRING(100),
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
      interview_type: {
        type: Sequelize.STRING(20),
        allowNull: false
      },
      visa_type: {
        type: Sequelize.STRING(40),
        allowNull: false
      },
      mode: {
        type: Sequelize.STRING(40),
        allowNull: false
      },
      status: {
        type: Sequelize.STRING(40),
        allowNull: false,
        defaultValue: 'ACTIVE'
      },
      current_question: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      final_score: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      final_feedback: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      strengths: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      weaknesses: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      recommendations: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      started_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      },
      ended_at: {
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

    await queryInterface.createTable('interview_messages', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      interview_id: {
        type: Sequelize.STRING(100),
        allowNull: false,
        references: { model: 'interviews', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      role: {
        type: Sequelize.STRING(30),
        allowNull: false
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      question: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      score: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      feedback: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSONB,
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

    await queryInterface.createTable('usage_logs', {
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
      interview_id: {
        type: Sequelize.STRING(100),
        allowNull: true,
        references: { model: 'interviews', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      event_type: {
        type: Sequelize.STRING(60),
        allowNull: false
      },
      provider: {
        type: Sequelize.STRING(60),
        allowNull: true
      },
      input_tokens: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      output_tokens: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSONB,
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

    await queryInterface.addIndex('interviews', ['user_id']);
    await queryInterface.addIndex('interviews', ['status']);
    await queryInterface.addIndex('interview_messages', ['interview_id', 'created_at']);
    await queryInterface.addIndex('usage_logs', ['user_id']);
    await queryInterface.addIndex('usage_logs', ['interview_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('usage_logs');
    await queryInterface.dropTable('interview_messages');
    await queryInterface.dropTable('interviews');
  }
};
