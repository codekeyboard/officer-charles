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
var InterviewQuestionManager_exports = {};
__export(InterviewQuestionManager_exports, {
  InterviewQuestionManager: () => InterviewQuestionManager,
  QUESTION_BANKS: () => QUESTION_BANKS,
  default: () => InterviewQuestionManager_default
});
module.exports = __toCommonJS(InterviewQuestionManager_exports);
var import_visaTypes = require("../../constants/visaTypes.js");
var import_AppError = require("./AppError.js");
const QUESTION_BANKS = Object.freeze({
  [import_visaTypes.VISA_TYPES.B1_B2]: Object.freeze([
    "What is the purpose of your trip to the United States?",
    "How long do you plan to stay in the United States?",
    "Who will pay for your travel and living expenses?",
    "What do you do for work or business in your home country?",
    "Where will you stay during your visit?",
    "Have you traveled internationally before?",
    "What family ties do you have in your home country?",
    "Why will you return after your visit?"
  ]),
  [import_visaTypes.VISA_TYPES.F1]: Object.freeze([
    "Before we begin, please present your passport and Form I-20; do you have both documents with you today?",
    "Why did you choose this university?",
    "Why did you choose this program?",
    "How does your academic background prepare you for this program?",
    "Who will sponsor your education?",
    "What does your sponsor do for work?",
    "What is your study plan in the United States?",
    "What are your career plans after graduation?",
    "Why do you want to study in the United States?",
    "Why not study this program locally?",
    "What ties will bring you back to your home country?"
  ])
});
class InterviewQuestionManager {
  constructor({ questionBanks = QUESTION_BANKS } = {}) {
    this.questionBanks = questionBanks;
    this.stateBySession = /* @__PURE__ */ new Map();
  }
  startSession(sessionId, visaType) {
    const questions = this.getQuestionBank(visaType);
    const state = {
      visaType,
      currentIndex: 0,
      retryCount: 0,
      askedQuestions: /* @__PURE__ */ new Set([questions[0]])
    };
    this.stateBySession.set(sessionId, state);
    return questions[0];
  }
  getFirstQuestion(visaType) {
    return this.getQuestionBank(visaType)[0];
  }
  getCurrentQuestion(sessionId) {
    const state = this.getSessionState(sessionId);
    return this.getQuestionBank(state.visaType)[state.currentIndex] || null;
  }
  getNextQuestion(sessionId, { repeatCurrent = false } = {}) {
    const state = this.getSessionState(sessionId);
    const questions = this.getQuestionBank(state.visaType);
    if (repeatCurrent) {
      state.retryCount += 1;
      return questions[state.currentIndex] || null;
    }
    state.retryCount = 0;
    let nextIndex = state.currentIndex + 1;
    while (nextIndex < questions.length && state.askedQuestions.has(questions[nextIndex])) {
      nextIndex += 1;
    }
    state.currentIndex = nextIndex;
    const nextQuestion = questions[nextIndex] || null;
    if (nextQuestion) {
      state.askedQuestions.add(nextQuestion);
    }
    return nextQuestion;
  }
  getRetryCount(sessionId) {
    return this.getSessionState(sessionId).retryCount;
  }
  resetRetryCount(sessionId) {
    this.getSessionState(sessionId).retryCount = 0;
  }
  getQuestionBank(visaType) {
    const questions = this.questionBanks[visaType];
    if (!questions) {
      throw new import_AppError.AppError({
        statusCode: 400,
        publicMessage: "Invalid visa type.",
        internalMessage: `No question bank for visa type: ${visaType}`,
        errorCode: import_AppError.ERROR_CODES.INVALID_VISA_TYPE
      });
    }
    return [...questions];
  }
  getSessionState(sessionId) {
    const state = this.stateBySession.get(sessionId);
    if (!state) {
      throw new import_AppError.AppError({
        statusCode: 404,
        publicMessage: "Question session not found.",
        internalMessage: `Question state not found for session: ${sessionId}`,
        errorCode: import_AppError.ERROR_CODES.AI_PROVIDER_ERROR
      });
    }
    return state;
  }
}
var InterviewQuestionManager_default = InterviewQuestionManager;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  InterviewQuestionManager,
  QUESTION_BANKS
});
