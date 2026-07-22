'use strict';

const SETTING_KEYS = [
  'trainingMaxRetries',
  'trainingMaxQuestions',
  'simulationMaxQuestions',
  'enableVoiceLive',
  'freeChatTrainingLimit',
  'freeChatSimulationLimit',
  'freeLiveTrainingLimit',
  'freeLiveSimulationLimit',
  'chatTrainingCreditCost',
  'chatSimulationCreditCost',
  'liveTrainingCreditCost',
  'liveSimulationCreditCost',
  'storyBuilderCreditCost'
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    await queryInterface.bulkDelete('app_settings', { key: SETTING_KEYS });
    await queryInterface.bulkInsert('app_settings', [
      { key: 'trainingMaxRetries', value: JSON.stringify(3), created_at: now, updated_at: now },
      { key: 'trainingMaxQuestions', value: JSON.stringify(8), created_at: now, updated_at: now },
      { key: 'simulationMaxQuestions', value: JSON.stringify(10), created_at: now, updated_at: now },
      { key: 'enableVoiceLive', value: JSON.stringify(false), created_at: now, updated_at: now },
      { key: 'freeChatTrainingLimit', value: JSON.stringify(3), created_at: now, updated_at: now },
      { key: 'freeChatSimulationLimit', value: JSON.stringify(1), created_at: now, updated_at: now },
      { key: 'freeLiveTrainingLimit', value: JSON.stringify(1), created_at: now, updated_at: now },
      { key: 'freeLiveSimulationLimit', value: JSON.stringify(1), created_at: now, updated_at: now },
      { key: 'chatTrainingCreditCost', value: JSON.stringify(5), created_at: now, updated_at: now },
      { key: 'chatSimulationCreditCost', value: JSON.stringify(10), created_at: now, updated_at: now },
      { key: 'liveTrainingCreditCost', value: JSON.stringify(15), created_at: now, updated_at: now },
      { key: 'liveSimulationCreditCost', value: JSON.stringify(25), created_at: now, updated_at: now },
      { key: 'storyBuilderCreditCost', value: JSON.stringify(10), created_at: now, updated_at: now }
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('app_settings', { key: SETTING_KEYS });
  }
};
