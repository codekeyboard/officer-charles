'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'email_verified_at', {
      type: Sequelize.DATE,
      allowNull: true
    });

    await queryInterface.createTable('email_verification_codes', {
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
      code_hash: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      purpose: {
        type: Sequelize.STRING(40),
        allowNull: false,
        defaultValue: 'registration'
      },
      attempts: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      consumed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      last_sent_at: {
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

    await queryInterface.addIndex('email_verification_codes', ['user_id', 'purpose']);
    await queryInterface.addIndex('email_verification_codes', ['expires_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('email_verification_codes');
    await queryInterface.removeColumn('users', 'email_verified_at');
  }
};
