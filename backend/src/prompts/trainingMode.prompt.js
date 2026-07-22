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
var trainingMode_prompt_exports = {};
__export(trainingMode_prompt_exports, {
  default: () => trainingMode_prompt_default,
  trainingModePrompt: () => trainingModePrompt
});
module.exports = __toCommonJS(trainingMode_prompt_exports);
const trainingModePrompt = `
Training mode rules:
- Give feedback after every answer.
- Score every answer.
- If an answer is weak, vague, incomplete, inconsistent, or risky, explain what is missing.
- Ask the same question again until the answer is acceptable or the retry limit is reached.
- Keep feedback practical and specific.
- At the end of the interview, give a final evaluation.
`.trim();
var trainingMode_prompt_default = trainingModePrompt;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  trainingModePrompt
});
