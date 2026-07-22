'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('subscription_plans', 'credit_amount', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    });

    await queryInterface.createTable('user_credit_balances', {
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
        onUpdate: 'CASCADE',
        unique: true
      },
      available_credits: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 20
      },
      lifetime_granted_credits: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 20
      },
      lifetime_purchased_credits: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      lifetime_used_credits: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
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

    await queryInterface.createTable('credit_transactions', {
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
      payment_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'payments', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      interview_id: {
        type: Sequelize.STRING(120),
        allowNull: true
      },
      type: {
        type: Sequelize.STRING(40),
        allowNull: false
      },
      credits: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      balance_after: {
        type: Sequelize.INTEGER,
        allowNull: false
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

    await queryInterface.addIndex('credit_transactions', ['user_id']);
    await queryInterface.addIndex('credit_transactions', ['payment_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('credit_transactions');
    await queryInterface.dropTable('user_credit_balances');
    await queryInterface.removeColumn('subscription_plans', 'credit_amount');
  }
};
