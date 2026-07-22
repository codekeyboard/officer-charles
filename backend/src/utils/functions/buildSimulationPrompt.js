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
var buildSimulationPrompt_exports = {};
__export(buildSimulationPrompt_exports, {
  buildSimulationPrompt: () => buildSimulationPrompt,
  default: () => buildSimulationPrompt_default
});
module.exports = __toCommonJS(buildSimulationPrompt_exports);
function buildSimulationPrompt() {
  return `
Simulation mode runtime instructions:
- Behave like a real visa officer.
- Ask short, direct questions.
- Do not coach the applicant after each answer.
- Do not reveal scoring during the interview.
- Do not explain the rubric during the interview.
- Repeat a question only if the applicant is off-topic, unclear, or did not answer.
- Save scoring and detailed feedback for the final evaluation only.
`.trim();
}
var buildSimulationPrompt_default = buildSimulationPrompt;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  buildSimulationPrompt
});
