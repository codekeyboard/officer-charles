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
var parseAgentJsonResponse_exports = {};
__export(parseAgentJsonResponse_exports, {
  default: () => parseAgentJsonResponse_default,
  parseAgentJsonResponse: () => parseAgentJsonResponse
});
module.exports = __toCommonJS(parseAgentJsonResponse_exports);
const ALLOWED_NEXT_ACTIONS = /* @__PURE__ */ new Set(["ASK_NEXT_QUESTION", "REPEAT_QUESTION", "COMPLETE_INTERVIEW"]);
function parseAgentJsonResponse(rawResponse) {
  const text = String(rawResponse ?? "").trim();
  if (!text) {
    return normalizeAgentResponse({});
  }
  const jsonText = extractJsonText(text);
  if (!jsonText) {
    return normalizeAgentResponse({ assistantMessage: text });
  }
  try {
    return normalizeAgentResponse(JSON.parse(jsonText));
  } catch {
    return normalizeAgentResponse({ assistantMessage: text });
  }
}
function extractJsonText(text) {
  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1).trim();
  }
  return "";
}
function normalizeAgentResponse(value) {
  const scores = value?.scores ?? {};
  const feedback = value?.feedback ?? {};
  const nextAction = ALLOWED_NEXT_ACTIONS.has(value?.nextAction) ? value.nextAction : "ASK_NEXT_QUESTION";
  return {
    assistantMessage: String(value?.assistantMessage ?? ""),
    answerAccepted: Boolean(value?.answerAccepted),
    shouldRepeatQuestion: Boolean(value?.shouldRepeatQuestion),
    currentQuestion: String(value?.currentQuestion ?? ""),
    nextQuestion: String(value?.nextQuestion ?? ""),
    totalScore: clampScore(value?.totalScore, 0, 100),
    scores: {
      relevance: clampScore(scores.relevance, 0, 25),
      clarity: clampScore(scores.clarity, 0, 20),
      consistency: clampScore(scores.consistency, 0, 20),
      visaStrength: clampScore(scores.visaStrength, 0, 25),
      communication: clampScore(scores.communication, 0, 10)
    },
    feedback: {
      good: String(feedback.good ?? ""),
      weak: String(feedback.weak ?? ""),
      improvement: String(feedback.improvement ?? "")
    },
    nextAction
  };
}
function clampScore(value, min, max) {
  const numericValue = Number(value ?? 0);
  if (!Number.isFinite(numericValue)) return min;
  return Math.min(max, Math.max(min, numericValue));
}
var parseAgentJsonResponse_default = parseAgentJsonResponse;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  parseAgentJsonResponse
});
