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
var InterviewScoringEngine_exports = {};
__export(InterviewScoringEngine_exports, {
  InterviewScoringEngine: () => InterviewScoringEngine,
  default: () => InterviewScoringEngine_default
});
module.exports = __toCommonJS(InterviewScoringEngine_exports);
var import_calculateInterviewScore = require("../functions/calculateInterviewScore.js");
var import_formatInterviewStoryAnswers = require("../functions/formatInterviewStoryAnswers.js");
class InterviewScoringEngine {
  scoreAnswer({ question = "", answer = "", visaType = "", previousAnswers = [], interviewStory = null } = {}) {
    const normalizedAnswer = String(answer || "").trim();
    const lowerAnswer = normalizedAnswer.toLowerCase();
    const storyText = interviewStory ? [
      interviewStory.storyText || "",
      (0, import_formatInterviewStoryAnswers.interviewStoryAnswerText)(interviewStory.answers)
    ].join(" ") : "";
    const previousText = [
      previousAnswers.map((item) => String(item.answer || item)).join(" "),
      storyText
    ].join(" ").toLowerCase();
    const scores = {
      relevance: this.scoreRelevance(question, lowerAnswer),
      clarity: this.scoreClarity(normalizedAnswer),
      consistency: this.scoreConsistency(lowerAnswer, previousText),
      visaStrength: this.scoreVisaStrength(lowerAnswer, visaType),
      communication: this.scoreCommunication(normalizedAnswer)
    };
    const { totalScore } = (0, import_calculateInterviewScore.calculateInterviewScore)(scores);
    const answerAccepted = totalScore >= 70;
    const shouldRepeatQuestion = totalScore < 50;
    return {
      answerAccepted,
      totalScore,
      scores,
      feedback: {
        good: this.buildPositiveFeedback(scores),
        weak: this.buildWeakFeedback(scores),
        improvement: this.buildImprovementFeedback(scores)
      },
      shouldRepeatQuestion,
      nextAction: shouldRepeatQuestion ? "REPEAT_QUESTION" : "ASK_NEXT_QUESTION"
    };
  }
  scoreRelevance(question, lowerAnswer) {
    const questionKeywords = String(question || "").toLowerCase().split(/\W+/).filter((word) => word.length > 4);
    const matches = questionKeywords.filter((word) => lowerAnswer.includes(word)).length;
    return Math.min(25, 10 + matches * 5);
  }
  scoreClarity(answer) {
    if (!answer) return 0;
    if (answer.length < 20) return 8;
    if (answer.length < 60) return 14;
    return /because|therefore|after|before|during|specifically/i.test(answer) ? 20 : 17;
  }
  scoreConsistency(lowerAnswer, previousText) {
    if (!previousText) return 18;
    const riskyContradictions = ["no job", "unemployed", "no sponsor", "not returning"];
    const contradictionFound = riskyContradictions.some((phrase) => lowerAnswer.includes(phrase) && !previousText.includes(phrase));
    return contradictionFound ? 10 : 20;
  }
  scoreVisaStrength(lowerAnswer, visaType) {
    const commonSignals = ["return", "job", "family", "sponsor", "fund", "study", "business", "property", "plan"];
    const visaSignals = visaType === "F1" ? ["university", "program", "tuition", "career", "degree"] : ["visit", "tourism", "conference", "vacation", "temporary"];
    const matches = [...commonSignals, ...visaSignals].filter((signal) => lowerAnswer.includes(signal)).length;
    return Math.min(25, 8 + matches * 3);
  }
  scoreCommunication(answer) {
    if (!answer) return 0;
    const sentenceCount = answer.split(/[.!?]+/).filter(Boolean).length;
    if (sentenceCount >= 2 && answer.length >= 40) return 10;
    if (answer.length >= 20) return 7;
    return 4;
  }
  buildPositiveFeedback(scores) {
    const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
    return best ? `Strongest area: ${best[0]}.` : "The answer was received.";
  }
  buildWeakFeedback(scores) {
    const weak = Object.entries(scores).filter(([, value]) => value < 12).map(([key]) => key);
    return weak.length ? `Needs work: ${weak.join(", ")}.` : "No major weakness detected.";
  }
  buildImprovementFeedback(scores) {
    if (scores.visaStrength < 18) {
      return "Add stronger facts about funding, intent, ties, or study/travel purpose.";
    }
    if (scores.clarity < 15) {
      return "Answer with clearer, more specific details.";
    }
    return "Keep answers concise, specific, and consistent.";
  }
}
var InterviewScoringEngine_default = InterviewScoringEngine;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  InterviewScoringEngine
});
