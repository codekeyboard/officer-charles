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
var Logger_exports = {};
__export(Logger_exports, {
  Logger: () => Logger,
  default: () => Logger_default
});
module.exports = __toCommonJS(Logger_exports);
const SENSITIVE_KEYS = [
  "apiKey",
  "api_key",
  "token",
  "accessToken",
  "refreshToken",
  "authorization",
  "cookie",
  "password",
  "clientSecret",
  "client_secret",
  "secret"
];
class Logger {
  constructor({ level = "info", sink = console } = {}) {
    this.level = level;
    this.sink = sink;
  }
  info(message, metadata = {}) {
    this.write("info", message, metadata);
  }
  warn(message, metadata = {}) {
    this.write("warn", message, metadata);
  }
  error(message, metadata = {}) {
    this.write("error", message, metadata);
  }
  debug(message, metadata = {}) {
    if (this.level === "debug") {
      this.write("debug", message, metadata);
    }
  }
  write(level, message, metadata) {
    const payload = {
      level,
      message,
      metadata: this.maskSensitiveValues(metadata),
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    const writer = this.sink[level] || this.sink.log || console.log;
    writer.call(this.sink, JSON.stringify(payload));
  }
  maskSensitiveValues(value) {
    if (Array.isArray(value)) {
      return value.map((item) => this.maskSensitiveValues(item));
    }
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value).map(([key, entryValue]) => [
          key,
          this.isSensitiveKey(key) ? "[REDACTED]" : this.maskSensitiveValues(entryValue)
        ])
      );
    }
    if (typeof value === "string") {
      return this.maskSensitiveString(value);
    }
    return value;
  }
  isSensitiveKey(key) {
    const normalizedKey = key.toLowerCase();
    return SENSITIVE_KEYS.some((sensitiveKey) => normalizedKey.includes(sensitiveKey.toLowerCase()));
  }
  maskSensitiveString(value) {
    return value.replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED]").replace(/api[-_]?key=([^&\s]+)/gi, "api-key=[REDACTED]").replace(/token=([^&\s]+)/gi, "token=[REDACTED]");
  }
}
var Logger_default = Logger;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Logger
});
