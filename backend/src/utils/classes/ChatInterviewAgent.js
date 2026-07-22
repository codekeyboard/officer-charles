var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var ChatInterviewAgent_exports = {};
__export(ChatInterviewAgent_exports, {
  ChatInterviewAgent: () => ChatInterviewAgent,
  INTERVIEW_MODES: () => import_interviewModes.INTERVIEW_MODES,
  INTERVIEW_TYPES: () => import_interviewTypes.INTERVIEW_TYPES,
  VISA_TYPES: () => import_visaTypes.VISA_TYPES,
  default: () => ChatInterviewAgent_default
});
module.exports = __toCommonJS(ChatInterviewAgent_exports);
var import_interviewModes = require("../../constants/interviewModes.js");
var import_interviewTypes = require("../../constants/interviewTypes.js");
var import_visaTypes = require("../../constants/visaTypes.js");
var import_sanitizeUserInput = require("../functions/sanitizeUserInput.js");
var import_validateInterviewInput = require("../functions/validateInterviewInput.js");
var import_AgentResponseParser = __toESM(require("./AgentResponseParser.js"));
var import_AppError = __toESM(require("./AppError.js"));
var import_InterviewEvaluationEngine = __toESM(require("./InterviewEvaluationEngine.js"));
var import_FoundryFinalEvaluationService = __toESM(require("./FoundryFinalEvaluationService.js"));
var import_InterviewModePolicy = __toESM(require("./InterviewModePolicy.js"));
var import_InterviewPromptBuilder = __toESM(require("./InterviewPromptBuilder.js"));
var import_InterviewQuestionManager = __toESM(require("./InterviewQuestionManager.js"));
var import_InterviewScoringEngine = __toESM(require("./InterviewScoringEngine.js"));
var import_InterviewSessionManager = __toESM(require("./InterviewSessionManager.js"));
var import_Logger = __toESM(require("./Logger.js"));
var import_QuotaChecker = __toESM(require("./QuotaChecker.js"));
var import_UsageTracker = __toESM(require("./UsageTracker.js"));
var import_formatInterviewStoryAnswers = require("../functions/formatInterviewStoryAnswers.js");
const F1_DOCUMENT_OPENING_QUESTION = "Before we begin, please present your passport and Form I-20; do you have both documents with you today?";
class ChatInterviewAgent {
  constructor({
    aiClient = null,
    promptBuilder = new import_InterviewPromptBuilder.default(),
    questionManager = new import_InterviewQuestionManager.default(),
    scoringEngine = new import_InterviewScoringEngine.default(),
    evaluationEngine = new import_InterviewEvaluationEngine.default(),
    finalEvaluationService = null,
    sessionManager = new import_InterviewSessionManager.default(),
    responseParser = new import_AgentResponseParser.default(),
    usageTracker = new import_UsageTracker.default(),
    quotaChecker = new import_QuotaChecker.default(),
    modePolicy = new import_InterviewModePolicy.default(),
    logger = new import_Logger.default(),
    maxRetryCount = 3,
    maxQuestionsByMode = {
      [import_interviewModes.INTERVIEW_MODES.TRAINING]: Number(process.env.TRAINING_MAX_QUESTIONS || 8),
      [import_interviewModes.INTERVIEW_MODES.SIMULATION]: Number(process.env.SIMULATION_MAX_QUESTIONS || 10)
    }
  } = {}) {
    this.aiClient = aiClient;
    this.promptBuilder = promptBuilder;
    this.questionManager = questionManager;
    this.scoringEngine = scoringEngine;
    this.evaluationEngine = evaluationEngine;
    this.finalEvaluationService = finalEvaluationService || new import_FoundryFinalEvaluationService.default({ foundryClient: aiClient, logger });
    this.sessionManager = sessionManager;
    this.responseParser = responseParser;
    this.usageTracker = usageTracker;
    this.quotaChecker = quotaChecker;
    this.modePolicy = modePolicy;
    this.logger = logger;
    this.maxRetryCount = maxRetryCount;
    this.maxQuestionsByMode = maxQuestionsByMode;
  }
  async startInterview(user = {}, options = {}) {
    const normalizedOptions = this.validateOptions(user, options);
    this.quotaChecker.assertQuotaAvailable({
      userId: user.id,
      interviewType: import_interviewTypes.INTERVIEW_TYPES.CHAT
    });
    this.quotaChecker.decrementQuota({
      userId: user.id,
      interviewType: import_interviewTypes.INTERVIEW_TYPES.CHAT
    });
    const session = this.sessionManager.createSession({
      id: normalizedOptions.interviewId,
      userId: user.id,
      userName: normalizedOptions.userName,
      visaType: normalizedOptions.visaType,
      mode: normalizedOptions.mode,
      interviewType: import_interviewTypes.INTERVIEW_TYPES.CHAT
    });
    session.interviewStory = normalizedOptions.interviewStory || null;
    this.questionManager.startSession(session.id, normalizedOptions.visaType);
    const aiParsed = await this.getSafeStartResponse(session);
    const message = this.buildStartAssistantMessage(session, aiParsed);
    this.sessionManager.updateCurrentQuestion(session.id, this.extractQuestionText(message));
    return {
      interviewId: session.id,
      session,
      message,
      currentQuestion: this.extractQuestionText(message),
      mode: normalizedOptions.mode,
      visaType: normalizedOptions.visaType
    };
  }
  async sendUserAnswer(interviewSession, userAnswer) {
    const session = this.resolveSession(interviewSession);
    const cleanAnswer = (0, import_sanitizeUserInput.sanitizeUserInput)(userAnswer);
    if (!cleanAnswer) {
      throw new import_AppError.default({
        statusCode: 400,
        publicMessage: "Answer is required.",
        internalMessage: "ChatInterviewAgent.sendUserAnswer received an empty answer.",
        errorCode: import_AppError.ERROR_CODES.AI_PROVIDER_ERROR
      });
    }
    const currentQuestion = session.currentQuestion || "Agent-selected question";
    const scoring = await this.evaluateAnswer(session, cleanAnswer);
    const policy = this.modePolicy.getPolicy(session.mode);
    const retryCount = session.retryCount || 0;
    const shouldRepeat = this.shouldRepeatQuestion(session, scoring, retryCount, cleanAnswer);
    const retryLimitReached = retryCount >= this.maxRetryCount;
    const shouldComplete = this.shouldCompleteAfterAnswer(session);
    this.sessionManager.addAnswer(session.id, {
      role: "user",
      question: currentQuestion,
      answer: cleanAnswer,
      retryCount
    });
    this.sessionManager.addScore(session.id, {
      question: currentQuestion,
      ...scoring
    });
    session.retryCount = shouldRepeat ? retryCount + 1 : 0;
    if (shouldComplete) {
      return this.completeInterview(session);
    }
    const aiParsed = await this.getSafeAiResponse(session, cleanAnswer, scoring, {
      shouldRepeat,
      retryCount,
      retryLimitReached,
      currentQuestion
    });
    const assistantMessage = session.mode === import_interviewModes.INTERVIEW_MODES.TRAINING ? this.buildTrainingAssistantMessage(aiParsed, scoring, shouldRepeat, retryLimitReached) : this.buildSimulationAssistantMessage(aiParsed, session, currentQuestion);
    const nextQuestion = this.extractQuestionText(assistantMessage) || currentQuestion;
    this.sessionManager.updateCurrentQuestion(session.id, nextQuestion);
    if (session.mode === import_interviewModes.INTERVIEW_MODES.TRAINING) {
      return {
        assistantMessage,
        answerAccepted: scoring.answerAccepted,
        score: scoring.totalScore,
        feedback: scoring.feedback,
        shouldRepeatQuestion: shouldRepeat,
        nextQuestion,
        retryCount: session.retryCount || 0,
        nextAction: shouldRepeat ? "REPEAT_QUESTION" : "ASK_NEXT_QUESTION"
      };
    }
    return {
      assistantMessage,
      answerAccepted: scoring.answerAccepted,
      scoreVisible: policy.revealScoreDuringInterview,
      shouldRepeatQuestion: shouldRepeat,
      nextQuestion,
      nextAction: shouldRepeat ? "REPEAT_QUESTION" : "ASK_NEXT_QUESTION"
    };
  }
  async evaluateAnswer(interviewSession, userAnswer) {
    const session = this.resolveSession(interviewSession);
    const currentQuestion = session.currentQuestion || "Agent-selected question";
    const scoring = this.scoringEngine.scoreAnswer({
      question: currentQuestion,
      answer: userAnswer,
      visaType: session.visaType,
      previousAnswers: session.answers,
      interviewStory: session.interviewStory
    });
    return {
      answerAccepted: scoring.answerAccepted,
      totalScore: scoring.totalScore,
      scores: scoring.scores,
      feedback: scoring.feedback,
      shouldRepeatQuestion: scoring.shouldRepeatQuestion,
      nextAction: scoring.nextAction
    };
  }
  async completeInterview(interviewSession) {
    const session = this.resolveSession(interviewSession);
    const evaluation = await this.finalEvaluationService.evaluate({
      interview: session,
      interviewType: import_interviewTypes.INTERVIEW_TYPES.CHAT,
      visaType: session.visaType,
      mode: session.mode,
      answers: session.answers,
    });
    this.sessionManager.completeSession(session.id, evaluation);
    return {
      interviewId: session.id,
      assistantMessage: evaluation.message,
      status: "COMPLETED",
      finalEvaluation: evaluation,
      nextAction: "COMPLETE_INTERVIEW"
    };
  }
  validateOptions(user, options) {
    const validation = (0, import_validateInterviewInput.validateInterviewInput)({
      userName: options.userName || user.name,
      visaType: options.visaType,
      mode: options.mode,
      interviewType: import_interviewTypes.INTERVIEW_TYPES.CHAT
    });
    if (!validation.isValid) {
      const code = this.pickValidationErrorCode(validation.errors);
      throw new import_AppError.default({
        statusCode: 400,
        publicMessage: validation.errors.join(" "),
        internalMessage: validation.errors.join(" "),
        errorCode: code,
        metadata: { errors: validation.errors }
      });
    }
    return {
      ...validation.value,
      interviewId: options.interviewId,
      interviewStory: options.interviewStory || null
    };
  }
  pickValidationErrorCode(errors) {
    const message = errors.join(" ").toLowerCase();
    if (message.includes("visatype")) return import_AppError.ERROR_CODES.INVALID_VISA_TYPE;
    if (message.includes("mode")) return import_AppError.ERROR_CODES.INVALID_INTERVIEW_MODE;
    if (message.includes("interviewtype")) return import_AppError.ERROR_CODES.INVALID_INTERVIEW_TYPE;
    return import_AppError.ERROR_CODES.AI_PROVIDER_ERROR;
  }
  shouldRepeatQuestion(session, scoring, retryCount, userAnswer) {
    if (session.mode === import_interviewModes.INTERVIEW_MODES.TRAINING) {
      return this.modePolicy.shouldRepeatQuestion(session.mode, {
        isWeakAnswer: !scoring.answerAccepted || scoring.shouldRepeatQuestion
      }) && retryCount < this.maxRetryCount;
    }
    return false;
  }
  shouldCompleteAfterAnswer(session) {
    const maxQuestions = this.maxQuestionsByMode[session.mode] || 8;
    return session.answers.length + 1 >= maxQuestions;
  }
  async getSafeStartResponse(session) {
    try {
      const aiClient = await this.getAiClient();
      if (!aiClient) {
        return this.responseParser.parse("");
      }
      const input = this.buildCompactStartInput(session);
      const response = typeof aiClient.createJsonResponse === "function" ? await aiClient.createJsonResponse(input, { metadata: { interviewId: session.id } }) : await aiClient.sendMessage(input, { interviewId: session.id });
      this.trackUsage(session, response);
      return this.responseParser.parse(response);
    } catch (error) {
      this.logger.warn("Foundry start response unavailable; using local fallback", { error });
      return this.responseParser.parse("");
    }
  }
  async getSafeAiResponse(session, userAnswer, scoring, flow = {}) {
    try {
      const aiClient = await this.getAiClient();
      if (!aiClient) {
        return this.responseParser.parse("");
      }
      const input = this.buildCompactTurnInput(session, userAnswer, scoring, flow);
      const response = typeof aiClient.createJsonResponse === "function" ? await aiClient.createJsonResponse(input, { metadata: { interviewId: session.id } }) : await aiClient.sendMessage(input, { interviewId: session.id });
      this.trackUsage(session, response);
      return this.responseParser.parse(response);
    } catch (error) {
      this.logger.warn("Chat interview AI response unavailable; using local fallback", { error });
      return this.responseParser.parse("");
    }
  }
  async getAiClient() {
    if (this.aiClient) {
      return this.aiClient;
    }
    try {
      const { default: AzureResponsesClient } = await import("./AzureResponsesClient.js");
      this.aiClient = new AzureResponsesClient();
      return this.aiClient;
    } catch (error) {
      this.logger.debug("AzureResponsesClient could not be initialized", { error });
      return null;
    }
  }
  buildTrainingAssistantMessage(aiParsed, scoring, shouldRepeat, retryLimitReached) {
    const parsedMessage = aiParsed?.parsed?.assistantMessage;
    if (parsedMessage) {
      return parsedMessage;
    }
    const feedback = `Good: ${scoring.feedback.good} Weak: ${scoring.feedback.weak} Improvement: ${scoring.feedback.improvement}`;
    if (shouldRepeat && !retryLimitReached) {
      return `${feedback} Please answer the same point again with more specific details.`;
    }
    return `${feedback} Please continue to the next interview question.`;
  }
  buildSimulationAssistantMessage(aiParsed, session, currentQuestion) {
    const parsedMessage = aiParsed?.parsed?.assistantMessage;
    const parsedQuestion = this.extractQuestionText(parsedMessage);
    if (parsedMessage && parsedQuestion && !sameQuestion(parsedQuestion, currentQuestion)) {
      return parsedMessage;
    }
    const nextQuestion = this.questionManager.getNextQuestion(session.id, { repeatCurrent: false });
    return nextQuestion || "Thank you. That completes the interview questions.";
  }
  buildCompactStartInput(session) {
    return [
      "Start a new chat visa interview using your existing Foundry Agent instructions and knowledge.",
      `Applicant name: ${session.userName}`,
      `Visa type: ${session.visaType}`,
      `Mode: ${session.mode}`,
      this.buildInterviewStoryContext(session.interviewStory),
      session.visaType === import_visaTypes.VISA_TYPES.F1 ? `Mandatory first F1 opening question: ${F1_DOCUMENT_OPENING_QUESTION}` : "",
      session.visaType === import_visaTypes.VISA_TYPES.F1 ? "This is a simulated document-presenting request only; do not ask for passport numbers or SEVIS identifiers." : "",
      "You choose the first appropriate visa interview question yourself.",
      "Vary wording naturally across interviews.",
      "Ask only one question. Keep it short. Do not output JSON."
    ].filter(Boolean).join("\n");
  }
  buildStartAssistantMessage(session, aiParsed) {
    const parsedMessage = aiParsed?.parsed?.assistantMessage || "";
    if (session.visaType === import_visaTypes.VISA_TYPES.F1 && !this.includesF1DocumentOpening(parsedMessage)) {
      return F1_DOCUMENT_OPENING_QUESTION;
    }
    return parsedMessage || `Hello ${session.userName}, let's begin your ${session.visaType} visa interview. Please tell me about your purpose and plans.`;
  }
  includesF1DocumentOpening(message) {
    const text = String(message || "").toLowerCase();
    return text.includes("passport") && (text.includes("i-20") || text.includes("i20") || text.includes("form i"));
  }
  buildCompactTurnInput(session, userAnswer, scoring, flow) {
    const currentQuestion = flow.currentQuestion || session.currentQuestion || "";
    if (session.mode === import_interviewModes.INTERVIEW_MODES.SIMULATION) {
      return [
        "Continue the same visa interview using Foundry conversation history and your existing agent instructions.",
        `Applicant name: ${session.userName}`,
        `Visa type: ${session.visaType}`,
        `Mode: ${session.mode}`,
        this.buildInterviewStoryContext(session.interviewStory),
        `Current question intent/text: ${currentQuestion}`,
        `Applicant answer: ${userAnswer}`,
        "Backend action: ASK_NEXT_QUESTION",
        "Simulation mode rule: do not score, coach, or retry during the interview.",
        "Move to a different appropriate visa interview question like a real visa officer.",
        "Do not repeat the current question unless the applicant literally gave no answer.",
        "Ask only one question. Keep response to 1-2 short sentences. Do not output JSON."
      ].join("\n");
    }
    const action = flow.shouldRepeat ? "REPEAT_CURRENT_QUESTION" : "ASK_NEXT_QUESTION";
    return [
      "Continue the same visa interview using Foundry conversation history and your existing agent instructions.",
      `Applicant name: ${session.userName}`,
      `Visa type: ${session.visaType}`,
      `Mode: ${session.mode}`,
      this.buildInterviewStoryContext(session.interviewStory),
      `Current question intent/text: ${currentQuestion}`,
      `Applicant answer: ${userAnswer}`,
      `Backend local score: ${scoring.totalScore}/100`,
      `Answer accepted by backend: ${scoring.answerAccepted ? "yes" : "no"}`,
      `Backend action: ${action}`,
      `Retry count: ${flow.retryCount}`,
      `Retry limit reached: ${flow.retryLimitReached ? "yes" : "no"}`,
      "Give one brief feedback sentence, then ask the retry/next question naturally.",
      "You decide the next appropriate visa interview question using your agent instructions and conversation history.",
      "Do not repeat the same wording unless the answer was unclear or weak.",
      "Keep coverage realistic for the selected visa type.",
      "Ask only one question. Keep response to 1-2 short sentences. Do not output JSON."
    ].join("\n");
  }
  buildInterviewStoryContext(interviewStory) {
    if (!interviewStory?.storyText && !interviewStory?.answers) return "";
    const answerText = (0, import_formatInterviewStoryAnswers.formatInterviewStoryAnswers)(interviewStory?.answers);
    return [
      "Saved interview story reference:",
      interviewStory.storyText ? `Story: ${interviewStory.storyText}` : "",
      answerText ? `Structured answers: ${answerText}` : "",
      "Use this only as internal consistency context and to choose better follow-up questions.",
      "Do not recite it, do not replace standard visa interview questions with it, and do not invent facts from it."
    ].filter(Boolean).join("\n");
  }
  extractQuestionText(message) {
    const text = String(message || "").trim();
    if (!text) return "";
    const questionMatch = text.match(/[A-Z0-9][^?]{8,}\?/gi);
    return questionMatch?.at(-1)?.trim() || text.slice(0, 240);
  }
  trackUsage(session, response) {
    if (!response?.usage) {
      return;
    }
    this.usageTracker.trackUsage({
      userId: session.userId,
      interviewId: session.id,
      provider: response.provider || "azure",
      modelName: response.model,
      inputTokens: response.usage.inputTokens,
      outputTokens: response.usage.outputTokens,
      providerResponseId: response.id
    });
  }
  resolveSession(interviewSession) {
    if (typeof interviewSession === "string") {
      const session = this.sessionManager.getSession(interviewSession);
      if (session) return session;
    }
    if (interviewSession?.id) {
      return this.sessionManager.getSession(interviewSession.id) || interviewSession;
    }
    throw new import_AppError.default({
      statusCode: 404,
      publicMessage: "Interview session not found.",
      internalMessage: "ChatInterviewAgent could not resolve interview session.",
      errorCode: import_AppError.ERROR_CODES.AI_PROVIDER_ERROR
    });
  }
}
function sameQuestion(a, b) {
  const left = normalizeQuestion(a);
  const right = normalizeQuestion(b);
  return Boolean(left && right && left === right);
}
function normalizeQuestion(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\b(please|clearly|answer|question|this|the|your)\b/g, " ").replace(/\s+/g, " ").trim();
}
var ChatInterviewAgent_default = ChatInterviewAgent;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ChatInterviewAgent,
  INTERVIEW_MODES,
  INTERVIEW_TYPES,
  VISA_TYPES
});
