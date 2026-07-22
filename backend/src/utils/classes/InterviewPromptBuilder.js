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
var InterviewPromptBuilder_exports = {};
__export(InterviewPromptBuilder_exports, {
  InterviewPromptBuilder: () => InterviewPromptBuilder,
  default: () => InterviewPromptBuilder_default
});
module.exports = __toCommonJS(InterviewPromptBuilder_exports);
var import_baseAgent_prompt = __toESM(require("../../prompts/baseAgent.prompt.js"));
var import_b1b2_prompt = __toESM(require("../../prompts/b1b2.prompt.js"));
var import_f1_prompt = __toESM(require("../../prompts/f1.prompt.js"));
var import_trainingMode_prompt = __toESM(require("../../prompts/trainingMode.prompt.js"));
var import_simulationMode_prompt = __toESM(require("../../prompts/simulationMode.prompt.js"));
var import_scoringRubric_prompt = __toESM(require("../../prompts/scoringRubric.prompt.js"));
var import_liveVoice_prompt = __toESM(require("../../prompts/liveVoice.prompt.js"));
var import_interviewModes = require("../../constants/interviewModes.js");
var import_interviewTypes = require("../../constants/interviewTypes.js");
var import_visaTypes = require("../../constants/visaTypes.js");
var import_formatInterviewStoryAnswers = require("../functions/formatInterviewStoryAnswers.js");
class InterviewPromptBuilder {
  buildPrompt(input = {}) {
    return [
      this.buildBaseSystemPrompt(input),
      this.buildVisaSpecificPrompt(input.visaType),
      this.buildModeSpecificPrompt(input),
      this.buildScoringPrompt(),
      input.interviewType === import_interviewTypes.INTERVIEW_TYPES.LIVE ? this.buildLiveVoicePrompt() : "",
      this.buildRuntimeContext(input)
    ].filter(Boolean).join("\n\n");
  }
  buildBaseSystemPrompt({ userName, visaType, mode, interviewType } = {}) {
    return [
      import_baseAgent_prompt.default,
      `Applicant name: ${userName || "Applicant"}.`,
      `Visa type: ${visaType || "UNSPECIFIED"}.`,
      `Interview mode: ${mode || "UNSPECIFIED"}.`,
      `Interview type: ${interviewType || "UNSPECIFIED"}.`
    ].join("\n");
  }
  buildVisaSpecificPrompt(visaType) {
    if (visaType === import_visaTypes.VISA_TYPES.B1_B2) return import_b1b2_prompt.default;
    if (visaType === import_visaTypes.VISA_TYPES.F1) return import_f1_prompt.default;
    return "Visa context is not configured. Ask only general clarification questions until the visa type is valid.";
  }
  buildModeSpecificPrompt({ mode, retryCount = 0 } = {}) {
    if (mode === import_interviewModes.INTERVIEW_MODES.TRAINING) {
      return [
        import_trainingMode_prompt.default,
        `Current retry count for this question: ${retryCount}.`
      ].join("\n");
    }
    if (mode === import_interviewModes.INTERVIEW_MODES.SIMULATION) {
      return import_simulationMode_prompt.default;
    }
    return "Interview mode is not configured. Keep responses conservative and ask one question at a time.";
  }
  buildScoringPrompt() {
    return import_scoringRubric_prompt.default;
  }
  buildLiveVoicePrompt() {
    return import_liveVoice_prompt.default;
  }
  buildFinalEvaluationPrompt({ userName, visaType, mode, interviewType, previousAnswers = [], scores = [] } = {}) {
    return [
      "Create the final visa interview evaluation for the frontend.",
      `Applicant name: ${userName || "Applicant"}.`,
      `Visa type: ${visaType || "UNSPECIFIED"}.`,
      `Interview mode: ${mode || "UNSPECIFIED"}.`,
      `Interview type: ${interviewType || "UNSPECIFIED"}.`,
      `Answers:
${this.formatPreviousAnswers(previousAnswers)}`,
      `Scores:
${this.formatScores(scores)}`,
      "Include overall result, strengths, weaknesses, and a practical improvement plan.",
      "Do not guarantee approval or denial."
    ].join("\n");
  }
  buildRuntimeContext({ currentQuestion, previousAnswers = [], interviewStory = null } = {}) {
    return [
      currentQuestion ? `Current question: ${currentQuestion}` : "",
      this.buildInterviewStoryContext(interviewStory),
      `Previous answers:
${this.formatPreviousAnswers(previousAnswers)}`
    ].filter(Boolean).join("\n");
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
  formatPreviousAnswers(previousAnswers) {
    if (!Array.isArray(previousAnswers) || previousAnswers.length === 0) {
      return "No previous answers yet.";
    }
    return previousAnswers.map((answer, index) => `${index + 1}. ${typeof answer === "string" ? answer : answer.answer || ""}`).join("\n");
  }
  formatScores(scores) {
    if (!Array.isArray(scores) || scores.length === 0) {
      return "No scores yet.";
    }
    return scores.map((score, index) => `${index + 1}. ${score.totalScore ?? 0}/100`).join("\n");
  }
}
var InterviewPromptBuilder_default = InterviewPromptBuilder;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  InterviewPromptBuilder
});
