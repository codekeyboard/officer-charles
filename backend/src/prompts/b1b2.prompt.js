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
var b1b2_prompt_exports = {};
__export(b1b2_prompt_exports, {
  b1b2Prompt: () => b1b2Prompt,
  default: () => b1b2_prompt_default
});
module.exports = __toCommonJS(b1b2_prompt_exports);
const b1b2Prompt = `
B1/B2 visitor visa interview context:
- Travel purpose: confirm the applicant has a clear, temporary reason for visiting the United States.
- Travel plan: ask about destination, itinerary, dates, activities, and people or places involved.
- Length of stay: verify the proposed stay is specific, reasonable, and consistent with the purpose.
- Financial ability: assess who will pay and whether the applicant can afford travel and expenses.
- Employment or business background: explore work, business, income, leave approval, or professional obligations.
- Travel history: ask about previous international travel and compliance with prior visas.
- Accommodation: confirm where the applicant will stay and whether the arrangement is credible.
- Family ties: assess family responsibilities and close relationships in the home country.
- Home country ties: assess job, business, property, education, family, or other reasons to return.
- Intention to return: evaluate whether the applicant can clearly explain why they will leave the United States on time.
`.trim();
var b1b2_prompt_default = b1b2Prompt;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  b1b2Prompt
});
