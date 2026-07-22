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
var voiceLive_config_exports = {};
__export(voiceLive_config_exports, {
  default: () => voiceLive_config_default,
  voiceLiveConfig: () => voiceLiveConfig
});
module.exports = __toCommonJS(voiceLive_config_exports);
var import_env_config = __toESM(require("./env.config.js"));
const voiceLiveConfig = Object.freeze({
  endpoint: import_env_config.default.azure.voiceLive.endpoint,
  apiVersion: import_env_config.default.azure.voiceLive.apiVersion,
  model: import_env_config.default.azure.voiceLive.model,
  defaultVoiceName: import_env_config.default.ai.defaultVoiceName,
  avatarEnabled: false,
  avatarType: import_env_config.default.azure.voiceLive.avatar.type,
  avatarCharacter: import_env_config.default.azure.voiceLive.avatar.character,
  avatarStyle: import_env_config.default.azure.voiceLive.avatar.style,
  avatarCustomized: import_env_config.default.azure.voiceLive.avatar.customized,
  maxResponseOutputTokens: 110,
  turnDetection: {
    type: "azure_semantic_vad",
    threshold: 0.4,
    prefixPaddingMs: 160,
    silenceDurationMs: 260,
    speechDurationMs: 90,
    autoTruncate: true,
    createResponse: true,
    interruptResponse: true
  },
  noiseReduction: {
    enabled: true,
    type: "azure_deep_noise_suppression"
  },
  echoCancellation: {
    enabled: true,
    type: "server_echo_cancellation"
  }
});
var voiceLive_config_default = voiceLiveConfig;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  voiceLiveConfig
});
