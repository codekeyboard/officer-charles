const { requireAuth } = require('@src/middlewares/requireAuth');

module.exports = [
  { method: 'GET', path: '/me', name: 'me', middleware: requireAuth, handler: 'users/UsersController.getMe' },
  { method: 'PATCH', path: '/me', name: 'me.update', middleware: requireAuth, handler: 'users/UsersController.updateMe' },
  { method: 'POST', path: '/me/change-password', name: 'me.change-password', middleware: requireAuth, handler: 'users/UsersController.changePassword' },
  { method: 'GET', path: '/me/usage', name: 'me.usage', middleware: requireAuth, handler: 'users/UsersController.getUsage' },
  { method: 'GET', path: '/me/interviews', name: 'me.interviews', middleware: requireAuth, handler: 'users/UsersController.getInterviews' },
  { method: 'GET', path: '/me/notifications', name: 'me.notifications', middleware: requireAuth, handler: 'users/UsersController.getNotifications' },
  { method: 'PATCH', path: '/me/notifications/read-all', name: 'me.notifications.read-all', middleware: requireAuth, handler: 'users/UsersController.markAllNotificationsRead' },
  { method: 'PATCH', path: '/me/notifications/:notificationId/read', name: 'me.notifications.read', middleware: requireAuth, handler: 'users/UsersController.markNotificationRead' }
];
