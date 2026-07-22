const { requireAuth } = require('@src/middlewares/requireAuth');

module.exports = [
  { method: 'POST', path: '/register', name: 'register', handler: 'auth/AuthController.register' },
  { method: 'POST', path: '/register/verify', name: 'register.verify', handler: 'auth/AuthController.verifyRegistration' },
  { method: 'POST', path: '/register/resend', name: 'register.resend', handler: 'auth/AuthController.resendRegistrationCode' },
  { method: 'POST', path: '/login', name: 'login', handler: 'auth/AuthController.login' },
  { method: 'GET', path: '/google', name: 'google', handler: 'auth/AuthController.google' },
  { method: 'GET', path: '/google/callback', name: 'google.callback', handler: 'auth/AuthController.googleCallback' },
  { method: 'POST', path: '/refresh', name: 'refresh', handler: 'auth/AuthController.refresh' },
  { method: 'POST', path: '/logout', name: 'logout', middleware: requireAuth, handler: 'auth/AuthController.logout' },
  { method: 'GET', path: '/me', name: 'me', middleware: requireAuth, handler: 'auth/AuthController.me' }
];
