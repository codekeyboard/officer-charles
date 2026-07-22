// src/router/registrar.js
const path = require("path");

/**
 * Create a router registrar that can:
 * - bind grouped route JSON
 * - resolve "Controller.method" strings
 * - parse flexible middleware descriptors (alias strings, arrays, fn, [alias, opts])
 * - store named routes: app.locals.namedRoutes[name] = { method, path }
 */
function createRegistrar({ controllersBase, middlewareAliases = {} } = {}) {
  const namedKey = "namedRoutes";

  function ensureNamedMap(app) {
    if (!app.locals[namedKey]) app.locals[namedKey] = {};
    return app.locals[namedKey];
  }

  function saveNamed(app, name, method, pathStr) {
    if (!name) return;
    const map = ensureNamedMap(app);
    map[name] = { method: method.toUpperCase(), path: pathStr };
  }

  function resolveController(handler) {
    if (typeof handler === "function") return handler;

    if (typeof handler === "string") {
      // e.g. "user/UserController.list" OR "WelcomeController.welcome"
      const parts = handler.split(".");
      if (parts.length !== 2) {
        throw new Error(`Invalid handler string "${handler}". Expected "Controller.method".`);
      }
      const [controllerPath, method] = parts;
      const controllerFile = path.join(
        controllersBase,
        ...controllerPath.split("/"),
      );
      // eslint-disable-next-line import/no-dynamic-require, global-require
      const Mod = require(controllerFile);
      if (!Mod || typeof Mod[method] !== "function") {
        throw new Error(`Method "${method}" not found in controller "${controllerPath}".`);
      }
      return Mod[method];
    }

    throw new Error(`Unsupported handler type: ${typeof handler}`);
  }

  // Turn a middleware descriptor into Express middleware fns
  function toMiddlewareFns(descriptor) {
    // Case 1: direct function(req,res,next)
    if (typeof descriptor === "function") return [descriptor];

    // Case 2: string alias with optional args/kv: "session:session=123,role=admin"
    if (typeof descriptor === "string") {
      const [alias, argTail] = descriptor.split(":");
      const factory = middlewareAliases[alias];
      if (!factory) {
        throw new Error(`Unknown middleware alias "${alias}".`);
      }

      let opts = {};
      if (argTail && argTail.length) {
        // support "k=v,k2=v2" or "arg1,arg2" → { arg1:true, arg2:true }
        const pairs = argTail.split(",").map(s => s.trim()).filter(Boolean);
        pairs.forEach(p => {
          const kv = p.split("=");
          if (kv.length === 2) {
            const [k, v] = kv;
            opts[k] = v;
          } else {
            opts[p] = true;
          }
        });
      }

      const mw = factory(opts); // factory returns (req,res,next)=>{}
      if (typeof mw !== "function") {
        throw new Error(`Middleware alias "${alias}" did not return a function.`);
      }
      return [mw];
    }

    // Case 3: [ aliasOrFn, options ] or nested arrays
    if (Array.isArray(descriptor)) {
      const items = [];
      descriptor.forEach(entry => {
        if (Array.isArray(entry) && entry.length === 2 && typeof entry[0] === "function" && typeof entry[1] === "object") {
          // [fnFactory, opts] style (if you choose to use factories as fns)
          const mw = entry[0](entry[1]);
          if (typeof mw !== "function") throw new Error("Middleware factory did not return a function.");
          items.push(mw);
          return;
        }
        // recurse otherwise
        items.push(...toMiddlewareFns(entry));
      });
      return items;
    }

    // Case 4: { use: 'alias', ...opts }
    if (descriptor && typeof descriptor === "object" && descriptor.use) {
      const alias = descriptor.use;
      const factory = middlewareAliases[alias];
      if (!factory) throw new Error(`Unknown middleware alias "${alias}".`);
      const { use, ...opts } = descriptor;
      const mw = factory(opts);
      if (typeof mw !== "function") throw new Error(`Middleware alias "${alias}" did not return a function.`);
      return [mw];
    }

    throw new Error(`Unsupported middleware descriptor: ${JSON.stringify(descriptor)}`);
  }

  function registerRoute(app, { method = "GET", path: p, handler, middleware, name }) {
    const expressMethod = method.toLowerCase();
    if (typeof app[expressMethod] !== "function") {
      throw new Error(`Invalid HTTP method: ${method}`);
    }

    const ctl = resolveController(handler);
    const middlewares = middleware ? toMiddlewareFns(middleware) : [];

    // Wrap controller to support async errors
    const safeCtl = async (req, res, next) => {
      try {
        await ctl(req, res, next);
      } catch (err) {
        next(err);
      }
    };

    app[expressMethod](p, ...middlewares, safeCtl);
    saveNamed(app, name, method, p);
  }

  function bindRoutes(app, basePath = "", routesList = [], baseName = "", baseMethod = "GET") {
    routesList.forEach(route => {
      const fullPath = path.posix.join(basePath, route.path || "");
      const fullName = (baseName || "") + (route.name || "");
      const method = route.method || baseMethod;

      if (route.group) {
        bindRoutes(app, fullPath, route.group, fullName, method);
      } else {
        registerRoute(app, {
          method: method,
          path: fullPath === "." ? "/" : fullPath, // join quirk guard
          handler: route.handler,
          middleware: route.middleware,
          name: fullName || undefined,
        });
      }
    });
  }

  // Optional helper to generate URLs by name: urlFor('users.show', { id: 42 })
  function urlFor(app, name, params = {}) {
    const map = ensureNamedMap(app);
    const def = map[name];
    if (!def) throw new Error(`No route named "${name}".`);
    let url = def.path;
    // replace :param placeholders
    Object.entries(params).forEach(([k, v]) => {
      url = url.replace(new RegExp(`/:${k}(?=/|$)`), `/${encodeURIComponent(v)}`);
    });
    return url;
  }

  return { bindRoutes, registerRoute, urlFor };
}

module.exports = { createRegistrar };
