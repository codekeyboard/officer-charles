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
var estimateAzureCost_exports = {};
__export(estimateAzureCost_exports, {
  default: () => estimateAzureCost_default,
  estimateAzureCost: () => estimateAzureCost
});
module.exports = __toCommonJS(estimateAzureCost_exports);
const DEFAULT_RATES = Object.freeze({
  inputTokenPer1K: 0,
  outputTokenPer1K: 0,
  audioSecond: 0
});
function estimateAzureCost({
  modelName,
  inputTokens = 0,
  outputTokens = 0,
  audioSeconds = 0,
  rates = DEFAULT_RATES
} = {}) {
  const safeInputTokens = nonNegativeNumber(inputTokens);
  const safeOutputTokens = nonNegativeNumber(outputTokens);
  const safeAudioSeconds = nonNegativeNumber(audioSeconds);
  const inputCost = safeInputTokens / 1e3 * nonNegativeNumber(rates.inputTokenPer1K);
  const outputCost = safeOutputTokens / 1e3 * nonNegativeNumber(rates.outputTokenPer1K);
  const audioCost = safeAudioSeconds * nonNegativeNumber(rates.audioSecond);
  const estimatedCost = inputCost + outputCost + audioCost;
  return {
    modelName: String(modelName || "unknown"),
    inputTokens: safeInputTokens,
    outputTokens: safeOutputTokens,
    audioSeconds: safeAudioSeconds,
    currency: rates.currency || "USD",
    estimatedCost,
    breakdown: {
      inputCost,
      outputCost,
      audioCost
    }
  };
}
function nonNegativeNumber(value) {
  const numericValue = Number(value ?? 0);
  if (!Number.isFinite(numericValue) || numericValue < 0) {
    return 0;
  }
  return numericValue;
}
var estimateAzureCost_default = estimateAzureCost;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  estimateAzureCost
});
