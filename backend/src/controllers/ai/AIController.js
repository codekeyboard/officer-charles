const aiService = require('@src/services/AIService');
const AppErrorModule = require('@src/utils/classes/AppError');

const AppError = AppErrorModule.default || AppErrorModule.AppError;

exports.startChatInterview = async (req, res, next) => {
  try {
    const data = await aiService.startChatInterview(req.user, req.body);
    res.status(201).json({ success: true, message: 'Chat interview started.', data });
  } catch (error) {
    next(normalizeError(error));
  }
};

exports.sendChatMessage = async (req, res, next) => {
  try {
    const data = await aiService.sendChatInterviewMessage(req.user, req.params.interviewId, req.body.message);
    res.status(200).json({ success: true, message: 'Chat message processed.', data });
  } catch (error) {
    next(normalizeError(error));
  }
};

exports.completeChatInterview = async (req, res, next) => {
  try {
    const data = await aiService.completeChatInterview(req.user, req.params.interviewId);
    res.status(200).json({ success: true, message: 'Chat interview completed.', data });
  } catch (error) {
    next(normalizeError(error));
  }
};

function normalizeError(error) {
  if (error instanceof AppError) return error;
  return error;
}
