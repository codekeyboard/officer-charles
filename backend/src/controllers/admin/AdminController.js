const adminService = require('@src/services/AdminService');

exports.dashboard = async (_req, res, next) => respond(res, next, 'Admin dashboard loaded.', () => adminService.dashboard());
exports.users = async (req, res, next) => respond(res, next, 'Admin users loaded.', () => adminService.listUsers(req.query));
exports.user = async (req, res, next) => respond(res, next, 'Admin user loaded.', () => adminService.getUser(req.params.userId));
exports.updateUserStatus = async (req, res, next) => respond(res, next, 'User status updated.', () => adminService.updateUserStatus(req.params.userId, req.body?.status));
exports.interviews = async (req, res, next) => respond(res, next, 'Admin interviews loaded.', () => adminService.listInterviews(req.query));
exports.interview = async (req, res, next) => respond(res, next, 'Admin interview loaded.', () => adminService.getInterview(req.params.interviewId));
exports.subscriptions = async (_req, res, next) => respond(res, next, 'Admin subscriptions loaded.', () => adminService.listSubscriptions());
exports.payments = async (req, res, next) => respond(res, next, 'Admin payments loaded.', () => adminService.listPayments(req.query));
exports.revenue = async (_req, res, next) => respond(res, next, 'Admin revenue loaded.', () => adminService.revenue());
exports.aiUsage = async (_req, res, next) => respond(res, next, 'Admin AI usage loaded.', () => adminService.aiUsage());
exports.settings = async (_req, res, next) => respond(res, next, 'Admin settings loaded.', () => adminService.getSettings());
exports.updateSettings = async (req, res, next) => respond(res, next, 'Admin settings updated.', () => adminService.updateSettings(req.body || {}));
exports.questionBank = async (req, res, next) => respond(res, next, 'Question bank loaded.', () => adminService.listQuestions(req.query));
exports.createQuestion = async (req, res, next) => respond(res, next, 'Question created.', () => adminService.createQuestion(req.body || {}), 201);
exports.updateQuestion = async (req, res, next) => respond(res, next, 'Question updated.', () => adminService.updateQuestion(req.params.questionId, req.body || {}));
exports.deleteQuestion = async (req, res, next) => respond(res, next, 'Question disabled.', () => adminService.deleteQuestion(req.params.questionId));

async function respond(res, next, message, fn, status = 200) {
  try {
    const data = await fn();
    res.status(status).json({ success: true, message, data });
  } catch (error) {
    next(error);
  }
}
