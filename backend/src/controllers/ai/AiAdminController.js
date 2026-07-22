const aiAdminService = require('@src/services/AiAdminService');

exports.testChat = async (req, res, next) => {
  try {
    const data = await aiAdminService.testChat(req.body?.message);
    res.json({ success: true, message: 'AI chat test completed.', data });
  } catch (error) {
    next(error);
  }
};

exports.testFoundryAgent = async (req, res, next) => {
  try {
    const data = await aiAdminService.testFoundryAgent(req.body?.message);
    res.json({ success: true, message: 'Interview agent test completed.', data });
  } catch (error) {
    next(error);
  }
};

exports.voiceLiveConfig = (req, res, next) => {
  try {
    const data = aiAdminService.getVoiceLiveTestConfig();
    res.json({ success: true, message: 'Live voice config generated.', data });
  } catch (error) {
    next(error);
  }
};

exports.testVoiceLive = async (req, res, next) => {
  try {
    const data = await aiAdminService.testVoiceLiveConnection();
    res.json({ success: true, message: 'Live voice connection test completed.', data });
  } catch (error) {
    next(error);
  }
};

exports.realtimeConfig = (req, res, next) => {
  try {
    const data = aiAdminService.getRealtimeTestConfig();
    res.json({ success: true, message: 'Realtime config generated.', data });
  } catch (error) {
    next(error);
  }
};

exports.endpointCatalog = (req, res, next) => {
  try {
    const data = aiAdminService.getEndpointCatalog();
    res.json({ success: true, message: 'Endpoint catalog loaded.', data });
  } catch (error) {
    next(error);
  }
};

exports.avatarConfig = (req, res, next) => {
  try {
    const data = aiAdminService.getAvatarConfig();
    res.json({ success: true, message: 'Speech avatar config loaded.', data });
  } catch (error) {
    next(error);
  }
};

exports.testAvatar = async (req, res, next) => {
  try {
    const data = await aiAdminService.testAvatarConnection();
    res.json({ success: true, message: 'Speech avatar connection test completed.', data });
  } catch (error) {
    next(error);
  }
};

exports.submitAvatarBatch = async (req, res, next) => {
  try {
    const data = await aiAdminService.submitAvatarBatch(req.body || {});
    res.json({ success: true, message: 'Speech avatar batch job submitted.', data });
  } catch (error) {
    next(error);
  }
};

exports.getAvatarBatch = async (req, res, next) => {
  try {
    const data = await aiAdminService.getAvatarBatch(req.params.jobId);
    res.json({ success: true, message: 'Speech avatar batch job loaded.', data });
  } catch (error) {
    next(error);
  }
};
