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
var AzureResponsesClient_exports = {};
__export(AzureResponsesClient_exports, {
  AzureResponsesClient: () => AzureResponsesClient,
  default: () => AzureResponsesClient_default
});
module.exports = __toCommonJS(AzureResponsesClient_exports);
var import_env_config = __toESM(require("../../config/env.config.js"));
var import_azureFoundry_config = __toESM(require("../../config/azureFoundry.config.js"));
var import_AppError = require("./AppError.js");
var import_Logger = __toESM(require("./Logger.js"));
class AzureResponsesClient {
  constructor({
    endpoint = import_env_config.default.azure.openAi.endpoint,
    apiKey = import_env_config.default.azure.openAi.apiKey,
    apiVersion = import_env_config.default.azure.openAi.apiVersion,
    deployment = import_azureFoundry_config.default.chatModelDeployment,
    authMode = import_env_config.default.ai.authMode,
    logger = new import_Logger.default()
  } = {}) {
    this.endpoint = endpoint?.replace(/\/+$/, "");
    this.apiKey = apiKey;
    this.apiVersion = apiVersion;
    this.deployment = deployment;
    this.authMode = authMode;
    this.logger = logger;
  }
  async createResponse(input, options = {}) {
    const response = await this.request("/openai/v1/responses", {
      method: "POST",
      body: {
        model: options.model || this.deployment,
        input,
        instructions: options.instructions,
        temperature: options.temperature,
        max_output_tokens: options.maxOutputTokens,
        previous_response_id: options.previousResponseId,
        metadata: options.metadata
      }
    });
    return this.normalizeResponse(response);
  }
  async createJsonResponse(input, options = {}) {
    return this.createResponse(input, {
      ...options,
      instructions: [
        options.instructions,
        "Return valid JSON only. Do not wrap JSON in markdown."
      ].filter(Boolean).join("\n")
    });
  }
  async getResponse(responseId) {
    if (!responseId) {
      throw new import_AppError.AppError({
        statusCode: 400,
        publicMessage: "Response ID is required.",
        internalMessage: "AzureResponsesClient.getResponse called without responseId.",
        errorCode: import_AppError.ERROR_CODES.AI_PROVIDER_ERROR
      });
    }
    const response = await this.request(`/openai/v1/responses/${encodeURIComponent(responseId)}`, {
      method: "GET"
    });
    return this.normalizeResponse(response);
  }
  extractOutputText(response) {
    if (!response) return "";
    if (typeof response.output_text === "string") return response.output_text;
    if (typeof response.text === "string") return response.text;
    if (Array.isArray(response.output)) {
      return response.output.flatMap((item) => item.content || []).map((content) => content.text || content.value || "").filter(Boolean).join("\n");
    }
    return "";
  }
  extractUsage(response) {
    const usage = response?.usage || {};
    const inputTokens = usage.input_tokens ?? usage.prompt_tokens ?? 0;
    const outputTokens = usage.output_tokens ?? usage.completion_tokens ?? 0;
    return {
      inputTokens,
      outputTokens,
      totalTokens: usage.total_tokens ?? inputTokens + outputTokens
    };
  }
  normalizeResponse(response) {
    return {
      id: response?.id || null,
      provider: "azure_openai_responses",
      model: response?.model || this.deployment,
      outputText: this.extractOutputText(response),
      usage: this.extractUsage(response),
      raw: response
    };
  }
  async request(path, { method, body } = {}) {
    if (!this.endpoint) {
      throw new import_AppError.AppError({
        statusCode: 500,
        publicMessage: "AI endpoint is not configured.",
        internalMessage: "Missing AZURE_OPENAI_ENDPOINT.",
        errorCode: import_AppError.ERROR_CODES.AI_CONFIG_ERROR
      });
    }
    const response = await fetch(`${this.endpoint}${path}`, {
      method,
      headers: await this.buildHeaders(),
      body: body ? JSON.stringify(removeUndefined(body)) : void 0
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      this.logger.warn("Azure Responses API request failed", {
        status: response.status,
        requestId: response.headers.get("x-ms-request-id"),
        error: payload?.error
      });
      throw new import_AppError.AppError({
        statusCode: 502,
        publicMessage: "AI request failed.",
        internalMessage: payload?.error?.message || `Azure OpenAI returned ${response.status}.`,
        errorCode: import_AppError.ERROR_CODES.AI_PROVIDER_ERROR,
        metadata: {
          providerStatus: response.status,
          providerCode: payload?.error?.code
        }
      });
    }
    return payload;
  }
  async buildHeaders() {
    const headers = { "Content-Type": "application/json" };
    if (this.authMode === "apiKey" && this.apiKey) {
      return { ...headers, "api-key": this.apiKey };
    }
    try {
      const { DefaultAzureCredential } = await import("@azure/identity");
      const credential = new DefaultAzureCredential();
      const token = await credential.getToken("https://ai.azure.com/.default");
      return { ...headers, Authorization: `Bearer ${token.token}` };
    } catch (error) {
      if (this.apiKey) {
        return { ...headers, "api-key": this.apiKey };
      }
      throw new import_AppError.AppError({
        statusCode: 500,
        publicMessage: "AI authentication failed.",
        internalMessage: error instanceof Error ? error.message : "Unable to authenticate to Azure.",
        errorCode: import_AppError.ERROR_CODES.AZURE_AUTH_ERROR
      });
    }
  }
}
function removeUndefined(value) {
  return Object.fromEntries(Object.entries(value).filter(([, entryValue]) => entryValue !== void 0));
}
var AzureResponsesClient_default = AzureResponsesClient;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AzureResponsesClient
});
