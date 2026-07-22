'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('admin_audit_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      admin_user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      action: {
        type: Sequelize.STRING(120),
        allowNull: false
      },
      method: {
        type: Sequelize.STRING(12),
        allowNull: true
      },
      path: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      status_code: {
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

    await queryInterface.createTable('app_settings', {
      key: {
        type: Sequelize.STRING(120),
        primaryKey: true,
        allowNull: false
      },
      value: {
        type: Sequelize.JSONB,
        allowNull: false
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

    await queryInterface.createTable('interview_questions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      visa_type: {
        type: Sequelize.STRING(40),
        allowNull: false
      },
      question_text: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      category: {
        type: Sequelize.STRING(120),
        allowNull: false
      },
      difficulty: {
        type: Sequelize.STRING(40),
        allowNull: false,
        defaultValue: 'medium'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
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

    await queryInterface.addIndex('admin_audit_logs', ['admin_user_id']);
    await queryInterface.addIndex('interview_questions', ['visa_type', 'is_active']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('interview_questions');
    await queryInterface.dropTable('app_settings');
    await queryInterface.dropTable('admin_audit_logs');
  }
};
