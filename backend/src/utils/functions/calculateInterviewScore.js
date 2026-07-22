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
var calculateInterviewScore_exports = {};
__export(calculateInterviewScore_exports, {
  SCORE_LABELS: () => SCORE_LABELS,
  calculateInterviewScore: () => calculateInterviewScore,
  default: () => calculateInterviewScore_default
});
module.exports = __toCommonJS(calculateInterviewScore_exports);
var import_scoringRubric = require("../../constants/scoringRubric.js");
const SCORE_LABELS = Object.freeze({
  EXCELLENT: "EXCELLENT",
  GOOD: "GOOD",
  NEEDS_IMPROVEMENT: "NEEDS_IMPROVEMENT",
  WEAK: "WEAK"
});
function calculateInterviewScore(scoreParts = {}) {
  const scores = {
    relevance: validatePart("relevance", scoreParts.relevance, import_scoringRubric.SCORING_RUBRIC.relevance),
    clarity: validatePart("clarity", scoreParts.clarity, import_scoringRubric.SCORING_RUBRIC.clarity),
    consistency: validatePart("consistency", scoreParts.consistency, import_scoringRubric.SCORING_RUBRIC.consistency),
    visaStrength: validatePart("visaStrength", scoreParts.visaStrength, import_scoringRubric.SCORING_RUBRIC.visaStrength),
    communication: validatePart("communication", scoreParts.communication, import_scoringRubric.SCORING_RUBRIC.communication)
  };
  const totalScore = Object.values(scores).reduce((sum, value) => sum + value, 0);
  return {
    totalScore,
    label: getScoreLabel(totalScore),
    scores
  };
}
function validatePart(key, value, maxValue) {
  const numericValue = Number(value ?? 0);
  if (!Number.isFinite(numericValue)) {
    throw new Error(`${key} score must be a valid number.`);
  }
  if (numericValue < 0 || numericValue > maxValue) {
    throw new Error(`${key} score must be between 0 and ${maxValue}.`);
  }
  return numericValue;
}
function getScoreLabel(totalScore) {
  if (totalScore >= 90) return SCORE_LABELS.EXCELLENT;
  if (totalScore >= 70) return SCORE_LABELS.GOOD;
  if (totalScore >= 50) return SCORE_LABELS.NEEDS_IMPROVEMENT;
  return SCORE_LABELS.WEAK;
}
var calculateInterviewScore_default = calculateInterviewScore;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  SCORE_LABELS,
  calculateInterviewScore
});
