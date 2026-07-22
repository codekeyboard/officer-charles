const ChatInterviewAgentModule = require('@src/utils/classes/ChatInterviewAgent');
const FoundryResponsesClientModule = require('@src/utils/classes/FoundryResponsesClient');
const LiveInterviewAgentModule = require('@src/utils/classes/LiveInterviewAgent');
const QuotaCheckerModule = require('@src/utils/classes/QuotaChecker');
const LoggerModule = require('@src/utils/classes/Logger');
const AppErrorModule = require('@src/utils/classes/AppError');
const config = require('@src/config/env.config');

const ChatInterviewAgent = ChatInterviewAgentModule.default || ChatInterviewAgentModule.ChatInterviewAgent;
const FoundryResponsesClient = FoundryResponsesClientModule.default || FoundryResponsesClientModule.FoundryResponsesClient;
const LiveInterviewAgent = LiveInterviewAgentModule.default || LiveInterviewAgentModule.LiveInterviewAgent;
const QuotaChecker = QuotaCheckerModule.default || QuotaCheckerModule.QuotaChecker;
const Logger = LoggerModule.default || LoggerModule.Logger;
const AppError = AppErrorModule.default || AppErrorModule.AppError;
const { ERROR_CODES } = AppErrorModule;

class AIService {
  constructor({
    quotaChecker = new QuotaChecker({
      freeChatLimit: config.limits.freeChatInterviewLimit,
      freeLiveLimit: config.limits.freeLiveInterviewLimit,
      paidChatLimit: 1000,
      paidLiveLimit: 250
    }),
    chatInterviewAgent = new ChatInterviewAgent({
      aiClient: new FoundryResponsesClient(),
      quotaChecker
    }),
    liveInterviewAgent = new LiveInterviewAgent({
      quotaChecker
    }),
    logger = new Logger()
  } = {}) {
    this.chatInterviewAgent = chatInterviewAgent;
    this.liveInterviewAgent = liveInterviewAgent;
    this.logger = logger;
  }

  async startChatInterview(user, options) {
    const result = await this.chatInterviewAgent.startInterview(user, options);
    return {
      interviewId: result.interviewId,
      message: result.message,
      currentQuestion: result.currentQuestion,
      mode: result.mode,
      visaType: result.visaType
    };
  }

  async sendChatInterviewMessage(user, interviewId, message) {
    this.assertUser(user);
    if (!interviewId) {
      throw new AppError({
        statusCode: 400,
        publicMessage: 'interviewId is required.',
        internalMessage: 'Missing interviewId in sendChatInterviewMessage.',
        errorCode: ERROR_CODES.AI_PROVIDER_ERROR
      });
    }
    return this.chatInterviewAgent.sendUserAnswer(interviewId, message);
  }

  async completeChatInterview(user, interviewId) {
    this.assertUser(user);
    if (!interviewId) {
      throw new AppError({
        statusCode: 400,
        publicMessage: 'interviewId is required.',
        internalMessage: 'Missing interviewId in completeChatInterview.',
        errorCode: ERROR_CODES.AI_PROVIDER_ERROR
      });
    }
    return this.chatInterviewAgent.completeInterview(interviewId);
  }

  assertUser(user) {
    if (!user || !user.id) {
      throw new AppError({
        statusCode: 401,
        publicMessage: 'Authentication is required.',
        internalMessage: 'AIService received request without authenticated user.',
        errorCode: ERROR_CODES.AI_PROVIDER_ERROR
      });
    }
  }
}

module.exports = new AIService();
module.exports.AIService = AIService;
