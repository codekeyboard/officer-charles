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
var sanitizeUserInput_exports = {};
__export(sanitizeUserInput_exports, {
  default: () => sanitizeUserInput_default,
  sanitizeUserInput: () => sanitizeUserInput
});
module.exports = __toCommonJS(sanitizeUserInput_exports);
function sanitizeUserInput(input, { maxLength = 4e3 } = {}) {
  const text = String(input ?? "");
  const withoutDangerousBlocks = text.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "").replace(/<!--[\s\S]*?-->/g, "");
  const withoutDangerousAttributes = withoutDangerousBlocks.replace(/\son\w+\s*=\s*(['"]).*?\1/gi, "").replace(/\s(href|src)\s*=\s*(['"])\s*javascript:[\s\S]*?\2/gi, "");
  const withoutTags = withoutDangerousAttributes.replace(/<\/?[^>]+>/g, "");
  const normalized = withoutTags.replace(/\u0000/g, "").trim();
  return normalized.slice(0, Math.max(0, maxLength));
}
var sanitizeUserInput_default = sanitizeUserInput;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  sanitizeUserInput
});
