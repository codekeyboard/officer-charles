'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'stripe_customer_id', {
      type: Sequelize.STRING(255),
      allowNull: true,
      unique: true
    });

    await queryInterface.addColumn('subscription_plans', 'key', {
      type: Sequelize.STRING(40),
      allowNull: true,
      unique: true
    });
    await queryInterface.addColumn('subscription_plans', 'price_cents', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    });
    await queryInterface.addColumn('subscription_plans', 'currency', {
      type: Sequelize.STRING(12),
      allowNull: false,
      defaultValue: 'usd'
    });
    await queryInterface.addColumn('subscription_plans', 'billing_interval', {
      type: Sequelize.STRING(30),
      allowNull: false,
      defaultValue: 'month'
    });
    await queryInterface.addColumn('subscription_plans', 'stripe_price_id', {
      type: Sequelize.STRING(255),
      allowNull: true
    });

    await queryInterface.addColumn('user_subscriptions', 'stripe_subscription_id', {
      type: Sequelize.STRING(255),
      allowNull: true,
      unique: true
    });
    await queryInterface.addColumn('user_subscriptions', 'stripe_subscription_item_id', {
      type: Sequelize.STRING(255),
      allowNull: true
    });
    await queryInterface.addColumn('user_subscriptions', 'stripe_price_id', {
      type: Sequelize.STRING(255),
      allowNull: true
    });
    await queryInterface.addColumn('user_subscriptions', 'plan_key', {
      type: Sequelize.STRING(40),
      allowNull: true
    });
    await queryInterface.addColumn('user_subscriptions', 'current_period_start', {
      type: Sequelize.DATE,
      allowNull: true
    });
    await queryInterface.addColumn('user_subscriptions', 'current_period_end', {
      type: Sequelize.DATE,
      allowNull: true
    });
    await queryInterface.addColumn('user_subscriptions', 'cancel_at_period_end', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
    await queryInterface.addColumn('user_subscriptions', 'canceled_at', {
      type: Sequelize.DATE,
      allowNull: true
    });

    await queryInterface.addColumn('payments', 'stripe_checkout_session_id', {
      type: Sequelize.STRING(255),
      allowNull: true,
      unique: true
    });
    await queryInterface.addColumn('payments', 'stripe_invoice_id', {
      type: Sequelize.STRING(255),
      allowNull: true
    });
    await queryInterface.addColumn('payments', 'stripe_payment_intent_id', {
      type: Sequelize.STRING(255),
      allowNull: true
    });
    await queryInterface.addColumn('payments', 'currency', {
      type: Sequelize.STRING(12),
      allowNull: false,
      defaultValue: 'usd'
    });
    await queryInterface.addColumn('payments', 'amount_cents', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    });
    await queryInterface.addColumn('payments', 'failure_reason', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    await queryInterface.addColumn('user_usage', 'chat_training_used', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    });
    await queryInterface.addColumn('user_usage', 'chat_simulation_used', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    });
    await queryInterface.addColumn('user_usage', 'live_training_used', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    });
    await queryInterface.addColumn('user_usage', 'live_simulation_used', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    });

    await queryInterface.createTable('stripe_events', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      stripe_event_id: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true
      },
      type: {
        type: Sequelize.STRING(120),
        allowNull: false
      },
      status: {
        type: Sequelize.STRING(40),
        allowNull: false,
        defaultValue: 'processed'
      },
      payload: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      processed_at: {
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

    await queryInterface.createTable('subscription_usage', {
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
      subscription_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'user_subscriptions', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      plan_key: {
        type: Sequelize.STRING(40),
        allowNull: false
      },
      period_start: {
        type: Sequelize.DATE,
        allowNull: false
      },
      period_end: {
        type: Sequelize.DATE,
        allowNull: false
      },
      chat_limit: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      live_limit: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      chat_used: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      live_used: {
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

    await queryInterface.addIndex('users', ['stripe_customer_id']);
    await queryInterface.addIndex('subscription_plans', ['key']);
    await queryInterface.addIndex('subscription_plans', ['stripe_price_id']);
    await queryInterface.addIndex('user_subscriptions', ['stripe_subscription_id']);
    await queryInterface.addIndex('user_subscriptions', ['user_id', 'plan_key']);
    await queryInterface.addIndex('payments', ['stripe_checkout_session_id']);
    await queryInterface.addIndex('payments', ['stripe_invoice_id']);
    await queryInterface.addIndex('stripe_events', ['stripe_event_id']);
    await queryInterface.addIndex('subscription_usage', ['user_id', 'period_start', 'period_end'], { unique: true });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('subscription_usage');
    await queryInterface.dropTable('stripe_events');

    await queryInterface.removeColumn('user_usage', 'live_simulation_used');
    await queryInterface.removeColumn('user_usage', 'live_training_used');
    await queryInterface.removeColumn('user_usage', 'chat_simulation_used');
    await queryInterface.removeColumn('user_usage', 'chat_training_used');

    await queryInterface.removeColumn('payments', 'failure_reason');
    await queryInterface.removeColumn('payments', 'amount_cents');
    await queryInterface.removeColumn('payments', 'currency');
    await queryInterface.removeColumn('payments', 'stripe_payment_intent_id');
    await queryInterface.removeColumn('payments', 'stripe_invoice_id');
    await queryInterface.removeColumn('payments', 'stripe_checkout_session_id');

    await queryInterface.removeColumn('user_subscriptions', 'canceled_at');
    await queryInterface.removeColumn('user_subscriptions', 'cancel_at_period_end');
    await queryInterface.removeColumn('user_subscriptions', 'current_period_end');
    await queryInterface.removeColumn('user_subscriptions', 'current_period_start');
    await queryInterface.removeColumn('user_subscriptions', 'plan_key');
    await queryInterface.removeColumn('user_subscriptions', 'stripe_price_id');
    await queryInterface.removeColumn('user_subscriptions', 'stripe_subscription_item_id');
    await queryInterface.removeColumn('user_subscriptions', 'stripe_subscription_id');

    await queryInterface.removeColumn('subscription_plans', 'stripe_price_id');
    await queryInterface.removeColumn('subscription_plans', 'billing_interval');
    await queryInterface.removeColumn('subscription_plans', 'currency');
    await queryInterface.removeColumn('subscription_plans', 'price_cents');
    await queryInterface.removeColumn('subscription_plans', 'key');
    await queryInterface.removeColumn('users', 'stripe_customer_id');
  }
};
