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
var VisaContextProvider_exports = {};
__export(VisaContextProvider_exports, {
  VisaContextProvider: () => VisaContextProvider,
  default: () => VisaContextProvider_default
});
module.exports = __toCommonJS(VisaContextProvider_exports);
var import_visaTypes = require("../../constants/visaTypes.js");
var import_buildVisaContext = require("../functions/buildVisaContext.js");
var import_AppError = require("./AppError.js");
class VisaContextProvider {
  getContext(visaType) {
    try {
      return (0, import_buildVisaContext.buildVisaContext)(visaType);
    } catch (error) {
      throw new import_AppError.AppError({
        statusCode: 400,
        publicMessage: "Invalid visa type.",
        internalMessage: error instanceof Error ? error.message : `Invalid visa type: ${visaType}`,
        errorCode: import_AppError.ERROR_CODES.INVALID_VISA_TYPE,
        metadata: {
          supportedVisaTypes: Object.values(import_visaTypes.VISA_TYPES)
        },
        isOperational: true
      });
    }
  }
  getB1B2Context() {
    return this.getContext(import_visaTypes.VISA_TYPES.B1_B2);
  }
  getF1Context() {
    return this.getContext(import_visaTypes.VISA_TYPES.F1);
  }
}
var VisaContextProvider_default = VisaContextProvider;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  VisaContextProvider
});
