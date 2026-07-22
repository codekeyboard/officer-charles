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
var InterviewSessionManager_exports = {};
__export(InterviewSessionManager_exports, {
  InterviewSessionManager: () => InterviewSessionManager,
  default: () => InterviewSessionManager_default
});
module.exports = __toCommonJS(InterviewSessionManager_exports);
var import_generateSessionId = require("../functions/generateSessionId.js");
class InterviewSessionManager {
  constructor() {
    this.sessions = /* @__PURE__ */ new Map();
  }
  createSession({
    id,
    userId,
    userName,
    visaType,
    mode,
    interviewType,
    currentQuestion = null
  } = {}) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const session = {
      id: id || (0, import_generateSessionId.generateSessionId)("interview"),
      userId,
      userName,
      visaType,
      mode,
      interviewType,
      currentQuestion,
      answers: [],
      scores: [],
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
      completedAt: null
    };
    this.sessions.set(session.id, session);
    return session;
  }
  getSession(sessionId) {
    return this.sessions.get(sessionId) || null;
  }
  updateCurrentQuestion(sessionId, currentQuestion) {
    const session = this.requireSession(sessionId);
    session.currentQuestion = currentQuestion;
    session.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    return session;
  }
  addAnswer(sessionId, answer) {
    const session = this.requireSession(sessionId);
    session.answers.push({
      ...answer,
      timestamp: answer.timestamp || (/* @__PURE__ */ new Date()).toISOString()
    });
    session.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    return session;
  }
  addScore(sessionId, score) {
    const session = this.requireSession(sessionId);
    session.scores.push({
      ...score,
      timestamp: score.timestamp || (/* @__PURE__ */ new Date()).toISOString()
    });
    session.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    return session;
  }
  completeSession(sessionId, finalEvaluation = null) {
    const session = this.requireSession(sessionId);
    session.status = "COMPLETED";
    session.finalEvaluation = finalEvaluation;
    session.completedAt = (/* @__PURE__ */ new Date()).toISOString();
    session.updatedAt = session.completedAt;
    return session;
  }
  requireSession(sessionId) {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new Error(`Interview session not found: ${sessionId}`);
    }
    return session;
  }
}
var InterviewSessionManager_default = InterviewSessionManager;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  InterviewSessionManager
});
