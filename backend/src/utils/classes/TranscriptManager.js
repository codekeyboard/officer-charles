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
var TranscriptManager_exports = {};
__export(TranscriptManager_exports, {
  TranscriptManager: () => TranscriptManager,
  default: () => TranscriptManager_default
});
module.exports = __toCommonJS(TranscriptManager_exports);
var import_normalizeTranscript = require("../functions/normalizeTranscript.js");
const VALID_ROLES = /* @__PURE__ */ new Set(["user", "assistant"]);
class TranscriptManager {
  constructor() {
    this.transcripts = /* @__PURE__ */ new Map();
  }
  addTranscript({ interviewId, role, text, timestamp = (/* @__PURE__ */ new Date()).toISOString() } = {}) {
    const normalizedRole = String(role || "").toLowerCase();
    if (!VALID_ROLES.has(normalizedRole)) {
      throw new Error("Transcript role must be user or assistant.");
    }
    const entry = {
      role: normalizedRole,
      text: (0, import_normalizeTranscript.normalizeTranscript)(text),
      timestamp
    };
    const existing = this.getTranscript(interviewId);
    existing.push(entry);
    this.transcripts.set(interviewId, existing);
    return entry;
  }
  getTranscript(interviewId) {
    return [...this.transcripts.get(interviewId) || []];
  }
  clearTranscript(interviewId) {
    this.transcripts.delete(interviewId);
  }
  getTranscriptText(interviewId) {
    return this.getTranscript(interviewId).map((entry) => `${entry.role}: ${entry.text}`).join("\n");
  }
}
var TranscriptManager_default = TranscriptManager;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  TranscriptManager
});
