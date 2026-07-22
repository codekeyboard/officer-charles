const { requireAuth } = require('@src/middlewares/requireAuth');
const { requireAdmin } = require('@src/middlewares/requireAdmin');

module.exports = [
  { method: 'GET', path: '/', name: 'index', handler: 'health/HealthController.index' },
  {
    method: 'GET',
    path: '/ai',
    name: 'ai',
    middleware: [requireAuth, requireAdmin],
    handler: 'health/HealthController.ai'
  }
];
