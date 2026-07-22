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
var InterviewEvaluationEngine_exports = {};
__export(InterviewEvaluationEngine_exports, {
  InterviewEvaluationEngine: () => InterviewEvaluationEngine,
  default: () => InterviewEvaluationEngine_default
});
module.exports = __toCommonJS(InterviewEvaluationEngine_exports);
var import_interviewTypes = require("../../constants/interviewTypes.js");
var import_interviewModes = require("../../constants/interviewModes.js");
var import_formatFinalEvaluation = require("../functions/formatFinalEvaluation.js");
const CRITERIA = {
  relevance: {
    label: "answered the officer's question directly",
    weakness: "The answer could connect more directly to the question asked.",
    recommendation: "Begin with the direct answer, then add one supporting detail."
  },
  clarity: {
    label: "gave a clear and organized answer",
    weakness: "The answer needs clearer structure and more complete sentences.",
    recommendation: "Use two or three short sentences: answer, evidence, conclusion."
  },
  consistency: {
    label: "stayed consistent with earlier answers",
    weakness: "The answer may create consistency questions if it is not tied to earlier details.",
    recommendation: "Keep names, dates, funding details, and future plans consistent across answers."
  },
  visaStrength: {
    label: "included useful visa-specific evidence",
    weakness: "The answer needs stronger evidence about purpose, funding, ties, or return plans.",
    recommendation: "Add concrete facts such as sponsor, documents, program fit, job plan, family ties, or return timeline."
  },
  communication: {
    label: "communicated in a concise, confident way",
    weakness: "The answer could sound more confident and concise.",
    recommendation: "Remove filler and answer in a calm, direct tone."
  }
};
const CRITERIA_MAX = {
  relevance: 25,
  clarity: 20,
  consistency: 20,
  visaStrength: 25,
  communication: 10
};
class InterviewEvaluationEngine {
  generateFinalEvaluation({ session = {}, answers = [], scores = [], interviewType = session.interviewType } = {}) {
    const averageScore = this.calculateAverageScore(scores);
    const questionReviews = this.buildQuestionReviews(answers, scores);
    const strengths = this.summarizeStrengths(scores, questionReviews);
    const weaknesses = this.summarizeWeaknesses(scores, questionReviews);
    const improvementPlan = this.createImprovementPlan(weaknesses, scores, interviewType);
    const label = this.getResultLabel(averageScore);
    const evaluation = {
      sessionId: session.id,
      interviewType,
      totalScore: averageScore,
      label,
      summary: this.buildSummary(label, interviewType, session.mode),
      strengths,
      weaknesses,
      recommendations: improvementPlan,
      improvements: improvementPlan,
      questionReviews,
      answerCount: answers.length,
      scoreCount: scores.length,
      disclaimer: "Practice assessment only. This does not predict or guarantee a visa outcome."
    };
    return (0, import_formatFinalEvaluation.formatFinalEvaluation)(evaluation);
  }
  calculateAverageScore(scores = []) {
    if (!Array.isArray(scores) || scores.length === 0) {
      return 0;
    }
    const total = scores.reduce((sum, score) => sum + Number(score.totalScore || 0), 0);
    return Math.round(total / scores.length);
  }
  summarizeStrengths(scores = [], questionReviews = []) {
    const averages = this.averageCriteria(scores);
    const strengths = Object.entries(averages).filter(([key, value]) => this.scoreRatio(key, value) >= 0.75).sort((a, b) => this.scoreRatio(b[0], b[1]) - this.scoreRatio(a[0], a[1])).map(([key]) => this.capitalize(CRITERIA[key]?.label || key));
    if (strengths.length) {
      return this.unique(strengths).slice(0, 5);
    }
    return this.unique(questionReviews.flatMap((review) => review.strengths || [])).slice(0, 5);
  }
  summarizeWeaknesses(scores = [], questionReviews = []) {
    const averages = this.averageCriteria(scores);
    const weaknesses = Object.entries(averages).filter(([key, value]) => this.scoreRatio(key, value) < 0.65).sort((a, b) => this.scoreRatio(a[0], a[1]) - this.scoreRatio(b[0], b[1])).map(([key]) => CRITERIA[key]?.weakness || `Needs more work on ${key}.`);
    if (weaknesses.length) {
      return this.unique(weaknesses).slice(0, 5);
    }
    const reviewWeaknesses = this.unique(questionReviews.flatMap((review) => review.weaknesses || []).filter((item) => item && item !== "No major risk in this answer."));
    return reviewWeaknesses.slice(0, 5);
  }
  createImprovementPlan(weaknesses = [], scores = [], interviewType = import_interviewTypes.INTERVIEW_TYPES.CHAT) {
    const lowestCriteria = Object.entries(this.averageCriteria(scores)).filter(([key]) => CRITERIA[key]).sort((a, b) => this.scoreRatio(a[0], a[1]) - this.scoreRatio(b[0], b[1])).slice(0, 3).map(([key]) => CRITERIA[key].recommendation);
    const plan = lowestCriteria.length > 0 ? lowestCriteria : weaknesses.length > 0 ? weaknesses.map((weakness) => `Practice this area: ${weakness}`) : ["Continue practicing with specific, consistent answers."];
    if (interviewType === import_interviewTypes.INTERVIEW_TYPES.LIVE) {
      plan.push("Practice speaking answers aloud in short, confident sentences.");
    }
    return this.unique(plan).slice(0, 5);
  }
  getResultLabel(score) {
    if (score >= 90) return "EXCELLENT";
    if (score >= 70) return "GOOD";
    if (score >= 50) return "NEEDS_IMPROVEMENT";
    return "WEAK";
  }
  buildSummary(label, interviewType, mode) {
    const channel = interviewType === import_interviewTypes.INTERVIEW_TYPES.LIVE ? "live voice interview" : "chat interview";
    const modeLabel = mode === import_interviewModes.INTERVIEW_MODES.SIMULATION ? "real simulation" : "training";
    return `The ${modeLabel} ${channel} is complete. Your current practice result is ${label}.`;
  }
  buildQuestionReviews(answers = [], scores = []) {
    return answers.map((answer, index) => {
      const score = scores[index] || {};
      const parts = score.scores || {};
      const strengths = this.criteriaByThreshold(parts, 0.75, "high").map((key) => this.capitalize(CRITERIA[key]?.label || key));
      const weakKeys = this.criteriaByThreshold(parts, 0.65, "low");
      const weaknesses = weakKeys.map((key) => CRITERIA[key]?.weakness || `Needs more work on ${key}.`);
      const recommendationKey = weakKeys[0] || this.lowestCriterion(parts);
      return {
        number: index + 1,
        question: answer.question || score.question || "Interview question",
        answerSummary: this.summarizeAnswer(answer.answer),
        score: Number(score.totalScore || 0),
        strengths: strengths.length ? strengths.slice(0, 2) : ["You gave a usable answer that can be strengthened with more specific evidence."],
        weaknesses: weaknesses.length ? weaknesses.slice(0, 2) : ["No major risk in this answer."],
        recommendation: CRITERIA[recommendationKey]?.recommendation || "Keep this answer concise, truthful, and supported by specific facts."
      };
    });
  }
  criteriaByThreshold(parts = {}, threshold, direction) {
    return Object.entries(parts).filter(([key, value]) => {
      const ratio = this.scoreRatio(key, value);
      return direction === "high" ? ratio >= threshold : ratio < threshold;
    }).sort((a, b) => direction === "high" ? this.scoreRatio(b[0], b[1]) - this.scoreRatio(a[0], a[1]) : this.scoreRatio(a[0], a[1]) - this.scoreRatio(b[0], b[1])).map(([key]) => key).filter((key) => CRITERIA[key]);
  }
  lowestCriterion(parts = {}) {
    return Object.entries(parts).filter(([key]) => CRITERIA[key]).sort((a, b) => this.scoreRatio(a[0], a[1]) - this.scoreRatio(b[0], b[1]))[0]?.[0] || "visaStrength";
  }
  averageCriteria(scores = []) {
    const totals = {};
    const counts = {};
    scores.forEach((score) => {
      Object.entries(score.scores || {}).forEach(([key, value]) => {
        totals[key] = (totals[key] || 0) + Number(value || 0);
        counts[key] = (counts[key] || 0) + 1;
      });
    });
    return Object.fromEntries(Object.entries(totals).map(([key, total]) => [key, total / counts[key]]));
  }
  scoreRatio(key, value) {
    const max = CRITERIA_MAX[key] || 100;
    return Number(value || 0) / max;
  }
  summarizeAnswer(answer) {
    const text = String(answer || "").replace(/\s+/g, " ").trim();
    if (!text) return "No answer recorded.";
    return text.length > 180 ? `${text.slice(0, 177).trim()}...` : text;
  }
  unique(items = []) {
    return [...new Set(items.map((item) => String(item || "").trim()).filter(Boolean))];
  }
  capitalize(value) {
    const text = String(value || "").trim();
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
  }
}
var InterviewEvaluationEngine_default = InterviewEvaluationEngine;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  InterviewEvaluationEngine
});
