const { requireAuth } = require('@src/middlewares/requireAuth');

module.exports = [
  { method: 'GET', path: '/', name: 'index', middleware: requireAuth, handler: 'interviewStories/InterviewStoryController.list' },
  { method: 'GET', path: '/:visaType', name: 'show', middleware: requireAuth, handler: 'interviewStories/InterviewStoryController.show' },
  { method: 'POST', path: '/:visaType/flow/start', name: 'flow.start', middleware: requireAuth, handler: 'interviewStories/InterviewStoryController.startFlow' },
  { method: 'PATCH', path: '/:visaType/flow/answer', name: 'flow.answer', middleware: requireAuth, handler: 'interviewStories/InterviewStoryController.saveFlowAnswer' },
  { method: 'GET', path: '/:visaType/flow/review', name: 'flow.review', middleware: requireAuth, handler: 'interviewStories/InterviewStoryController.reviewFlow' },
  { method: 'POST', path: '/:visaType/generate', name: 'generate', middleware: requireAuth, handler: 'interviewStories/InterviewStoryController.generate' },
  { method: 'PATCH', path: '/:visaType/story', name: 'story.update', middleware: requireAuth, handler: 'interviewStories/InterviewStoryController.updateStoryText' }
];
