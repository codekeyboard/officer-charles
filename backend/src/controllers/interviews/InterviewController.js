const interviewService = require('@src/services/InterviewService');
const usersService = require('@src/services/UsersService');

exports.listInterviews = async (req, res, next) => {
  try {
    const data = await usersService.getInterviewHistory(req.user.id, req.query || {});
    res.json({ success: true, message: 'Interviews loaded.', data });
  } catch (error) {
    next(error);
  }
};

exports.startChatInterview = async (req, res, next) => {
  try {
    const data = await interviewService.startChatInterview(req.user, req.body || {});
    res.status(201).json({ success: true, message: 'Chat interview started.', data });
  } catch (error) {
    next(error);
  }
};

exports.sendChatMessage = async (req, res, next) => {
  try {
    const data = await interviewService.sendChatMessage(req.user, req.params.interviewId, req.body?.message);
    res.json({ success: true, message: 'Chat message processed.', data });
  } catch (error) {
    next(error);
  }
};

exports.completeChatInterview = async (req, res, next) => {
  try {
    const data = await interviewService.completeChatInterview(req.user, req.params.interviewId);
    res.json({ success: true, message: 'Chat interview completed.', data });
  } catch (error) {
    next(error);
  }
};

exports.getInterview = async (req, res, next) => {
  try {
    const data = await interviewService.getInterview(req.user, req.params.interviewId);
    res.json({ success: true, message: 'Interview loaded.', data });
  } catch (error) {
    next(error);
  }
};

exports.getMessages = async (req, res, next) => {
  try {
    const data = await interviewService.getMessages(req.user, req.params.interviewId);
    res.json({ success: true, message: 'Interview messages loaded.', data });
  } catch (error) {
    next(error);
  }
};

exports.getEvaluation = async (req, res, next) => {
  try {
    const data = await interviewService.getEvaluation(req.user, req.params.interviewId);
    res.json({ success: true, message: 'Interview evaluation loaded.', data });
  } catch (error) {
    next(error);
  }
};
