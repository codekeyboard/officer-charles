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
var buildVisaContext_exports = {};
__export(buildVisaContext_exports, {
  buildVisaContext: () => buildVisaContext,
  default: () => buildVisaContext_default
});
module.exports = __toCommonJS(buildVisaContext_exports);
var import_b1b2_prompt = __toESM(require("../../prompts/b1b2.prompt.js"));
var import_f1_prompt = __toESM(require("../../prompts/f1.prompt.js"));
var import_visaTypes = require("../../constants/visaTypes.js");
function buildVisaContext(visaType) {
  const normalizedVisaType = String(visaType || "").trim().toUpperCase();
  if (normalizedVisaType === import_visaTypes.VISA_TYPES.B1_B2) {
    return import_b1b2_prompt.default;
  }
  if (normalizedVisaType === import_visaTypes.VISA_TYPES.F1) {
    return import_f1_prompt.default;
  }
  throw new Error("Invalid visa type. Supported values are B1_B2 and F1.");
}
var buildVisaContext_default = buildVisaContext;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  buildVisaContext
});
