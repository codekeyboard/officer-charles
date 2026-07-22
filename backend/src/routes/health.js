module.exports = [
  { method: 'GET', path: '/', name: 'index', handler: 'health/HealthController.index' },
  { method: 'GET', path: '/ai', name: 'ai', handler: 'health/HealthController.ai' }
];
