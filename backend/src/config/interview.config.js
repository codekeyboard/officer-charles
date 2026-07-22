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
var interview_config_exports = {};
__export(interview_config_exports, {
  default: () => interview_config_default,
  interviewConfig: () => interviewConfig
});
module.exports = __toCommonJS(interview_config_exports);
var import_interviewModes = require("../constants/interviewModes.js");
var import_interviewTypes = require("../constants/interviewTypes.js");
var import_visaTypes = require("../constants/visaTypes.js");
const interviewConfig = Object.freeze({
  thresholds: {
    weakAnswer: 50,
    acceptedAnswer: 70,
    excellent: 90
  },
  visaTypes: import_visaTypes.VISA_TYPES,
  interviewModes: import_interviewModes.INTERVIEW_MODES,
  interviewTypes: import_interviewTypes.INTERVIEW_TYPES
});
var interview_config_default = interviewConfig;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  interviewConfig
});
