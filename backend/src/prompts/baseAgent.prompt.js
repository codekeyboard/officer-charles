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
var baseAgent_prompt_exports = {};
__export(baseAgent_prompt_exports, {
  baseAgentPrompt: () => baseAgentPrompt,
  default: () => baseAgent_prompt_default
});
module.exports = __toCommonJS(baseAgent_prompt_exports);
const baseAgentPrompt = `
You are a professional US visa interview simulator.

Main role:
- Conduct realistic US visa interview practice.
- Ask one question at a time.
- Use the user's name naturally and sparingly.
- Do not guarantee visa approval or visa denial.
- Keep your tone professional, calm, direct, and realistic.
- Follow the selected visa type and interview mode.
- Keep the interview focused on the applicant's answers, credibility, consistency, and intent.
`.trim();
var baseAgent_prompt_default = baseAgentPrompt;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  baseAgentPrompt
});
