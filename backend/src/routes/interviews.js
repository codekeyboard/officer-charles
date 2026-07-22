const { requireAuth } = require('@src/middlewares/requireAuth');

module.exports = [
  {
    method: 'GET',
    path: '/',
    name: 'index',
    middleware: requireAuth,
    handler: 'interviews/InterviewController.listInterviews'
  },
  {
    method: 'POST',
    path: '/chat/start',
    name: 'chat.start',
    middleware: requireAuth,
    handler: 'interviews/InterviewController.startChatInterview'
  },
  {
    method: 'POST',
    path: '/chat/:interviewId/message',
    name: 'chat.message',
    middleware: requireAuth,
    handler: 'interviews/InterviewController.sendChatMessage'
  },
  {
    method: 'POST',
    path: '/chat/:interviewId/complete',
    name: 'chat.complete',
    middleware: requireAuth,
    handler: 'interviews/InterviewController.completeChatInterview'
  },
  { method: 'GET', path: '/:interviewId', name: 'show', middleware: requireAuth, handler: 'interviews/InterviewController.getInterview' },
  { method: 'GET', path: '/:interviewId/messages', name: 'messages', middleware: requireAuth, handler: 'interviews/InterviewController.getMessages' },
  { method: 'GET', path: '/:interviewId/evaluation', name: 'evaluation', middleware: requireAuth, handler: 'interviews/InterviewController.getEvaluation' }
];
