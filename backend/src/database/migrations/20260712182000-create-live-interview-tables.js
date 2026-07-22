'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('live_interview_sessions', {
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
      provider: {
        type: Sequelize.STRING(40),
        allowNull: false
      },
      status: {
        type: Sequelize.STRING(40),
        allowNull: false,
        defaultValue: 'active'
      },
      connection_status: {
        type: Sequelize.STRING(40),
        allowNull: false,
        defaultValue: 'created'
      },
      connection_info: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      session_config: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      enable_avatar: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      expires_at: {
        type: Sequelize.DATE,
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

    await queryInterface.createTable('live_transcripts', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      session_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'live_interview_sessions', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
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
      speaker: {
        type: Sequelize.STRING(30),
        allowNull: false
      },
      text: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      timestamp_ms: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      is_final: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
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

    await queryInterface.createTable('ai_event_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      session_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'live_interview_sessions', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      interview_id: {
        type: Sequelize.STRING(100),
        allowNull: true,
        references: { model: 'interviews', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      event_type: {
        type: Sequelize.STRING(120),
        allowNull: false
      },
      payload: {
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

    await queryInterface.addIndex('live_interview_sessions', ['interview_id']);
    await queryInterface.addIndex('live_interview_sessions', ['user_id']);
    await queryInterface.addIndex('live_transcripts', ['session_id', 'created_at']);
    await queryInterface.addIndex('ai_event_logs', ['session_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('ai_event_logs');
    await queryInterface.dropTable('live_transcripts');
    await queryInterface.dropTable('live_interview_sessions');
  }
};
