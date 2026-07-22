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
var FoundryResponsesClient_exports = {};
__export(FoundryResponsesClient_exports, {
  FoundryResponsesClient: () => FoundryResponsesClient,
  default: () => FoundryResponsesClient_default
});
module.exports = __toCommonJS(FoundryResponsesClient_exports);
var import_identity = require("@azure/identity");
var import_node_child_process = require("node:child_process");
var import_env_config = __toESM(require("../../config/env.config.js"));
var import_AppError = __toESM(require("./AppError.js"));
var import_Logger = __toESM(require("./Logger.js"));
const AZURE_AI_SCOPE = "https://ai.azure.com/.default";
class FoundryResponsesClient {
  constructor({
    projectEndpoint = import_env_config.default.azure.foundry.projectEndpoint,
    agentName = import_env_config.default.azure.foundry.agentName,
    agentVersion = import_env_config.default.azure.foundry.agentVersion,
    token = process.env.AZURE_AI_AUTH_TOKEN || "",
    logger = new import_Logger.default(),
    timeoutMs = Number(process.env.FOUNDRY_RESPONSE_TIMEOUT_MS || 9e3)
  } = {}) {
    this.projectEndpoint = projectEndpoint?.replace(/\/+$/, "");
    this.agentName = agentName;
    this.agentVersion = agentVersion;
    this.token = token;
    this.logger = logger;
    this.timeoutMs = timeoutMs;
    this.conversations = /* @__PURE__ */ new Map();
    this.credential = null;
    this.cachedAccessToken = null;
  }
  async createResponse(input, options = {}) {
    return this.createJsonResponse(input, options);
  }
  async createJsonResponse(input, options = {}) {
    const requestOptions = { timeoutMs: options.timeoutMs };
    const conversationId = await this.getConversation(options.metadata?.interviewId || options.interviewId || "default", requestOptions);
    const response = await this.request("/openai/v1/responses", {
      method: "POST",
      timeoutMs: options.timeoutMs,
      body: {
        agent_reference: {
          type: "agent_reference",
          name: this.agentName,
          ...this.agentVersion ? { version: this.agentVersion } : {}
        },
        conversation: conversationId,
        input: this.formatInput(input)
      }
    });
    return {
      id: response.id || null,
      provider: "azure_foundry_agent",
      model: this.agentName,
      outputText: this.extractOutputText(response),
      usage: this.extractUsage(response),
      raw: response
    };
  }
  async getConversation(key, options = {}) {
    if (this.conversations.has(key)) {
      return this.conversations.get(key);
    }
    const response = await this.request("/openai/v1/conversations", {
      method: "POST",
      timeoutMs: options.timeoutMs,
      body: { items: [] }
    });
    if (!response.id) {
      throw new import_AppError.default({
        statusCode: 502,
        publicMessage: "AI service did not create a conversation.",
        internalMessage: `Missing conversation id from Foundry response: ${JSON.stringify(response)}`,
        errorCode: import_AppError.ERROR_CODES.AI_PROVIDER_ERROR
      });
    }
    this.conversations.set(key, response.id);
    return response.id;
  }
  async request(route, { method, body, timeoutMs: requestTimeoutMs }) {
    if (!this.projectEndpoint || !this.agentName) {
      throw new import_AppError.default({
        statusCode: 500,
        publicMessage: "AI agent is not configured.",
        internalMessage: "Missing AZURE_FOUNDRY_PROJECT_ENDPOINT or AZURE_FOUNDRY_AGENT_NAME.",
        errorCode: import_AppError.ERROR_CODES.AI_CONFIG_ERROR
      });
    }
    const token = await this.getAccessToken();
    if (!token) {
      throw new import_AppError.default({
        statusCode: 500,
        publicMessage: "AI authentication is not available.",
        internalMessage: "Missing AZURE_AI_AUTH_TOKEN, Azure service principal token, and Azure CLI token.",
        errorCode: import_AppError.ERROR_CODES.AZURE_AUTH_ERROR
      });
    }
    const timeoutMs = Number(requestTimeoutMs || this.timeoutMs);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let response;
    let payload;
    try {
      response = await fetch(`${this.projectEndpoint}${route}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: body ? JSON.stringify(body) : void 0,
        signal: controller.signal
      });
      payload = await response.json().catch(() => ({}));
    } catch (error) {
      if (error?.name === "AbortError") {
        throw new import_AppError.default({
          statusCode: 504,
          publicMessage: "AI response timed out.",
          internalMessage: `Foundry request exceeded ${timeoutMs}ms.`,
          errorCode: import_AppError.ERROR_CODES.AI_PROVIDER_ERROR
        });
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
    if (!response.ok) {
      this.logger.warn("Foundry Responses request failed", {
        status: response.status,
        error: payload.error || payload.message
      });
      throw new import_AppError.default({
        statusCode: 502,
        publicMessage: "AI agent request failed.",
        internalMessage: payload.error?.message || payload.message || `Foundry returned ${response.status}.`,
        errorCode: import_AppError.ERROR_CODES.AI_PROVIDER_ERROR
      });
    }
    return payload;
  }
  formatInput(input) {
    if (typeof input === "string") return input;
    if (!Array.isArray(input)) return String(input || "");
    return input.map((message) => `${message.role || "message"}: ${message.content || ""}`).join("\n\n");
  }
  extractOutputText(response) {
    if (typeof response.output_text === "string") return response.output_text;
    if (!Array.isArray(response.output)) return "";
    return response.output.flatMap((item) => item.content || []).map((content) => content.text || content.value || "").filter(Boolean).join("\n");
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
  async getAccessToken() {
    if (this.token) return this.token;
    const servicePrincipalToken = await this.getServicePrincipalAccessToken();
    if (servicePrincipalToken) return servicePrincipalToken;
    return this.getAzureCliAccessToken();
  }
  async getServicePrincipalAccessToken() {
    const now = Date.now();
    if (this.cachedAccessToken && this.cachedAccessToken.expiresOnTimestamp - now > 6e4) {
      return this.cachedAccessToken.token;
    }
    const tenantId = process.env.AZURE_TENANT_ID;
    const clientId = process.env.AZURE_CLIENT_ID;
    const clientSecret = process.env.AZURE_CLIENT_SECRET;
    if (!tenantId || !clientId || !clientSecret) return "";
    try {
      if (!this.credential) {
        this.credential = new import_identity.ClientSecretCredential(tenantId, clientId, clientSecret);
      }
      const accessToken = await this.credential.getToken(AZURE_AI_SCOPE);
      if (!accessToken?.token) return "";
      this.cachedAccessToken = accessToken;
      return accessToken.token;
    } catch (error) {
      this.logger.warn("Azure service principal authentication failed", { error: error?.message || error });
      return "";
    }
  }
  getAzureCliAccessToken() {
    try {
      return (0, import_node_child_process.execFileSync)("az", [
        "account",
        "get-access-token",
        "--scope",
        AZURE_AI_SCOPE,
        "--query",
        "accessToken",
        "-o",
        "tsv"
      ], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
        timeout: Number(process.env.FOUNDRY_AUTH_TIMEOUT_MS || 3e3)
      }).trim();
    } catch {
      return "";
    }
  }
}
var FoundryResponsesClient_default = FoundryResponsesClient;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  FoundryResponsesClient
});
