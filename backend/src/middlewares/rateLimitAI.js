var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var rateLimitAI_exports = {};
__export(rateLimitAI_exports, {
  default: () => rateLimitAI_default,
  rateLimitAI: () => rateLimitAI
});
module.exports = __toCommonJS(rateLimitAI_exports);
var import_AppError = __toESM(require("../utils/classes/AppError.js"));
const buckets = /* @__PURE__ */ new Map();
function rateLimitAI({ windowMs = 6e4, maxRequests = 30 } = {}) {
  return (req, _res, next) => {
    const key = req.user?.id || req.ip || "anonymous";
    const now = Date.now();
    const bucket = buckets.get(key) || { count: 0, resetAt: now + windowMs };
    if (now > bucket.resetAt) {
      bucket.count = 0;
      bucket.resetAt = now + windowMs;
    }
    bucket.count += 1;
    buckets.set(key, bucket);
    if (bucket.count > maxRequests) {
      next(new import_AppError.default({
        statusCode: 429,
        publicMessage: "Too many AI requests. Please wait and try again.",
        internalMessage: `AI route rate limit exceeded for ${key}.`,
        errorCode: import_AppError.ERROR_CODES.QUOTA_EXCEEDED,
        metadata: {
          retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1e3)
        }
      }));
      return;
    }
    next();
  };
}
var rateLimitAI_default = rateLimitAI;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  rateLimitAI
});
