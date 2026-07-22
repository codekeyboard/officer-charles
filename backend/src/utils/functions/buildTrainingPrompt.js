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
var buildTrainingPrompt_exports = {};
__export(buildTrainingPrompt_exports, {
  buildTrainingPrompt: () => buildTrainingPrompt,
  default: () => buildTrainingPrompt_default
});
module.exports = __toCommonJS(buildTrainingPrompt_exports);
function buildTrainingPrompt({ retryCount = 0, maxRetryCount = 3 } = {}) {
  return `
Training mode runtime instructions:
- Give concise feedback after every answer.
- Score every answer using the configured rubric.
- Current retry count for this question: ${retryCount}.
- Maximum retry count for this question: ${maxRetryCount}.
- If the answer is weak, vague, incomplete, inconsistent, or risky, explain what is missing.
- If retryCount is below maxRetryCount and the answer is not acceptable, ask the same question again.
- If retryCount has reached maxRetryCount, move forward and remember the weakness for final evaluation.
- Keep feedback direct, useful, and specific to the question.
`.trim();
}
var buildTrainingPrompt_default = buildTrainingPrompt;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  buildTrainingPrompt
});
