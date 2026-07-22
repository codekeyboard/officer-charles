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
var validateRequest_exports = {};
__export(validateRequest_exports, {
  default: () => validateRequest_default,
  validateRequest: () => validateRequest
});
module.exports = __toCommonJS(validateRequest_exports);
var import_interviewModes = require("../constants/interviewModes.js");
var import_visaTypes = require("../constants/visaTypes.js");
var import_AppError = __toESM(require("../utils/classes/AppError.js"));
var import_sanitizeUserInput = require("../utils/functions/sanitizeUserInput.js");
function validateRequest(schemaName) {
  return (req, _res, next) => {
    try {
      const body = req.body || {};
      if (["startChatInterview", "startLiveInterview"].includes(schemaName)) {
        validateVisaType(body.visaType);
        validateMode(body.mode);
        validateUserName(body.userName);
        req.body.userName = (0, import_sanitizeUserInput.sanitizeUserInput)(body.userName, { maxLength: 80 });
      }
      if (schemaName === "sendChatMessage") {
        validateRouteParam(req.params.interviewId, "interviewId");
        validateMessage(body.message);
        req.body.message = (0, import_sanitizeUserInput.sanitizeUserInput)(body.message, { maxLength: 4e3 });
      }
      if (schemaName === "completeChatInterview") {
        validateRouteParam(req.params.interviewId, "interviewId");
      }
      if (schemaName === "handleLiveTranscript") {
        validateRouteParam(req.params.sessionId, "sessionId");
        validateTranscript(body);
      }
      if (schemaName === "handleLiveEvent") {
        validateRouteParam(req.params.sessionId, "sessionId");
        if (!body || typeof body !== "object") {
          throw validationError("event body is required.");
        }
      }
      if (schemaName === "completeLiveInterview") {
        validateRouteParam(req.params.sessionId, "sessionId");
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}
function validateVisaType(visaType) {
  if (!Object.values(import_visaTypes.VISA_TYPES).includes(String(visaType || "").trim().toUpperCase())) {
    throw validationError("visaType must be B1_B2 or F1.", import_AppError.ERROR_CODES.INVALID_VISA_TYPE);
  }
}
function validateMode(mode) {
  if (!Object.values(import_interviewModes.INTERVIEW_MODES).includes(String(mode || "").trim().toUpperCase())) {
    throw validationError("mode must be TRAINING or SIMULATION.", import_AppError.ERROR_CODES.INVALID_INTERVIEW_MODE);
  }
}
function validateUserName(userName) {
  const cleanUserName = (0, import_sanitizeUserInput.sanitizeUserInput)(userName, { maxLength: 80 });
  if (!cleanUserName) {
    throw validationError("userName is required.");
  }
}
function validateMessage(message) {
  const cleanMessage = (0, import_sanitizeUserInput.sanitizeUserInput)(message, { maxLength: 4e3 });
  if (!cleanMessage) {
    throw validationError("message is required.");
  }
}
function validateTranscript(body) {
  const text = body?.text || body?.transcript || body?.delta;
  if (!(0, import_sanitizeUserInput.sanitizeUserInput)(text, { maxLength: 8e3 })) {
    throw validationError("transcript text is required.");
  }
}
function validateRouteParam(value, name) {
  if (!value || String(value).trim().length < 2) {
    throw validationError(`${name} is required.`);
  }
}
function validationError(message, errorCode = import_AppError.ERROR_CODES.AI_PROVIDER_ERROR) {
  return new import_AppError.default({
    statusCode: 400,
    publicMessage: message,
    internalMessage: message,
    errorCode
  });
}
var validateRequest_default = validateRequest;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  validateRequest
});
