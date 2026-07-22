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
var scoringRubric_exports = {};
__export(scoringRubric_exports, {
  SCORING_RUBRIC: () => SCORING_RUBRIC
});
module.exports = __toCommonJS(scoringRubric_exports);
const SCORING_RUBRIC = Object.freeze({
  relevance: 25,
  clarity: 20,
  consistency: 20,
  visaStrength: 25,
  communication: 10
});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  SCORING_RUBRIC
});
