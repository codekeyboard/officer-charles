var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var InterviewModePolicy_exports = {};
__export(InterviewModePolicy_exports, {
  InterviewModePolicy: () => InterviewModePolicy,
  default: () => InterviewModePolicy_default
});
module.exports = __toCommonJS(InterviewModePolicy_exports);
var import_interviewModes = require("../../constants/interviewModes.js");
var import_AppError = require("./AppError.js");
class InterviewModePolicy {
  constructor() {
    this.policies = Object.freeze({
      [import_interviewModes.INTERVIEW_MODES.TRAINING]: Object.freeze({
        feedbackAfterEachAnswer: true,
        scoreAfterEachAnswer: true,
        revealScoreDuringInterview: true,
        retryWeakAnswers: true,
        repeatSameQuestionWhenNeeded: true,
        repeatOnlyIfOffTopicOrUnclear: false
      }),
      [import_interviewModes.INTERVIEW_MODES.SIMULATION]: Object.freeze({
        feedbackAfterEachAnswer: false,
        scoreAfterEachAnswer: false,
        revealScoreDuringInterview: false,
        retryWeakAnswers: false,
        repeatSameQuestionWhenNeeded: false,
        repeatOnlyIfOffTopicOrUnclear: true
      })
    });
  }
  getPolicy(mode) {
    const normalizedMode = String(mode || "").trim().toUpperCase();
    const policy = this.policies[normalizedMode];
    if (!policy) {
      throw new import_AppError.AppError({
        statusCode: 400,
        publicMessage: "Invalid interview mode.",
        internalMessage: `Invalid interview mode: ${mode}`,
        errorCode: import_AppError.ERROR_CODES.INVALID_INTERVIEW_MODE,
        isOperational: true
      });
    }
    return policy;
  }
  shouldGiveFeedback(mode) {
    return this.getPolicy(mode).feedbackAfterEachAnswer;
  }
  shouldRevealScore(mode) {
    return this.getPolicy(mode).revealScoreDuringInterview;
  }
  shouldRepeatQuestion(mode, { isWeakAnswer = false, isOffTopic = false, isUnclear = false } = {}) {
    const policy = this.getPolicy(mode);
    if (policy.retryWeakAnswers && isWeakAnswer) {
      return true;
    }
    if (policy.repeatOnlyIfOffTopicOrUnclear && (isOffTopic || isUnclear)) {
      return true;
    }
    return false;
  }
}
var InterviewModePolicy_default = InterviewModePolicy;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  InterviewModePolicy
});
