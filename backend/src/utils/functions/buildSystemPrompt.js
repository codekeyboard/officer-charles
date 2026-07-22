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
var buildSystemPrompt_exports = {};
__export(buildSystemPrompt_exports, {
  buildSystemPrompt: () => buildSystemPrompt,
  default: () => buildSystemPrompt_default
});
module.exports = __toCommonJS(buildSystemPrompt_exports);
var import_baseAgent_prompt = __toESM(require("../../prompts/baseAgent.prompt.js"));
var import_scoringRubric_prompt = __toESM(require("../../prompts/scoringRubric.prompt.js"));
var import_liveVoice_prompt = __toESM(require("../../prompts/liveVoice.prompt.js"));
var import_interviewModes = require("../../constants/interviewModes.js");
var import_interviewTypes = require("../../constants/interviewTypes.js");
var import_buildVisaContext = require("./buildVisaContext.js");
var import_buildTrainingPrompt = require("./buildTrainingPrompt.js");
var import_buildSimulationPrompt = require("./buildSimulationPrompt.js");
var import_formatInterviewStoryAnswers = require("./formatInterviewStoryAnswers.js");
function buildSystemPrompt({
  userName,
  visaType,
  mode,
  interviewType,
  currentQuestion = "",
  retryCount = 0,
  previousAnswers = [],
  maxRetryCount = 3,
  interviewStory = null
} = {}) {
  const normalizedMode = String(mode || "").trim().toUpperCase();
  const normalizedInterviewType = String(interviewType || "").trim().toUpperCase();
  const visaContext = (0, import_buildVisaContext.buildVisaContext)(visaType);
  const modePrompt = normalizedMode === import_interviewModes.INTERVIEW_MODES.TRAINING ? (0, import_buildTrainingPrompt.buildTrainingPrompt)({ retryCount, maxRetryCount }) : (0, import_buildSimulationPrompt.buildSimulationPrompt)();
  const previousAnswerText = Array.isArray(previousAnswers) && previousAnswers.length > 0 ? previousAnswers.map((answer, index) => `${index + 1}. ${String(answer).trim()}`).join("\n") : "No previous answers yet.";
  const promptSections = [
    import_baseAgent_prompt.default,
    `Applicant name: ${String(userName || "").trim() || "Applicant"}.`,
    `Selected visa type: ${String(visaType || "").trim()}.`,
    `Selected interview mode: ${normalizedMode || "UNSPECIFIED"}.`,
    `Selected interview type: ${normalizedInterviewType || "UNSPECIFIED"}.`,
    visaContext,
    modePrompt,
    import_scoringRubric_prompt.default,
    buildInterviewStoryContext(interviewStory),
    currentQuestion ? `Current question: ${String(currentQuestion).trim()}` : "",
    `Previous answers:
${previousAnswerText}`
  ];
  if (normalizedInterviewType === import_interviewTypes.INTERVIEW_TYPES.LIVE) {
    promptSections.push(import_liveVoice_prompt.default);
  }
  return promptSections.filter(Boolean).join("\n\n");
}
function buildInterviewStoryContext(interviewStory) {
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
var buildSystemPrompt_default = buildSystemPrompt;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  buildSystemPrompt
});
