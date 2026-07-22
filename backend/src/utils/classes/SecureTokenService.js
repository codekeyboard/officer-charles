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
var SecureTokenService_exports = {};
__export(SecureTokenService_exports, {
  SecureTokenService: () => SecureTokenService,
  default: () => SecureTokenService_default
});
module.exports = __toCommonJS(SecureTokenService_exports);
var import_node_crypto = __toESM(require("node:crypto"));
var import_env_config = __toESM(require("../../config/env.config.js"));
var import_azureRealtime_config = __toESM(require("../../config/azureRealtime.config.js"));
var import_voiceLive_config = __toESM(require("../../config/voiceLive.config.js"));
var import_AppError = require("./AppError.js");
var import_Logger = __toESM(require("./Logger.js"));
class SecureTokenService {
  constructor({
    appConfig = import_env_config.default,
    realtimeConfig = import_azureRealtime_config.default,
    voiceConfig = import_voiceLive_config.default,
    logger = new import_Logger.default()
  } = {}) {
    this.appConfig = appConfig;
    this.realtimeConfig = realtimeConfig;
    this.voiceConfig = voiceConfig;
    this.logger = logger;
  }
  async createRealtimeEphemeralToken(options = {}) {
    this.validateTokenRequest(options.user, options);
    if (!this.realtimeConfig.endpoint) {
      throw new import_AppError.AppError({
        statusCode: 500,
        publicMessage: "Realtime endpoint is not configured.",
        internalMessage: "Missing AZURE_OPENAI_ENDPOINT.",
        errorCode: import_AppError.ERROR_CODES.AI_CONFIG_ERROR
      });
    }
    const response = await fetch(`${this.realtimeConfig.endpoint}/openai/v1/realtime/client_secrets`, {
      method: "POST",
      headers: await this.buildAzureHeaders("openai"),
      body: JSON.stringify({
        session: options.sessionConfig
      })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.value) {
      this.logger.warn("Realtime ephemeral token request failed", {
        status: response.status,
        error: payload.error
      });
      throw new import_AppError.AppError({
        statusCode: 502,
        publicMessage: "Unable to create realtime session credentials.",
        internalMessage: payload?.error?.message || `Realtime token request failed with ${response.status}.`,
        errorCode: import_AppError.ERROR_CODES.LIVE_SESSION_ERROR
      });
    }
    return {
      token: payload.value,
      tokenPreview: this.maskToken(payload.value),
      expiresAt: payload.expires_at ? new Date(payload.expires_at * 1e3).toISOString() : null
    };
  }
  async createVoiceLiveTemporarySession(options = {}) {
    this.validateTokenRequest(options.user, options);
    return {
      sessionId: options.sessionId || import_node_crypto.default.randomUUID(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1e3).toISOString(),
      connection: {
        transport: "webrtc",
        endpointHost: this.voiceConfig.endpoint ? new URL(this.voiceConfig.endpoint).host : "",
        apiVersion: this.voiceConfig.apiVersion,
        model: this.voiceConfig.model
      }
    };
  }
  maskToken(token) {
    const value = String(token || "");
    if (value.length <= 12) {
      return "[REDACTED]";
    }
    return `${value.slice(0, 6)}...[REDACTED]...${value.slice(-4)}`;
  }
  validateTokenRequest(user, options = {}) {
    if (!user?.id && !user?.name) {
      throw new import_AppError.AppError({
        statusCode: 400,
        publicMessage: "User is required to create a live session.",
        internalMessage: "Missing user identity for temporary token request.",
        errorCode: import_AppError.ERROR_CODES.LIVE_SESSION_ERROR
      });
    }
    if (!options.sessionConfig && options.type !== "voice_live") {
      throw new import_AppError.AppError({
        statusCode: 400,
        publicMessage: "Session configuration is required.",
        internalMessage: "Missing sessionConfig for temporary token request.",
        errorCode: import_AppError.ERROR_CODES.LIVE_SESSION_ERROR
      });
    }
    return true;
  }
  async buildAzureHeaders(service) {
    const headers = { "Content-Type": "application/json" };
    const apiKey = service === "voice_live" ? this.appConfig.azure.voiceLive.apiKey : this.appConfig.azure.openAi.apiKey;
    if (this.appConfig.ai.authMode === "apiKey" && apiKey) {
      return { ...headers, "api-key": apiKey };
    }
    try {
      const { DefaultAzureCredential } = await import("@azure/identity");
      const credential = new DefaultAzureCredential();
      const token = await credential.getToken("https://ai.azure.com/.default");
      return { ...headers, Authorization: `Bearer ${token.token}` };
    } catch (error) {
      if (apiKey) {
        return { ...headers, "api-key": apiKey };
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
var SecureTokenService_default = SecureTokenService;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  SecureTokenService
});
