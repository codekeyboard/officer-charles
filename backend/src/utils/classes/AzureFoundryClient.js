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
var AzureFoundryClient_exports = {};
__export(AzureFoundryClient_exports, {
  AzureFoundryClient: () => AzureFoundryClient,
  default: () => AzureFoundryClient_default
});
module.exports = __toCommonJS(AzureFoundryClient_exports);
var import_azureFoundry_config = __toESM(require("../../config/azureFoundry.config.js"));
var import_AppError = require("./AppError.js");
var import_Logger = __toESM(require("./Logger.js"));
class AzureFoundryClient {
  constructor({ config = import_azureFoundry_config.default, logger = new import_Logger.default() } = {}) {
    this.config = config;
    this.logger = logger;
    this.projectClient = null;
    this.openAIClient = null;
  }
  async getProjectClient() {
    if (this.projectClient) {
      return this.projectClient;
    }
    if (!this.config.projectEndpoint) {
      throw new import_AppError.AppError({
        statusCode: 500,
        publicMessage: "AI service is not configured.",
        internalMessage: "Missing Azure Foundry project endpoint.",
        errorCode: import_AppError.ERROR_CODES.AI_CONFIG_ERROR
      });
    }
    try {
      const [{ AIProjectClient }, { DefaultAzureCredential }] = await Promise.all([
        import("@azure/ai-projects"),
        import("@azure/identity")
      ]);
      this.projectClient = new AIProjectClient(this.config.projectEndpoint, new DefaultAzureCredential());
      return this.projectClient;
    } catch (error) {
      throw new import_AppError.AppError({
        statusCode: 500,
        publicMessage: "Unable to initialize AI service client.",
        internalMessage: error instanceof Error ? error.message : "Unknown Azure Foundry client error.",
        errorCode: import_AppError.ERROR_CODES.AZURE_AUTH_ERROR,
        isOperational: true
      });
    }
  }
  async getOpenAIClient() {
    if (this.openAIClient) {
      return this.openAIClient;
    }
    const projectClient = await this.getProjectClient();
    if (typeof projectClient.getOpenAIClient !== "function") {
      throw new import_AppError.AppError({
        statusCode: 500,
        publicMessage: "AI service client is unavailable.",
        internalMessage: "AIProjectClient.getOpenAIClient is not available in the installed SDK version.",
        errorCode: import_AppError.ERROR_CODES.AI_PROVIDER_ERROR
      });
    }
    this.openAIClient = projectClient.getOpenAIClient();
    return this.openAIClient;
  }
  async healthCheck() {
    try {
      await this.getProjectClient();
      return {
        ok: true,
        provider: "azure_foundry",
        projectEndpointConfigured: Boolean(this.config.projectEndpoint),
        agentConfigured: Boolean(this.config.agentName || this.config.agentId),
        authMode: this.config.authMode
      };
    } catch (error) {
      this.logger.warn("Azure Foundry health check failed", { error });
      return {
        ok: false,
        provider: "azure_foundry",
        errorCode: error?.errorCode || import_AppError.ERROR_CODES.AI_PROVIDER_ERROR,
        message: error?.publicMessage || "AI service health check failed."
      };
    }
  }
}
var AzureFoundryClient_default = AzureFoundryClient;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AzureFoundryClient
});
