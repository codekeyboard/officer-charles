const path = require('path');
const fs = require('fs');
const config = require('./config');
const debug = require('./debug');

function ensureNamedMap(app) {
  if (!app.locals.namedRoutes) app.locals.namedRoutes = {};
  return app.locals.namedRoutes;
}

function saveNamed(app, name, method, pathStr) {
  if (!name) return;
  const map = ensureNamedMap(app);
  map[name] = { method: method.toUpperCase(), path: pathStr };
}

function resolveController(controllersBase, handler) {
  if (typeof handler === 'function') return handler;
  if (typeof handler === 'string') {
    const parts = handler.split('.');
    if (parts.length !== 2) throw new Error(`Invalid handler string "${handler}". Expected "Controller.method"`);
    const [controllerPath, method] = parts;
    const controllerFile = path.join(controllersBase, ...controllerPath.split('/'));
    const mod = require(controllerFile);
    debug(`routes: controller loaded`, controllerPath);
    const target = mod && typeof mod === 'object' && 'default' in mod ? mod.default : mod;
    const fn = target && target[method];
    if (typeof fn !== 'function') throw new Error(`Method "${method}" not found in controller "${controllerPath}"`);
    return fn.bind(target);
  }
  throw new Error(`Unsupported handler type: ${typeof handler}`);
}

function parseAliasOptions(tail) {
  const opts = {};
  if (!tail || !tail.trim()) return opts;
  const s = tail.trim();
  // If contains equals, parse k=v pairs separated by comma
  if (s.includes('=')) {
    s.split(',').map(x => x.trim()).filter(Boolean).forEach(p => {
      const [k, v] = p.split('=').map(x => x.trim());
      if (k) opts[k] = v === undefined ? true : v;
    });
    return opts;
  }
  // Otherwise treat it as a single positional value
  opts.value = s;
  return opts;
}

function requireMiddlewareFromBase(baseDir, nameOrPath) {
  // If the value is an absolute or relative path, try require directly
  if (nameOrPath.includes('/') || nameOrPath.endsWith('.js')) {
    const full = path.isAbsolute(nameOrPath) ? nameOrPath : path.join(baseDir, nameOrPath);
    return require(full);
  }
  // Otherwise treat it as a module inside base dir by file name
  const file = path.join(baseDir, nameOrPath);
  try { return require(file); } catch (_) {}
  try { return require(file + '.js'); } catch (_) {}
  return require(path.join(baseDir, nameOrPath));
}

function toMiddlewareFns(options, descriptor) {
  const { middlewares_base_dir, middleware_aliases } = options;

  // Case 1: direct express middleware function
  if (typeof descriptor === 'function') return [descriptor];

  // Case 2: class or object with handle method
  if (typeof descriptor === 'object' && descriptor !== null) {
    if (typeof descriptor.handle === 'function') return [descriptor.handle.bind(descriptor)];
    // Array form: recurse
    if (Array.isArray(descriptor)) {
      return descriptor.flatMap(d => toMiddlewareFns(options, d));
    }
  }

  // Case 3: string descriptor
  if (typeof descriptor === 'string') {
    // alias or middleware file name, optionally with ":opts"
    const [name, tail] = descriptor.split(':');
    const opts = parseAliasOptions(tail);

    // First: try resolving by exact file/class name in middlewares dir
    try {
      const mod = requireMiddlewareFromBase(middlewares_base_dir, name.trim());
      const mw = materializeMiddleware(mod, opts);
      return [mw];
    } catch (_) {
      // swallow and try alias
    }

    // Last: try alias map from config
    const target = middleware_aliases && middleware_aliases[name.trim()];
    if (!target) throw new Error(`Unknown middleware: ${name}`);
    const mod = typeof target === 'string' || typeof target === 'function' ? target : target.module;
    const resolved = typeof mod === 'function' ? mod : requireMiddlewareFromBase(middlewares_base_dir, String(mod));
    const mw = materializeMiddleware(resolved, opts);
    return [mw];
  }

  throw new Error(`Unsupported middleware descriptor: ${JSON.stringify(descriptor)}`);
}

