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
var azureRealtime_config_exports = {};
__export(azureRealtime_config_exports, {
  azureRealtimeConfig: () => azureRealtimeConfig,
  default: () => azureRealtime_config_default
});
module.exports = __toCommonJS(azureRealtime_config_exports);
var import_env_config = __toESM(require("./env.config.js"));
const azureRealtimeConfig = Object.freeze({
  endpoint: import_env_config.default.azure.openAi.endpoint,
  realtimeDeployment: import_env_config.default.azure.openAi.realtimeModelDeployment,
  realtimeModel: import_env_config.default.ai.defaultRealtimeModel || import_env_config.default.azure.openAi.realtimeModelDeployment,
  apiVersion: import_env_config.default.azure.openAi.apiVersion,
  webRtcEnabled: import_env_config.default.ai.enableRealtimeWebRtc,
  session: {
    type: "realtime",
    modalities: ["text", "audio"],
    voice: import_env_config.default.ai.defaultVoiceName,
    turnDetection: {
      type: "server_vad",
      threshold: 0.5,
      prefixPaddingMs: 300,
      silenceDurationMs: 500
    },
    temperature: 0.7,
    maxResponseOutputTokens: 800
  }
});
var azureRealtime_config_default = azureRealtimeConfig;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  azureRealtimeConfig
});
