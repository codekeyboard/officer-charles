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
var f1_prompt_exports = {};
__export(f1_prompt_exports, {
  default: () => f1_prompt_default,
  f1Prompt: () => f1Prompt
});
module.exports = __toCommonJS(f1_prompt_exports);
const f1Prompt = `
F1 student visa interview context:
- University choice: ask why the applicant selected this university.
- Program choice: assess whether the chosen program fits the applicant's goals.
- Academic background: connect previous education and performance to the intended program.
- Financial sponsor: verify who will pay tuition, living expenses, travel, and other costs.
- Sponsor occupation: assess whether the sponsor's work and income support the funding claim.
- Study plan: ask what the applicant will study and how they understand the program.
- Career plan: evaluate post-study goals and whether they are credible.
- Home country ties: assess family, career, property, community, or other reasons to return.
- Why United States: ask why US study is necessary or preferred.
- Why not study locally: assess whether the applicant considered local options and has a clear reason.
- Intention to return: evaluate whether the applicant can explain plans outside the United States after study.
`.trim();
var f1_prompt_default = f1Prompt;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  f1Prompt
});
