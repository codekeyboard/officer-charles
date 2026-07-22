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
var UsageTracker_exports = {};
__export(UsageTracker_exports, {
  UsageTracker: () => UsageTracker,
  default: () => UsageTracker_default
});
module.exports = __toCommonJS(UsageTracker_exports);
var import_estimateAzureCost = require("../functions/estimateAzureCost.js");
class UsageTracker {
  constructor({ rates = void 0 } = {}) {
    this.rates = rates;
    this.records = [];
  }
  trackUsage({
    userId,
    interviewId,
    provider,
    modelName,
    inputTokens = 0,
    outputTokens = 0,
    audioSeconds = 0,
    liveSessionSeconds = 0,
    providerResponseId = null,
    timestamp = (/* @__PURE__ */ new Date()).toISOString()
  } = {}) {
    const totalTokens = Number(inputTokens || 0) + Number(outputTokens || 0);
    const cost = (0, import_estimateAzureCost.estimateAzureCost)({
      modelName,
      inputTokens,
      outputTokens,
      audioSeconds,
      rates: this.rates
    });
    const record = {
      userId,
      interviewId,
      provider,
      modelName,
      inputTokens: Number(inputTokens || 0),
      outputTokens: Number(outputTokens || 0),
      totalTokens,
      audioSeconds: Number(audioSeconds || 0),
      liveSessionSeconds: Number(liveSessionSeconds || 0),
      estimatedCost: cost.estimatedCost,
      providerResponseId,
      timestamp
    };
    this.records.push(record);
    return record;
  }
  getUsageByInterview(interviewId) {
    return this.records.filter((record) => record.interviewId === interviewId);
  }
  getUsageByUser(userId) {
    return this.records.filter((record) => record.userId === userId);
  }
}
var UsageTracker_default = UsageTracker;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  UsageTracker
});
