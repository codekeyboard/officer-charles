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
var AppError_exports = {};
__export(AppError_exports, {
  AppError: () => AppError,
  ERROR_CODES: () => ERROR_CODES,
  default: () => AppError_default
});
module.exports = __toCommonJS(AppError_exports);
const ERROR_CODES = Object.freeze({
  AI_CONFIG_ERROR: "AI_CONFIG_ERROR",
  AI_PROVIDER_ERROR: "AI_PROVIDER_ERROR",
  AI_RESPONSE_PARSE_ERROR: "AI_RESPONSE_PARSE_ERROR",
  EVALUATION_UNAVAILABLE: "EVALUATION_UNAVAILABLE",
  INVALID_INTERVIEW_TYPE: "INVALID_INTERVIEW_TYPE",
  INVALID_VISA_TYPE: "INVALID_VISA_TYPE",
  INVALID_INTERVIEW_MODE: "INVALID_INTERVIEW_MODE",
  QUOTA_EXCEEDED: "QUOTA_EXCEEDED",
  LIVE_SESSION_ERROR: "LIVE_SESSION_ERROR",
  AZURE_AUTH_ERROR: "AZURE_AUTH_ERROR"
});
class AppError extends Error {
  constructor({
    statusCode = 500,
    publicMessage = "Something went wrong.",
    internalMessage = publicMessage,
    errorCode = ERROR_CODES.AI_PROVIDER_ERROR,
    metadata = {},
    isOperational = true
  } = {}) {
    super(internalMessage);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.publicMessage = publicMessage;
    this.internalMessage = internalMessage;
    this.errorCode = errorCode;
    this.metadata = metadata;
    this.isOperational = isOperational;
    Error.captureStackTrace?.(this, AppError);
  }
  toPublicResponse() {
    return {
      errorCode: this.errorCode,
      message: this.publicMessage,
      metadata: this.metadata
    };
  }
}
var AppError_default = AppError;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AppError,
  ERROR_CODES
});
