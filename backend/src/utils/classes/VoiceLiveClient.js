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
var VoiceLiveClient_exports = {};
__export(VoiceLiveClient_exports, {
  VoiceLiveClient: () => VoiceLiveClient,
  default: () => VoiceLiveClient_default
});
module.exports = __toCommonJS(VoiceLiveClient_exports);
var import_voiceLive_config = __toESM(require("../../config/voiceLive.config.js"));
var import_AppError = require("./AppError.js");
var import_Logger = __toESM(require("./Logger.js"));
var import_AzureEndpointService = __toESM(require("../../services/AzureEndpointService.js"));
class VoiceLiveClient {
  constructor({ config = import_voiceLive_config.default, logger = new import_Logger.default() } = {}) {
    this.config = config;
    this.logger = logger;
  }
  createSessionConfig(user = {}, options = {}) {
    return compactSessionConfig({
      model: options.model || this.config.model,
      modalities: ["text", "audio"],
      instructions: options.instructions || `Conduct a live visa interview for ${user.name || "the applicant"}.`,
      voice: this.createVoiceConfig(options.voice),
      avatar: this.createAvatarConfig(options.avatar),
      inputAudioFormat: "pcm16",
      outputAudioFormat: "pcm16",
      turnDetection: normalizeTurnDetection(options.turnDetection || this.config.turnDetection),
      inputAudioNoiseReduction: normalizeNoiseReduction(options.noiseReduction || this.config.noiseReduction),
      inputAudioEchoCancellation: normalizeEchoCancellation(options.echoCancellation || this.config.echoCancellation),
      inputAudioTranscription: { model: "azure-speech" },
      maxResponseOutputTokens: options.maxResponseOutputTokens || this.config.maxResponseOutputTokens || 140,
      metadata: {
        userId: String(user.id || ""),
        interviewId: String(options.interviewId || ""),
        mode: String(options.mode || ""),
        visaType: String(options.visaType || "")
      }
    });
  }
  createAvatarConfig(options = {}) {
    const enabled = options.enabled ?? this.config.avatarEnabled;
    if (!enabled) {
      return void 0;
    }
    const avatarType = options.type || this.config.avatarType || "";
    const isPhotoAvatar = avatarType === "photo-avatar";
    const character = options.character || this.config.avatarCharacter || "Max";
    const style = (options.style ?? this.config.avatarStyle) || "business";
    return compactSessionConfig({
      type: isPhotoAvatar ? "photo-avatar" : void 0,
      model: isPhotoAvatar ? options.model || this.config.avatarModel || "vasa-1" : void 0,
      character: normalizeAvatarCharacter(character),
      customized: options.customized || this.config.avatarCustomized || void 0,
      style: isPhotoAvatar ? void 0 : style,
      outputProtocol: options.outputProtocol || this.config.avatarOutputProtocol || "webrtc",
      video: options.video || this.config.avatarVideo || {
        codec: "h264",
        resolution: {
          width: 1920,
          height: 1080
        },
        crop: {
          topLeft: [560, 0],
          bottomRight: [1360, 1080]
        },
        bitrate: 1000000
      }
    });
  }
  createVoiceConfig(options = {}) {
    const name = options.name || this.config.defaultVoiceName || "en-US-AvaNeural";
    return {
      type: options.type || resolveVoiceType(name),
      name,
      temperature: options.temperature ?? 0.7
    };
  }
  buildWebRTCConnectionInfo(sessionId) {
    if (!this.config.endpoint) {
      throw new import_AppError.AppError({
        statusCode: 500,
        publicMessage: "Live voice endpoint is not configured.",
        internalMessage: "Missing AZURE_VOICE_LIVE_ENDPOINT.",
        errorCode: import_AppError.ERROR_CODES.AI_CONFIG_ERROR
      });
    }
    return {
      sessionId,
      transport: "webrtc",
      signalingRequired: true,
      // Backend must attach auth. Do not append API keys or bearer tokens here.
      signalingPath: "/voice-live/realtime/calls",
      signalingUrl: import_AzureEndpointService.default.buildVoiceLiveWebRtcUrl(),
      endpointHost: new URL(this.config.endpoint).host,
      apiVersion: this.config.apiVersion,
      model: this.config.model
    };
  }
  buildWebSocketUrl({ mode = "model" } = {}) {
    return import_AzureEndpointService.default.buildVoiceLiveWebSocketUrl({ mode });
  }
  buildWebRTCUrl() {
    return import_AzureEndpointService.default.buildVoiceLiveWebRtcUrl();
  }
  handleVoiceLiveEvent(event) {
    const type = event?.type || "unknown";
    switch (type) {
      case "response.completed":
      case "response.done":
        return { type, completed: true, event };
      case "error":
        this.logger.warn("Voice Live event error", { event });
        return { type, error: true, message: sanitizePublicProviderText(event?.error?.message || "Live voice event error.") };
      default:
        return { type, event };
    }
  }
}
function resolveVoiceType(name) {
  return String(name || "").includes("-") || String(name || "").includes(":") ? "azure-standard" : "openai";
}
function normalizeAvatarCharacter(character) {
  return String(character || "").trim().toLowerCase();
}
function normalizeTurnDetection(turnDetection = {}) {
  const type = turnDetection.type === "azure_semantic_vad" ? "server_vad" : turnDetection.type || "server_vad";
  return {
    type,
    threshold: turnDetection.threshold ?? 0.5,
    prefixPaddingInMs: turnDetection.prefixPaddingInMs ?? turnDetection.prefixPaddingMs ?? 300,
    silenceDurationInMs: turnDetection.silenceDurationInMs ?? turnDetection.silenceDurationMs ?? 500,
    speechDurationInMs: turnDetection.speechDurationInMs ?? turnDetection.speechDurationMs,
    autoTruncate: turnDetection.autoTruncate ?? true,
    createResponse: turnDetection.createResponse ?? true,
    interruptResponse: turnDetection.interruptResponse ?? true
  };
}
function normalizeNoiseReduction(noiseReduction = {}) {
  if (noiseReduction === false || noiseReduction.enabled === false) return void 0;
  return {
    type: noiseReduction.type || "azure_deep_noise_suppression"
  };
}
function normalizeEchoCancellation(echoCancellation = {}) {
  if (echoCancellation === false || echoCancellation.enabled === false) return void 0;
  return {
    type: echoCancellation.type || "server_echo_cancellation"
  };
}
function compactSessionConfig(value) {
  if (Array.isArray(value)) {
    return value.map(compactSessionConfig).filter((item) => item !== void 0);
  }
  if (!value || typeof value !== "object") return value;
  return Object.entries(value).reduce((result, [key, nestedValue]) => {
    const compacted = compactSessionConfig(nestedValue);
    if (compacted !== void 0) {
      result[key] = compacted;
    }
    return result;
  }, {});
}
function sanitizePublicProviderText(value) {
  return String(value || "")
    .replace(/Azure/gi, "AI service")
    .replace(/Foundry/gi, "AI service")
    .replace(/Voice Live/gi, "live voice");
}
var VoiceLiveClient_default = VoiceLiveClient;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  VoiceLiveClient
});
