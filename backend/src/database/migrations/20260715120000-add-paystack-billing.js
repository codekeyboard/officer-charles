'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('payments', 'paystack_reference', {
      type: Sequelize.STRING(255),
      allowNull: true,
      unique: true
    });
    await queryInterface.addColumn('payments', 'paystack_access_code', {
      type: Sequelize.STRING(255),
      allowNull: true
    });
    await queryInterface.addColumn('payments', 'paystack_transaction_id', {
      type: Sequelize.STRING(255),
      allowNull: true
    });
    await queryInterface.addColumn('payments', 'paystack_customer_code', {
      type: Sequelize.STRING(255),
      allowNull: true
    });
    await queryInterface.addColumn('payments', 'paid_at', {
      type: Sequelize.DATE,
      allowNull: true
    });

    await queryInterface.createTable('paystack_events', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      paystack_event_key: {
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

    await queryInterface.addIndex('payments', ['paystack_reference']);
    await queryInterface.addIndex('payments', ['paystack_transaction_id']);
    await queryInterface.addIndex('paystack_events', ['paystack_event_key']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('paystack_events');
    await queryInterface.removeColumn('payments', 'paid_at');
    await queryInterface.removeColumn('payments', 'paystack_customer_code');
    await queryInterface.removeColumn('payments', 'paystack_transaction_id');
    await queryInterface.removeColumn('payments', 'paystack_access_code');
    await queryInterface.removeColumn('payments', 'paystack_reference');
  }
};
