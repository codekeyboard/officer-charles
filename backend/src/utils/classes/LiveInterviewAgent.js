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
var LiveInterviewAgent_exports = {};
__export(LiveInterviewAgent_exports, {
  LIVE_PROVIDERS: () => LIVE_PROVIDERS,
  LiveInterviewAgent: () => LiveInterviewAgent,
  default: () => LiveInterviewAgent_default
});
module.exports = __toCommonJS(LiveInterviewAgent_exports);
var import_env_config = __toESM(require("../../config/env.config.js"));
var import_interviewModes = require("../../constants/interviewModes.js");
var import_interviewTypes = require("../../constants/interviewTypes.js");
var import_validateInterviewInput = require("../functions/validateInterviewInput.js");
var import_AppError = __toESM(require("./AppError.js"));
var import_InterviewEvaluationEngine = __toESM(require("./InterviewEvaluationEngine.js"));
var import_InterviewPromptBuilder = __toESM(require("./InterviewPromptBuilder.js"));
var import_InterviewSessionManager = __toESM(require("./InterviewSessionManager.js"));
var import_Logger = __toESM(require("./Logger.js"));
var import_QuotaChecker = __toESM(require("./QuotaChecker.js"));
var import_RealtimeWebRTCSession = __toESM(require("./RealtimeWebRTCSession.js"));
var import_SecureTokenService = __toESM(require("./SecureTokenService.js"));
var import_TranscriptManager = __toESM(require("./TranscriptManager.js"));
var import_UsageTracker = __toESM(require("./UsageTracker.js"));
var import_VoiceLiveClient = __toESM(require("./VoiceLiveClient.js"));
const LIVE_PROVIDERS = Object.freeze({
  VOICE_LIVE: "VOICE_LIVE",
  REALTIME_WEBRTC: "REALTIME_WEBRTC"
});
class LiveInterviewAgent {
  constructor({
    appConfig = import_env_config.default,
    voiceLiveClient = new import_VoiceLiveClient.default(),
    realtimeWebRTCSession = new import_RealtimeWebRTCSession.default(),
    secureTokenService = new import_SecureTokenService.default(),
    promptBuilder = new import_InterviewPromptBuilder.default(),
    evaluationEngine = new import_InterviewEvaluationEngine.default(),
    sessionManager = new import_InterviewSessionManager.default(),
    transcriptManager = new import_TranscriptManager.default(),
    usageTracker = new import_UsageTracker.default(),
    quotaChecker = new import_QuotaChecker.default(),
    logger = new import_Logger.default()
  } = {}) {
    this.appConfig = appConfig;
    this.voiceLiveClient = voiceLiveClient;
    this.realtimeWebRTCSession = realtimeWebRTCSession;
    this.secureTokenService = secureTokenService;
    this.promptBuilder = promptBuilder;
    this.evaluationEngine = evaluationEngine;
    this.sessionManager = sessionManager;
    this.transcriptManager = transcriptManager;
    this.usageTracker = usageTracker;
    this.quotaChecker = quotaChecker;
    this.logger = logger;
  }
  async createLiveSession(user = {}, options = {}) {
    const normalizedOptions = this.validateLiveOptions(user, options);
    const provider = this.resolveProvider(options.provider);
    const session = this.sessionManager.createSession({
      id: normalizedOptions.interviewId,
      userId: user.id,
      userName: normalizedOptions.userName,
      visaType: normalizedOptions.visaType,
      mode: normalizedOptions.mode,
      interviewType: import_interviewTypes.INTERVIEW_TYPES.LIVE
    });
    const liveUser = {
      ...user,
      name: normalizedOptions.userName
    };
    const instructions = this.buildRealtimeInstructions(liveUser, normalizedOptions);
    if (provider === LIVE_PROVIDERS.VOICE_LIVE) {
      return this.createVoiceLiveSessionResponse({
        user: liveUser,
        session,
        options: normalizedOptions,
        instructions
      });
    }
    return this.createRealtimeWebRTCSessionResponse({
      user: liveUser,
      session,
      options: normalizedOptions,
      instructions
    });
  }
  buildRealtimeInstructions(user = {}, options = {}) {
    const basePrompt = this.promptBuilder.buildPrompt({
      userName: options.userName || user.name,
      visaType: options.visaType,
      mode: options.mode,
      interviewType: import_interviewTypes.INTERVIEW_TYPES.LIVE,
      currentQuestion: options.currentQuestion,
      previousAnswers: options.previousAnswers || [],
      interviewStory: options.interviewStory || null,
      retryCount: options.retryCount || 0
    });
    const voiceRules = options.mode === import_interviewModes.INTERVIEW_MODES.TRAINING ? [
      "Live voice training rules:",
      "- Give brief spoken feedback after each answer.",
      "- Ask the user to retry weak or incomplete answers when allowed.",
      "- Keep voice feedback concise and easy to follow."
    ] : [
      "Live voice simulation rules:",
      "- Behave like a real visa officer.",
      "- Do not reveal scores during the interview.",
      "- Ask natural short questions.",
      "- Give final evaluation only when the backend completes the interview."
    ];
    const f1OpeningRules = options.visaType === "F1" ? [
      "Mandatory F1 opening:",
      '- Begin every F1 live interview by asking exactly one simulated document check: "Before we begin, please present your passport and Form I-20; do you have both documents with you today?"',
      "- This is role-play language only; do not ask for passport numbers, SEVIS identifiers, uploads, photos, or sensitive document details.",
      "- After the applicant answers, continue with normal F1 visa interview questions."
    ] : [];
    return [
      basePrompt,
      `Interview variation seed: ${options.interviewId || "new-live-session"}.`,
      ...f1OpeningRules,
      "Voice delivery rules:",
      "- Use one or two short spoken sentences.",
      "- Ask exactly one question per turn.",
      "- Ask about 10 to 12 applicant-answer questions before concluding the interview.",
      options.visaType === "F1" ? "- After the mandatory document check, vary question wording and order while staying within the selected visa topic." : "- Vary question wording and order every session while staying within the selected visa topic.",
      options.visaType === "F1" ? "" : "- Do not always start with the same question.",
      "- Do not end the interview after only 3 or 4 answered questions.",
      "- The Foundry agent controls when the interview is ready to complete; the backend only persists the completion.",
      '- When you decide the live interview is complete, say exactly: "This completes the interview. I will prepare your evaluation now."',
      "- Keep replies under 12 seconds of speech unless giving the final evaluation.",
      "- Do not speak JSON, field names, or internal metadata.",
      "- Wait for the applicant's answer before asking the next question.",
      ...voiceRules
    ].join("\n");
  }
  createVoiceLiveConfig(user = {}, options = {}) {
    return this.voiceLiveClient.createSessionConfig(user, {
      ...options,
      instructions: options.instructions || this.buildRealtimeInstructions(user, options),
      avatar: {
        enabled: Boolean(options.enableAvatar),
        ...options.avatar || {}
      }
    });
  }
  handleTranscriptEvent(event = {}) {
    const interviewId = event.interviewId || event.sessionId;
    const role = this.normalizeSpeakerRole(event.role || event.speaker);
    const text = event.text || event.transcript || event.delta || "";
    if (!interviewId || !text) {
      return {
        stored: false,
        reason: "Missing interviewId or transcript text."
      };
    }
    const transcriptEntry = this.transcriptManager.addTranscript({
      interviewId,
      role,
      text,
      timestamp: event.timestamp || (/* @__PURE__ */ new Date()).toISOString()
    });
    return {
      stored: true,
      interviewId,
      transcript: transcriptEntry
    };
  }
  handleRealtimeEvent(event = {}) {
    const provider = event.provider || LIVE_PROVIDERS.VOICE_LIVE;
    const interviewId = event.interviewId || event.sessionId;
    const handledEvent = provider === LIVE_PROVIDERS.VOICE_LIVE ? this.voiceLiveClient.handleVoiceLiveEvent(event) : this.normalizeRealtimeEvent(event);
    if (event.transcript || event.text || event.delta) {
      handledEvent.transcript = this.handleTranscriptEvent(event);
    }
    if (event.usage || event.audioSeconds || event.liveSessionSeconds) {
      handledEvent.usage = this.trackLiveUsage(event, interviewId, provider);
    }
    return handledEvent;
  }
  completeLiveInterview(sessionId) {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      throw new import_AppError.default({
        statusCode: 404,
        publicMessage: "Live interview session not found.",
        internalMessage: `Live interview session not found: ${sessionId}`,
        errorCode: import_AppError.ERROR_CODES.LIVE_SESSION_ERROR
      });
    }
    const transcript = this.transcriptManager.getTranscript(sessionId);
    const finalEvaluation = this.evaluationEngine.generateFinalEvaluation({
      session,
      answers: transcript.map((entry) => ({
        role: entry.role,
        answer: entry.text,
        timestamp: entry.timestamp
      })),
      scores: session.scores,
      interviewType: import_interviewTypes.INTERVIEW_TYPES.LIVE
    });
    this.sessionManager.completeSession(sessionId, finalEvaluation);
    return {
      interviewId: sessionId,
      status: "COMPLETED",
      transcript,
      finalEvaluation,
      assistantMessage: finalEvaluation.message
    };
  }
  async createVoiceLiveSessionResponse({ user, session, options, instructions }) {
    const sessionConfig = this.createVoiceLiveConfig(user, {
      ...options,
      interviewId: session.id,
      instructions
    });
    const temporarySession = await this.secureTokenService.createVoiceLiveTemporarySession({
      user,
      type: "voice_live",
      sessionId: session.id,
      sessionConfig
    });
    const connectionInfo = {
      ...this.voiceLiveClient.buildWebRTCConnectionInfo(temporarySession.sessionId),
      ...temporarySession.connection
    };
    return this.buildSafeSessionResponse({
      interviewId: session.id,
      sessionId: temporarySession.sessionId,
      provider: LIVE_PROVIDERS.VOICE_LIVE,
      connectionInfo,
      sessionConfig,
      instructions,
      expiresAt: temporarySession.expiresAt
    });
  }
  async createRealtimeWebRTCSessionResponse({ user, session, options, instructions }) {
    const realtimeSession = await this.realtimeWebRTCSession.createSession(user, {
      ...options,
      sessionId: session.id,
      instructions
    });
    return this.buildSafeSessionResponse({
      interviewId: session.id,
      sessionId: realtimeSession.sessionId,
      provider: LIVE_PROVIDERS.REALTIME_WEBRTC,
      connectionInfo: realtimeSession.connection,
      sessionConfig: realtimeSession.sessionConfig,
      instructions: realtimeSession.instructions || instructions,
      expiresAt: realtimeSession.connection?.expiresAt || null
    });
  }
  buildSafeSessionResponse({ interviewId, sessionId, provider, connectionInfo, sessionConfig, instructions, expiresAt }) {
    return {
      interviewId,
      sessionId,
      provider,
      connectionInfo: this.removeLongLivedSecrets(connectionInfo),
      sessionConfig: this.removeLongLivedSecrets(sessionConfig),
      instructions,
      expiresAt
    };
  }
  validateLiveOptions(user, options) {
    const validation = (0, import_validateInterviewInput.validateInterviewInput)({
      userName: options.userName || user.name,
      visaType: options.visaType,
      mode: options.mode,
      interviewType: import_interviewTypes.INTERVIEW_TYPES.LIVE
    });
    if (!validation.isValid) {
      throw new import_AppError.default({
        statusCode: 400,
        publicMessage: validation.errors.join(" "),
        internalMessage: validation.errors.join(" "),
        errorCode: this.pickValidationErrorCode(validation.errors),
        metadata: {
          errors: validation.errors
        }
      });
    }
    return {
      ...validation.value,
      interviewId: options.interviewId,
      enableAvatar: Boolean(options.enableAvatar),
      provider: options.provider,
      interviewStory: options.interviewStory || null
    };
  }
  resolveProvider(requestedProvider) {
    const normalizedProvider = String(requestedProvider || "").trim().toUpperCase();
    const voiceLiveEnabled = Boolean(this.appConfig.ai?.enableVoiceLive);
    const realtimeEnabled = Boolean(this.appConfig.ai?.enableRealtimeWebRtc);
    if (normalizedProvider) {
      if (!Object.values(LIVE_PROVIDERS).includes(normalizedProvider)) {
        throw new import_AppError.default({
          statusCode: 400,
          publicMessage: "Invalid live interview provider.",
          internalMessage: `Invalid live provider: ${requestedProvider}`,
          errorCode: import_AppError.ERROR_CODES.LIVE_SESSION_ERROR
        });
      }
      if (normalizedProvider === LIVE_PROVIDERS.VOICE_LIVE && !voiceLiveEnabled) {
        throw this.providerDisabledError(LIVE_PROVIDERS.VOICE_LIVE);
      }
      if (normalizedProvider === LIVE_PROVIDERS.REALTIME_WEBRTC && !realtimeEnabled) {
        throw this.providerDisabledError(LIVE_PROVIDERS.REALTIME_WEBRTC);
      }
      return normalizedProvider;
    }
    if (voiceLiveEnabled) return LIVE_PROVIDERS.VOICE_LIVE;
    if (realtimeEnabled) return LIVE_PROVIDERS.REALTIME_WEBRTC;
    throw new import_AppError.default({
      statusCode: 503,
      publicMessage: "No live interview provider is enabled.",
      internalMessage: "Both ENABLE_VOICE_LIVE and ENABLE_REALTIME_WEBRTC are disabled.",
      errorCode: import_AppError.ERROR_CODES.AI_CONFIG_ERROR
    });
  }
  providerDisabledError(provider) {
    return new import_AppError.default({
      statusCode: 503,
      publicMessage: "Requested live interview provider is disabled.",
      internalMessage: `${provider} is disabled by configuration.`,
      errorCode: import_AppError.ERROR_CODES.AI_CONFIG_ERROR
    });
  }
  normalizeSpeakerRole(role) {
    const normalizedRole = String(role || "").toLowerCase();
    return normalizedRole === "assistant" ? "assistant" : "user";
  }
  normalizeRealtimeEvent(event) {
    const type = event?.type || "unknown";
    if (type === "error") {
      this.logger.warn("Realtime WebRTC event error", { event });
      return {
        type,
        error: true,
        message: event?.error?.message || "Realtime WebRTC event error."
      };
    }
    return {
      type,
      completed: type === "response.done" || type === "response.completed",
      event
    };
  }
  trackLiveUsage(event, interviewId, provider) {
    const usage = event.usage || {};
    return this.usageTracker.trackUsage({
      userId: event.userId,
      interviewId,
      provider,
      modelName: event.modelName || event.model || "live-voice",
      inputTokens: usage.inputTokens ?? usage.input_tokens ?? 0,
      outputTokens: usage.outputTokens ?? usage.output_tokens ?? 0,
      audioSeconds: event.audioSeconds || usage.audioSeconds || 0,
      liveSessionSeconds: event.liveSessionSeconds || usage.liveSessionSeconds || 0,
      providerResponseId: event.responseId || event.id || null
    });
  }
  removeLongLivedSecrets(value) {
    if (Array.isArray(value)) {
      return value.map((item) => this.removeLongLivedSecrets(item));
    }
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value).filter(([key]) => !this.isLongLivedSecretKey(key)).map(([key, entryValue]) => [key, this.removeLongLivedSecrets(entryValue)])
      );
    }
    return value;
  }
  isLongLivedSecretKey(key) {
    const normalizedKey = String(key).toLowerCase();
    return [
      "apikey",
      "api_key",
      "authorization",
      "cookie",
      "password",
      "clientsecret",
      "client_secret"
    ].some((secretKey) => normalizedKey.includes(secretKey));
  }
  pickValidationErrorCode(errors) {
    const message = errors.join(" ").toLowerCase();
    if (message.includes("visatype")) return import_AppError.ERROR_CODES.INVALID_VISA_TYPE;
    if (message.includes("mode")) return import_AppError.ERROR_CODES.INVALID_INTERVIEW_MODE;
    if (message.includes("interviewtype")) return import_AppError.ERROR_CODES.INVALID_INTERVIEW_TYPE;
    return import_AppError.ERROR_CODES.LIVE_SESSION_ERROR;
  }
}
var LiveInterviewAgent_default = LiveInterviewAgent;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  LIVE_PROVIDERS,
  LiveInterviewAgent
});
