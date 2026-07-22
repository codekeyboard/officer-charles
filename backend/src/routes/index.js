const healthRoutes = require('./health');
const healthV1Routes = require('./healthV1');
const aiRoutes = require('./ai');
const authRoutes = require('./auth');
const usersRoutes = require('./users');
const interviewsRoutes = require('./interviews');
const interviewStoryRoutes = require('./interviewStories');
const liveInterviewRoutes = require('./liveInterviews');
const plansRoutes = require('./plans');
const billingRoutes = require('./billing');
const webhookRoutes = require('./webhooks');
const adminRoutes = require('./admin');

module.exports = [
  { path: '/health', name: 'health.', group: healthRoutes },
  { path: '/api/ai', name: 'ai.', group: aiRoutes },
  { path: '/api/v1/health', name: 'v1.health.', group: healthV1Routes },
  { path: '/api/v1/auth', name: 'v1.auth.', group: authRoutes },
  { path: '/api/v1/users', name: 'v1.users.', group: usersRoutes },
  { path: '/api/v1/interviews', name: 'v1.interviews.', group: interviewsRoutes },
  { path: '/api/v1/interview-stories', name: 'v1.interview-stories.', group: interviewStoryRoutes },
  { path: '/api/v1/live-interviews', name: 'v1.live-interviews.', group: liveInterviewRoutes },
  { path: '/api/v1/plans', name: 'v1.plans.', group: plansRoutes },
  { path: '/api/v1/billing', name: 'v1.billing.', group: billingRoutes },
  { path: '/api/v1/webhooks', name: 'v1.webhooks.', group: webhookRoutes },
  { path: '/api/v1/admin', name: 'v1.admin.', group: adminRoutes },
  { path: '/api/v1/ai', name: 'v1.ai.', group: aiRoutes }
];
