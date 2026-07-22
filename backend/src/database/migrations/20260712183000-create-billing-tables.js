'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('subscription_plans', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING(80),
        allowNull: false
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      chat_limit: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      live_limit: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      active: {
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

    await queryInterface.createTable('user_subscriptions', {
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
      plan_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'subscription_plans', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      },
      status: {
        type: Sequelize.STRING(40),
        allowNull: false,
        defaultValue: 'active'
      },
      chat_remaining: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      live_remaining: {
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

    await queryInterface.createTable('payments', {
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
      plan_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'subscription_plans', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      provider: {
        type: Sequelize.STRING(40),
        allowNull: false,
        defaultValue: 'stripe'
      },
      status: {
        type: Sequelize.STRING(40),
        allowNull: false,
        defaultValue: 'pending'
      },
      checkout_url: {
        type: Sequelize.TEXT,
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

    await queryInterface.addIndex('subscription_plans', ['active']);
    await queryInterface.addIndex('user_subscriptions', ['user_id', 'status']);
    await queryInterface.addIndex('payments', ['user_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('payments');
    await queryInterface.dropTable('user_subscriptions');
    await queryInterface.dropTable('subscription_plans');
  }
};
