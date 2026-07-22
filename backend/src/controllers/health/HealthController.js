const config = require('@core/util/functions/config');

exports.index = (_req, res) => {
  res.json({
    success: true,
    message: 'Backend is healthy.',
    data: {
      status: 'ok',
      service: 'officer-charles-backend',
      env: config('env', process.env.NODE_ENV || 'development'),
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }
  });
};

exports.ai = (_req, res) => {
  res.json({
    success: true,
    message: 'AI configuration loaded.',
    data: {
      foundryConfigured: Boolean(config('azure.foundry.projectEndpoint') && config('azure.foundry.agentName')),
      chatModelConfigured: Boolean(config('azure.foundry.agentName')),
      voiceLiveConfigured: Boolean(config('ai.enableVoiceLive') && config('azure.voiceLive.endpoint')),
      speechAvatarConfigured: Boolean(config('azure.speech.endpoint') && config('azure.speech.key')),
      realtimeConfigured: Boolean(config('ai.enableRealtimeWebRtc') && config('azure.openAi.endpoint'))
    }
  });
};
