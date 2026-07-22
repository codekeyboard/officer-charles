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
var RealtimeWebRTCSession_exports = {};
__export(RealtimeWebRTCSession_exports, {
  RealtimeWebRTCSession: () => RealtimeWebRTCSession,
  default: () => RealtimeWebRTCSession_default
});
module.exports = __toCommonJS(RealtimeWebRTCSession_exports);
var import_node_crypto = __toESM(require("node:crypto"));
var import_azureRealtime_config = __toESM(require("../../config/azureRealtime.config.js"));
var import_AppError = require("./AppError.js");
var import_Logger = __toESM(require("./Logger.js"));
var import_SecureTokenService = __toESM(require("./SecureTokenService.js"));
var import_AzureEndpointService = __toESM(require("../../services/AzureEndpointService.js"));
class RealtimeWebRTCSession {
  constructor({
    config = import_azureRealtime_config.default,
    tokenService = new import_SecureTokenService.default(),
    logger = new import_Logger.default()
  } = {}) {
    this.config = config;
    this.tokenService = tokenService;
    this.logger = logger;
  }
  async createSession(user, options = {}) {
    const instructions = this.buildRealtimeInstructions(user, options);
    const sessionConfig = this.buildSessionConfig(user, { ...options, instructions });
    const clientSecret = await this.createClientSecret({ user, sessionConfig });
    return {
      sessionId: options.sessionId || import_node_crypto.default.randomUUID(),
      instructions,
      connection: this.buildConnectionInfo(clientSecret),
      sessionConfig
    };
  }
  buildRealtimeInstructions(user = {}, options = {}) {
    return [
      options.instructions || "Conduct a realistic live US visa interview.",
      `Applicant name: ${user.name || "Applicant"}. Use the name naturally.`,
      `Visa type: ${options.visaType || "unspecified"}.`,
      `Interview mode: ${options.mode || "unspecified"}.`,
      "Ask short spoken questions. Do not speak JSON to the user."
    ].join("\n");
  }
  buildSessionConfig(_user = {}, options = {}) {
    return {
      type: "realtime",
      model: options.model || this.config.realtimeDeployment,
      instructions: options.instructions,
      audio: {
        output: {
          voice: options.voice || this.config.session.voice
        }
      },
      modalities: options.modalities || this.config.session.modalities,
      temperature: options.temperature ?? this.config.session.temperature,
      max_response_output_tokens: options.maxResponseOutputTokens ?? this.config.session.maxResponseOutputTokens,
      turn_detection: options.turnDetection || this.config.session.turnDetection
    };
  }
  async createClientSecret(options = {}) {
    return this.tokenService.createRealtimeEphemeralToken(options);
  }
  buildConnectionInfo(clientSecret) {
    if (!this.config.endpoint) {
      throw new import_AppError.AppError({
        statusCode: 500,
        publicMessage: "Realtime endpoint is not configured.",
        internalMessage: "Missing AZURE_OPENAI_ENDPOINT.",
        errorCode: import_AppError.ERROR_CODES.AI_CONFIG_ERROR
      });
    }
    return {
      transport: "webrtc",
      callUrl: import_AzureEndpointService.default.buildRealtimeCallsUrl(),
      clientSecretsUrl: import_AzureEndpointService.default.buildRealtimeClientSecretsUrl(),
      ephemeralToken: clientSecret.token,
      expiresAt: clientSecret.expiresAt,
      tokenPreview: clientSecret.tokenPreview
    };
  }
}
var RealtimeWebRTCSession_default = RealtimeWebRTCSession;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  RealtimeWebRTCSession
});
