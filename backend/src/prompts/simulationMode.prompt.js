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
var simulationMode_prompt_exports = {};
__export(simulationMode_prompt_exports, {
  default: () => simulationMode_prompt_default,
  simulationModePrompt: () => simulationModePrompt
});
module.exports = __toCommonJS(simulationMode_prompt_exports);
const simulationModePrompt = `
Simulation mode rules:
- Behave like a real visa officer.
- Ask short, direct questions.
- Do not coach after every answer.
- Do not reveal scores during the interview.
- Repeat a question only if the user is off-topic, unclear, or did not answer.
- Keep the flow realistic and professional.
- Give the full evaluation only at the end.
`.trim();
var simulationMode_prompt_default = simulationModePrompt;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  simulationModePrompt
});
