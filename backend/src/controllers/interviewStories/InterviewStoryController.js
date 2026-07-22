const interviewStoryService = require('@src/services/InterviewStoryService');

exports.list = async (req, res, next) => {
  try {
    const data = await interviewStoryService.list(req.user);
    res.json({ success: true, message: 'Interview stories loaded.', data });
  } catch (error) {
    next(error);
  }
};

exports.show = async (req, res, next) => {
  try {
    const data = await interviewStoryService.get(req.user, req.params.visaType);
    res.json({ success: true, message: 'Interview story loaded.', data });
  } catch (error) {
    next(error);
  }
};

exports.startFlow = async (req, res, next) => {
  try {
    const data = await interviewStoryService.startFlow(req.user, req.params.visaType, req.body || {});
    res.json({ success: true, message: 'Story Builder flow started.', data });
  } catch (error) {
    next(error);
  }
};

exports.saveFlowAnswer = async (req, res, next) => {
  try {
    const data = await interviewStoryService.saveFlowAnswer(req.user, req.params.visaType, req.body || {});
    res.json({ success: true, message: 'Story Builder answer saved.', data });
  } catch (error) {
    next(error);
  }
};

exports.reviewFlow = async (req, res, next) => {
  try {
    const data = await interviewStoryService.reviewFlow(req.user, req.params.visaType);
    res.json({ success: true, message: 'Story Builder answers loaded.', data });
  } catch (error) {
    next(error);
  }
};

exports.generate = async (req, res, next) => {
  try {
    const data = await interviewStoryService.generate(req.user, req.params.visaType, req.body || {});
    res.status(201).json({ success: true, message: 'Interview story generated.', data });
  } catch (error) {
    next(error);
  }
};

exports.updateStoryText = async (req, res, next) => {
  try {
    const data = await interviewStoryService.updateStoryText(req.user, req.params.visaType, req.body || {});
    res.json({ success: true, message: 'Interview story updated.', data });
  } catch (error) {
    next(error);
  }
};
