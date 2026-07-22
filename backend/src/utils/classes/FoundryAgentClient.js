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
var FoundryAgentClient_exports = {};
__export(FoundryAgentClient_exports, {
  FoundryAgentClient: () => FoundryAgentClient,
  default: () => FoundryAgentClient_default
});
module.exports = __toCommonJS(FoundryAgentClient_exports);
var import_node_crypto = __toESM(require("node:crypto"));
var import_azureFoundry_config = __toESM(require("../../config/azureFoundry.config.js"));
var import_AppError = require("./AppError.js");
var import_AzureFoundryClient = __toESM(require("./AzureFoundryClient.js"));
var import_Logger = __toESM(require("./Logger.js"));
class FoundryAgentClient {
  constructor({
    config = import_azureFoundry_config.default,
    foundryClient = new import_AzureFoundryClient.default({ config }),
    logger = new import_Logger.default()
  } = {}) {
    this.config = config;
    this.foundryClient = foundryClient;
    this.logger = logger;
    this.sessions = /* @__PURE__ */ new Map();
  }
  async sendMessage(messages, options = {}) {
    const openAIClient = await this.foundryClient.getOpenAIClient();
    const agentName = options.agentName || this.config.agentName;
    const agentVersion = options.agentVersion || this.config.agentVersion;
    if (!agentName) {
      throw new import_AppError.AppError({
        statusCode: 500,
        publicMessage: "AI agent is not configured.",
        internalMessage: "Missing Azure Foundry agent name.",
        errorCode: import_AppError.ERROR_CODES.AI_CONFIG_ERROR
      });
    }
    try {
      const response = await openAIClient.responses.create(
        {
          input: messages,
          model: options.model || this.config.chatModelDeployment
        },
        {
          body: {
            agent: {
              name: agentName,
              ...agentVersion ? { version: agentVersion } : {},
              type: "agent_reference"
            }
          }
        }
      );
      return {
        id: response.id || null,
        outputText: response.output_text || "",
        raw: response
      };
    } catch (error) {
      this.logger.error("Foundry agent message failed", { error });
      throw new import_AppError.AppError({
        statusCode: 502,
        publicMessage: "AI agent request failed.",
        internalMessage: error instanceof Error ? error.message : "Unknown Foundry agent error.",
        errorCode: import_AppError.ERROR_CODES.AI_PROVIDER_ERROR
      });
    }
  }
  async startAgentSession(context = {}) {
    const sessionId = context.sessionId || import_node_crypto.default.randomUUID();
    this.sessions.set(sessionId, {
      id: sessionId,
      context,
      messages: [],
      completed: false,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    return {
      sessionId,
      agentName: this.config.agentName,
      agentId: this.config.agentId
    };
  }
  async continueAgentSession(sessionId, userMessage, context = {}) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new import_AppError.AppError({
        statusCode: 404,
        publicMessage: "Agent session not found.",
        internalMessage: `Agent session not found: ${sessionId}`,
        errorCode: import_AppError.ERROR_CODES.AI_PROVIDER_ERROR
      });
    }
    session.messages.push({ role: "user", content: userMessage });
    session.context = { ...session.context, ...context };
    const response = await this.sendMessage(session.messages, context);
    session.messages.push({ role: "assistant", content: response.outputText });
    return response;
  }
  async completeAgentSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { sessionId, completed: true };
    }
    session.completed = true;
    session.completedAt = (/* @__PURE__ */ new Date()).toISOString();
    return {
      sessionId,
      completed: true,
      messageCount: session.messages.length
    };
  }
}
var FoundryAgentClient_default = FoundryAgentClient;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  FoundryAgentClient
});
