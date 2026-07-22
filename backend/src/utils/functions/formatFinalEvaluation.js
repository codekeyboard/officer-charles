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
var formatFinalEvaluation_exports = {};
__export(formatFinalEvaluation_exports, {
  default: () => formatFinalEvaluation_default,
  formatFinalEvaluation: () => formatFinalEvaluation
});
module.exports = __toCommonJS(formatFinalEvaluation_exports);
function formatFinalEvaluation(evaluation = {}) {
  const totalScore = Number(evaluation.totalScore ?? evaluation.overallScore ?? 0);
  const label = evaluation.label || evaluation.recommendation || "NEEDS_REVIEW";
  const strengths = toList(evaluation.strengths);
  const weaknesses = toList(evaluation.weaknesses);
  const recommendations = toList(evaluation.recommendations ?? evaluation.improvements ?? evaluation.improvementAreas);
  const questionReviews = Array.isArray(evaluation.questionReviews) ? evaluation.questionReviews : [];
  const summary = String(evaluation.summary || "Interview evaluation is complete.");
  const disclaimer = evaluation.disclaimer || "Practice assessment only. This does not predict or guarantee a visa outcome.";
  const message = buildMessage({
    label,
    totalScore,
    summary,
    strengths,
    weaknesses,
    recommendations,
    questionReviews,
    disclaimer
  });
  return {
    title: "Final Interview Evaluation",
    summary,
    totalScore,
    label,
    strengths,
    weaknesses,
    recommendations,
    improvements: recommendations,
    questionReviews,
    disclaimer,
    message
  };
}
function toList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }
  return [];
}
function buildMessage({ label, totalScore, summary, strengths, weaknesses, recommendations, questionReviews, disclaimer }) {
  const lines = [
    `Final evaluation - ${label} (${totalScore}/100)`,
    "",
    "Readiness summary",
    summary,
    "",
    "Question-by-question review"
  ];
  if (questionReviews.length) {
    questionReviews.forEach((review, index) => {
      lines.push(`${index + 1}. Question: ${review.question}`);
      lines.push(`   Answer summary: ${review.answerSummary}`);
      lines.push(`   What worked: ${toList(review.strengths).join("; ") || "A usable answer was provided."}`);
      lines.push(`   Needs improvement: ${toList(review.weaknesses).join("; ") || "No major risk in this answer."}`);
      lines.push(`   Recommendation: ${review.recommendation || "Keep the answer specific, truthful, and concise."}`);
    });
  } else {
    lines.push("No answered questions were available for review.");
  }
  lines.push(
    "",
    "Strengths",
    ...listOrFallback(strengths, "No clear strength recorded yet."),
    "",
    "Weaknesses / risks",
    ...listOrFallback(weaknesses, "No major weakness detected."),
    "",
    "Recommendations",
    ...listOrFallback(recommendations, "Continue practicing with specific, consistent answers."),
    "",
    "Note",
    disclaimer
  );
  return lines.join("\n");
}
function listOrFallback(items, fallback) {
  const list = toList(items);
  return (list.length ? list : [fallback]).map((item) => `- ${item}`);
}
var formatFinalEvaluation_default = formatFinalEvaluation;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  formatFinalEvaluation
});
