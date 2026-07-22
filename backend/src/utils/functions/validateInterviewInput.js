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
var validateInterviewInput_exports = {};
__export(validateInterviewInput_exports, {
  default: () => validateInterviewInput_default,
  validateInterviewInput: () => validateInterviewInput
});
module.exports = __toCommonJS(validateInterviewInput_exports);
var import_interviewModes = require("../../constants/interviewModes.js");
var import_interviewTypes = require("../../constants/interviewTypes.js");
var import_visaTypes = require("../../constants/visaTypes.js");
function validateInterviewInput({ visaType, mode, interviewType, userName } = {}) {
  const errors = [];
  const normalizedVisaType = String(visaType || "").trim().toUpperCase();
  const normalizedMode = String(mode || "").trim().toUpperCase();
  const normalizedInterviewType = String(interviewType || "").trim().toUpperCase();
  const cleanUserName = String(userName || "").trim();
  if (!Object.values(import_visaTypes.VISA_TYPES).includes(normalizedVisaType)) {
    errors.push("visaType must be B1_B2 or F1.");
  }
  if (!Object.values(import_interviewModes.INTERVIEW_MODES).includes(normalizedMode)) {
    errors.push("mode must be TRAINING or SIMULATION.");
  }
  if (!Object.values(import_interviewTypes.INTERVIEW_TYPES).includes(normalizedInterviewType)) {
    errors.push("interviewType must be CHAT or LIVE.");
  }
  if (!cleanUserName) {
    errors.push("userName is required.");
  } else if (cleanUserName.length > 80) {
    errors.push("userName must be 80 characters or fewer.");
  }
  return {
    isValid: errors.length === 0,
    errors,
    value: {
      visaType: normalizedVisaType,
      mode: normalizedMode,
      interviewType: normalizedInterviewType,
      userName: cleanUserName
    }
  };
}
var validateInterviewInput_default = validateInterviewInput;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  validateInterviewInput
});
