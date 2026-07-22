const { requireAuth } = require('@src/middlewares/requireAuth');
const { requireAdmin } = require('@src/middlewares/requireAdmin');
const { auditLog } = require('@src/middlewares/auditLog');

const admin = [requireAuth, requireAdmin];

module.exports = [
  { method: 'GET', path: '/dashboard', name: 'dashboard', middleware: [...admin, auditLog('admin.dashboard')], handler: 'admin/AdminController.dashboard' },
  { method: 'GET', path: '/users', name: 'users', middleware: [...admin, auditLog('admin.users.list')], handler: 'admin/AdminController.users' },
  { method: 'GET', path: '/users/:userId', name: 'users.show', middleware: [...admin, auditLog('admin.users.show')], handler: 'admin/AdminController.user' },
  { method: 'PATCH', path: '/users/:userId/status', name: 'users.status', middleware: [...admin, auditLog('admin.users.status')], handler: 'admin/AdminController.updateUserStatus' },
  { method: 'GET', path: '/interviews', name: 'interviews', middleware: [...admin, auditLog('admin.interviews.list')], handler: 'admin/AdminController.interviews' },
  { method: 'GET', path: '/interviews/:interviewId', name: 'interviews.show', middleware: [...admin, auditLog('admin.interviews.show')], handler: 'admin/AdminController.interview' },
  { method: 'GET', path: '/subscriptions', name: 'subscriptions', middleware: [...admin, auditLog('admin.subscriptions')], handler: 'admin/AdminController.subscriptions' },
  { method: 'GET', path: '/payments', name: 'payments', middleware: [...admin, auditLog('admin.payments')], handler: 'admin/AdminController.payments' },
  { method: 'GET', path: '/revenue', name: 'revenue', middleware: [...admin, auditLog('admin.revenue')], handler: 'admin/AdminController.revenue' },
  { method: 'GET', path: '/ai-usage', name: 'ai-usage', middleware: [...admin, auditLog('admin.ai-usage')], handler: 'admin/AdminController.aiUsage' },
  { method: 'GET', path: '/settings', name: 'settings', middleware: [...admin, auditLog('admin.settings')], handler: 'admin/AdminController.settings' },
  { method: 'PATCH', path: '/settings', name: 'settings.update', middleware: [...admin, auditLog('admin.settings.update')], handler: 'admin/AdminController.updateSettings' },
  { method: 'GET', path: '/question-bank', name: 'question-bank', middleware: [...admin, auditLog('admin.question-bank')], handler: 'admin/AdminController.questionBank' },
  { method: 'POST', path: '/question-bank', name: 'question-bank.create', middleware: [...admin, auditLog('admin.question-bank.create')], handler: 'admin/AdminController.createQuestion' },
  { method: 'PATCH', path: '/question-bank/:questionId', name: 'question-bank.update', middleware: [...admin, auditLog('admin.question-bank.update')], handler: 'admin/AdminController.updateQuestion' },
  { method: 'DELETE', path: '/question-bank/:questionId', name: 'question-bank.delete', middleware: [...admin, auditLog('admin.question-bank.delete')], handler: 'admin/AdminController.deleteQuestion' }
];
