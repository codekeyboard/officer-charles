const { requireAuth } = require('@src/middlewares/requireAuth');

module.exports = [
  { method: 'POST', path: '/start', name: 'start', middleware: requireAuth, handler: 'liveInterviews/LiveInterviewController.start' },
  { method: 'POST', path: '/:sessionId/token', name: 'token', middleware: requireAuth, handler: 'liveInterviews/LiveInterviewController.token' },
  { method: 'POST', path: '/:sessionId/config', name: 'config', middleware: requireAuth, handler: 'liveInterviews/LiveInterviewController.config' },
  { method: 'POST', path: '/:sessionId/transcript', name: 'transcript', middleware: requireAuth, handler: 'liveInterviews/LiveInterviewController.transcript' },
  { method: 'POST', path: '/:sessionId/event', name: 'event', middleware: requireAuth, handler: 'liveInterviews/LiveInterviewController.event' },
  { method: 'POST', path: '/:sessionId/complete', name: 'complete', middleware: requireAuth, handler: 'liveInterviews/LiveInterviewController.complete' },
  { method: 'POST', path: '/:sessionId/abandon', name: 'abandon', middleware: requireAuth, handler: 'liveInterviews/LiveInterviewController.abandon' },
  { method: 'GET', path: '/:sessionId/status', name: 'status', middleware: requireAuth, handler: 'liveInterviews/LiveInterviewController.status' }
];
