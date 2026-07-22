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
var AgentResponseParser_exports = {};
__export(AgentResponseParser_exports, {
  AgentResponseParser: () => AgentResponseParser,
  default: () => AgentResponseParser_default
});
module.exports = __toCommonJS(AgentResponseParser_exports);
var import_parseAgentJsonResponse = require("../functions/parseAgentJsonResponse.js");
var import_AppError = require("./AppError.js");
class AgentResponseParser {
  parse(response) {
    try {
      if (this.isAzureErrorResponse(response)) {
        return this.parseAzureError(response);
      }
      const rawText = this.extractResponseText(response);
      return {
        ok: true,
        parsed: (0, import_parseAgentJsonResponse.parseAgentJsonResponse)(rawText),
        rawText,
        error: null
      };
    } catch (error) {
      return {
        ok: false,
        parsed: (0, import_parseAgentJsonResponse.parseAgentJsonResponse)(""),
        rawText: "",
        error: new import_AppError.AppError({
          statusCode: 502,
          publicMessage: "The AI response could not be parsed safely.",
          internalMessage: error instanceof Error ? error.message : "Unknown AI response parse error",
          errorCode: import_AppError.ERROR_CODES.AI_RESPONSE_PARSE_ERROR,
          isOperational: true
        })
      };
    }
  }
  extractResponseText(response) {
    if (response === null || response === void 0) {
      return "";
    }
    if (typeof response === "string") {
      return response;
    }
    if (typeof response === "object") {
      if (typeof response.output_text === "string") return response.output_text;
      if (typeof response.outputText === "string") return response.outputText;
      if (typeof response.text === "string") return response.text;
      if (typeof response.message === "string") return response.message;
      if (Array.isArray(response.output)) {
        return response.output.flatMap((item) => item.content || []).map((content) => content.text || content.value || "").filter(Boolean).join("\n");
      }
      return JSON.stringify(response);
    }
    return String(response);
  }
  isAzureErrorResponse(response) {
    return Boolean(response && typeof response === "object" && response.error);
  }
  parseAzureError(response) {
    const message = response.error?.message || "AI provider returned an error.";
    return {
      ok: false,
      parsed: (0, import_parseAgentJsonResponse.parseAgentJsonResponse)(message),
      rawText: message,
      error: new import_AppError.AppError({
        statusCode: 502,
        publicMessage: "The AI provider returned an error.",
        internalMessage: message,
        errorCode: import_AppError.ERROR_CODES.AI_PROVIDER_ERROR,
        metadata: {
          providerCode: response.error?.code,
          providerType: response.error?.type
        },
        isOperational: true
      })
    };
  }
}
var AgentResponseParser_default = AgentResponseParser;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AgentResponseParser
});
