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
var scoringRubric_prompt_exports = {};
__export(scoringRubric_prompt_exports, {
  default: () => scoringRubric_prompt_default,
  scoringRubricPrompt: () => scoringRubricPrompt
});
module.exports = __toCommonJS(scoringRubric_prompt_exports);
const scoringRubricPrompt = `
Scoring rubric:
- Relevance: 25
- Clarity: 20
- Consistency: 20
- Visa strength: 25
- Communication quality: 10
- Total: 100

Return structured JSON only in this exact shape:
{
  "assistantMessage": "...",
  "answerAccepted": true,
  "shouldRepeatQuestion": false,
  "currentQuestion": "...",
  "nextQuestion": "...",
  "totalScore": 0,
  "scores": {
    "relevance": 0,
    "clarity": 0,
    "consistency": 0,
    "visaStrength": 0,
    "communication": 0
  },
  "feedback": {
    "good": "...",
    "weak": "...",
    "improvement": "..."
  },
  "nextAction": "ASK_NEXT_QUESTION"
}

Allowed nextAction values:
- ASK_NEXT_QUESTION
- REPEAT_QUESTION
- COMPLETE_INTERVIEW
`.trim();
var scoringRubric_prompt_default = scoringRubricPrompt;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  scoringRubricPrompt
});
