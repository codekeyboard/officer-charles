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
var QuotaChecker_exports = {};
__export(QuotaChecker_exports, {
  QuotaChecker: () => QuotaChecker,
  default: () => QuotaChecker_default
});
module.exports = __toCommonJS(QuotaChecker_exports);
var import_AppError = require("./AppError.js");
class QuotaChecker {
  constructor({
    freeChatLimit = 1,
    freeLiveLimit = 1,
    paidChatLimit = 100,
    paidLiveLimit = 50
  } = {}) {
    this.limits = {
      freeChatLimit,
      freeLiveLimit,
      paidChatLimit,
      paidLiveLimit
    };
    this.usage = /* @__PURE__ */ new Map();
    this.activeSubscriptions = /* @__PURE__ */ new Set();
  }
  hasActiveSubscription(userId) {
    return this.activeSubscriptions.has(userId);
  }
  setActiveSubscription(userId, isActive = true) {
    if (isActive) {
      this.activeSubscriptions.add(userId);
    } else {
      this.activeSubscriptions.delete(userId);
    }
  }
  checkQuota({ userId, interviewType }) {
    const normalizedType = String(interviewType || "").toUpperCase();
    const usage = this.getUserUsage(userId);
    const isPaid = this.hasActiveSubscription(userId);
    const limit = this.getLimit(normalizedType, isPaid);
    const used = normalizedType === "LIVE" ? usage.live : usage.chat;
    return {
      allowed: used < limit,
      used,
      remaining: Math.max(0, limit - used),
      limit,
      isPaid
    };
  }
  assertQuotaAvailable(params) {
    const quota = this.checkQuota(params);
    if (!quota.allowed) {
      throw new import_AppError.AppError({
        statusCode: 403,
        publicMessage: "Interview quota exceeded.",
        internalMessage: `Quota exceeded for ${params.interviewType}.`,
        errorCode: import_AppError.ERROR_CODES.QUOTA_EXCEEDED,
        metadata: quota,
        isOperational: true
      });
    }
    return quota;
  }
  decrementQuota({ userId, interviewType }) {
    const normalizedType = String(interviewType || "").toUpperCase();
    const usage = this.getUserUsage(userId);
    if (normalizedType === "LIVE") {
      usage.live += 1;
    } else {
      usage.chat += 1;
    }
    this.usage.set(userId, usage);
    return this.checkQuota({ userId, interviewType: normalizedType });
  }
  getUserUsage(userId) {
    if (!this.usage.has(userId)) {
      this.usage.set(userId, { chat: 0, live: 0 });
    }
    return this.usage.get(userId);
  }
  getLimit(interviewType, isPaid) {
    if (interviewType === "LIVE") {
      return isPaid ? this.limits.paidLiveLimit : this.limits.freeLiveLimit;
    }
    return isPaid ? this.limits.paidChatLimit : this.limits.freeChatLimit;
  }
}
var QuotaChecker_default = QuotaChecker;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  QuotaChecker
});
