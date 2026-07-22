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
var normalizeTranscript_exports = {};
__export(normalizeTranscript_exports, {
  default: () => normalizeTranscript_default,
  normalizeTranscript: () => normalizeTranscript
});
module.exports = __toCommonJS(normalizeTranscript_exports);
function normalizeTranscript(transcript) {
  const text = String(transcript ?? "").trim();
  if (!text) {
    return "";
  }
  return text.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}
var normalizeTranscript_default = normalizeTranscript;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  normalizeTranscript
});