function materializeMiddleware(Exported, opts = {}) {
  // If export is a function with prototype.handle, treat as class
  if (typeof Exported === 'function' && Exported.prototype && typeof Exported.prototype.handle === 'function') {
    const instance = new Exported(opts);
    if (typeof instance.handle !== 'function') throw new Error('Middleware instance missing handle method');
    return instance.handle.bind(instance);
  }
  // If export is plain function, assume it's directly express middleware
  if (typeof Exported === 'function') {
    // Also accept factory-style: (opts) => (req,res,next)=>{}
    try {
      const maybeFn = Exported(opts);
      if (typeof maybeFn === 'function') return maybeFn;
    } catch (_) {}
    return Exported;
  }
  // If export is object with handle method
  if (Exported && typeof Exported.handle === 'function') {
    return Exported.handle.bind(Exported);
  }
  throw new Error('Unsupported middleware export type');
}

function registerRoute(app, options, { method = 'GET', path: p, handler, middleware, name }) {
  const expressMethod = method.toLowerCase();
  if (typeof app[expressMethod] !== 'function') throw new Error(`Invalid HTTP method: ${method}`);

  const ctl = resolveController(options.controllers_base_dir, handler);
  const mws = middleware ? toMiddlewareArray(options, middleware) : [];

  // Request logging middleware for this route
  const reqLogger = (req, res, next) => {
    const routeName = name || '(unnamed)';
    debug(`request: ${method} ${p} name=${routeName}`);
    res.once('finish', () => {
      debug(`response: ${method} ${p} name=${routeName} -> ${res.statusCode}`);
    });
    next();
  };

  const safeCtl = async (req, res, next) => {
    try { await ctl(req, res, next); } catch (err) { next(err); }
  };
  debug(`routes: register ${method} ${p} name=${name || '(unnamed)'} mws=${mws.length}`);
  app[expressMethod](p, reqLogger, ...mws, safeCtl);
  saveNamed(app, name, method, p);
}

function toMiddlewareArray(options, middleware) {
  if (Array.isArray(middleware)) return middleware.flatMap(d => toMiddlewareFns(options, d));
  return toMiddlewareFns(options, middleware);
}

function bind_routes(app, routes = undefined, userOptions = {}) {
  const projectRoot = process.cwd();
  const controllers_base_dir = userOptions.controllers_base_dir || path.join(projectRoot, 'src', 'controllers');
  const middlewares_base_dir = userOptions.middlewares_base_dir || path.join(projectRoot, 'src', 'middlewares');

  const middleware_aliases = userOptions.middleware_aliases != null
    ? userOptions.middleware_aliases
    : (config('middleware.aliases') || {});

  const options = { controllers_base_dir, middlewares_base_dir, middleware_aliases };

  // Load default routes when not provided
  let routesList = routes;
  if (!routesList) {
    const routesPath = userOptions.routes_path || path.join(projectRoot, 'src', 'routes');
    debug('routes: loading routes from', routesPath);
    routesList = require(routesPath);
  }

  // Support root-level group structure with nested arrays
  const bindGroup = (basePath = '', list = [], baseName = '', baseMethod = 'GET') => {
    list.forEach(route => {
      const fullPath = path.posix.join(basePath, route.path || '');
      const fullName = (baseName || '') + (route.name || '');
      const method = route.method || baseMethod;

      if (route.group) {
        bindGroup(fullPath, route.group, fullName, method);
      } else {
        registerRoute(app, options, {
          method,
          path: fullPath === '.' ? '/' : fullPath,
          handler: route.handler,
          middleware: route.middleware,
          name: fullName || undefined,
        });
      }
    });
  };

  bindGroup('', routesList, '', 'GET');
  debug('routes: all routes bound');
}

module.exports = bind_routes;
