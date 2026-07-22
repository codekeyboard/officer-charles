'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('interviews', 'final_evaluation', {
      type: Sequelize.JSONB,
      allowNull: true
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('interviews', 'final_evaluation');
  }
};
