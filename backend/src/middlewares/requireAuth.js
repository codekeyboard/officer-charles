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
var requireAuth_exports = {};
__export(requireAuth_exports, {
  default: () => requireAuth_default,
  requireAuth: () => requireAuth
});
module.exports = __toCommonJS(requireAuth_exports);
var import_AppError = __toESM(require("../utils/classes/AppError.js"));
var import_AuthTokenService = require("../services/AuthTokenService.js");
const DEVELOPMENT_USER_ID = process.env.DEV_USER_ID || "99999999-9999-4999-8999-999999999999";
function requireAuth(req, _res, next) {
  if (req.user) {
    next();
    return;
  }
  const token = (0, import_AuthTokenService.readAccessToken)(req);
  if (token) {
    try {
      const payload = (0, import_AuthTokenService.verifyAccessToken)(token);
      req.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role || "user"
      };
      next();
      return;
    } catch {
      next(new import_AppError.default({
        statusCode: 401,
        publicMessage: "Authentication token is invalid.",
        internalMessage: "Invalid access token.",
        errorCode: "INVALID_ACCESS_TOKEN"
      }));
      return;
    }
  }
  if (process.env.NODE_ENV !== "production") {
    req.user = {
      id: DEVELOPMENT_USER_ID,
      name: "Development User",
      role: "development"
    };
    next();
    return;
  }
  next(new import_AppError.default({
    statusCode: 401,
    publicMessage: "Authentication is required.",
    internalMessage: "Missing authenticated user on AI route.",
    errorCode: import_AppError.ERROR_CODES.AI_PROVIDER_ERROR
  }));
}
var requireAuth_default = requireAuth;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  requireAuth
});
