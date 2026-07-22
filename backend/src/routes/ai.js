const { requireAuth } = require('@src/middlewares/requireAuth');
const { requireAdmin } = require('@src/middlewares/requireAdmin');
const { rateLimitAI } = require('@src/middlewares/rateLimitAI');
const { validateRequest } = require('@src/middlewares/validateRequest');

module.exports = [
  {
    method: 'POST',
    path: '/chat/test',
    name: 'chat.test',
    middleware: [requireAuth, requireAdmin],
    handler: 'ai/AiAdminController.testChat'
  },
  {
    method: 'POST',
    path: '/foundry-agent/test',
    name: 'foundry.test',
    middleware: [requireAuth, requireAdmin],
    handler: 'ai/AiAdminController.testFoundryAgent'
  },
  {
    method: 'POST',
    path: '/voice-live/test-config',
    name: 'voice-live.test-config',
    middleware: [requireAuth, requireAdmin],
    handler: 'ai/AiAdminController.voiceLiveConfig'
  },
  {
    method: 'POST',
    path: '/voice-live/test',
    name: 'voice-live.test',
    middleware: [requireAuth, requireAdmin],
    handler: 'ai/AiAdminController.testVoiceLive'
  },
  {
    method: 'POST',
    path: '/realtime/test-config',
    name: 'realtime.test-config',
    middleware: [requireAuth, requireAdmin],
    handler: 'ai/AiAdminController.realtimeConfig'
  },
  {
    method: 'GET',
    path: '/endpoints',
    name: 'endpoints',
    middleware: [requireAuth, requireAdmin],
    handler: 'ai/AiAdminController.endpointCatalog'
  },
  {
    method: 'GET',
    path: '/avatar/config',
    name: 'avatar.config',
    middleware: [requireAuth, requireAdmin],
    handler: 'ai/AiAdminController.avatarConfig'
  },
  {
    method: 'POST',
    path: '/avatar/test',
    name: 'avatar.test',
    middleware: [requireAuth, requireAdmin],
    handler: 'ai/AiAdminController.testAvatar'
  },
  {
    method: 'POST',
    path: '/avatar/batch',
    name: 'avatar.batch.submit',
    middleware: [requireAuth, requireAdmin],
    handler: 'ai/AiAdminController.submitAvatarBatch'
  },
  {
    method: 'GET',
    path: '/avatar/batch/:jobId',
    name: 'avatar.batch.show',
    middleware: [requireAuth, requireAdmin],
    handler: 'ai/AiAdminController.getAvatarBatch'
  },
  {
    method: 'POST',
    path: '/chat/start',
    name: 'chat.start',
    middleware: [requireAuth, rateLimitAI(), validateRequest('startChatInterview')],
    handler: 'ai/AIController.startChatInterview'
  },
  {
    method: 'POST',
    path: '/chat/:interviewId/message',
    name: 'chat.message',
    middleware: [requireAuth, rateLimitAI(), validateRequest('sendChatMessage')],
    handler: 'ai/AIController.sendChatMessage'
  },
  {
    method: 'POST',
    path: '/chat/:interviewId/complete',
    name: 'chat.complete',
    middleware: [requireAuth, rateLimitAI(), validateRequest('completeChatInterview')],
    handler: 'ai/AIController.completeChatInterview'
  }
];
