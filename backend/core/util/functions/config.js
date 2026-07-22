// Node config helper inspired by Python core's config.
// Loads configuration from the project's `src/config` directory.
// Primary entry is `src/config/app.js` which can compose other config files
// (similar to Laravel). Falls back to aggregating all files in the directory
// if `app.js` is missing. Supports dot-notation lookups with defaults.

const fs = require('fs');
const path = require('path');

let _cache = null;
let _configDir = null;

function resolveConfigDir() {
  if (_configDir) return _configDir;
  const candidates = [
    process.env.CONFIG_DIR,
    path.join(process.cwd(), 'src', 'config'),
    path.join(process.cwd(), 'config'),
    // Fallbacks relative to this file's location to be resilient to cwd
    path.resolve(__dirname, '..', '..', '..', 'src', 'config'),
    path.resolve(__dirname, '..', '..', '..', 'config'),
  ].filter(Boolean);
  for (const dir of candidates) {
    try {
      const stat = fs.statSync(dir);
      if (stat.isDirectory()) {
        _configDir = dir;
        break;
      }
    } catch (_) {
      // ignore missing
    }
  }
  // If none found, keep null; we handle later.
  return _configDir;
}

function tryRequire(modulePath) {
  try {
    // Clear from require cache to reflect changes when reloading
    delete require.cache[require.resolve(modulePath)];
  } catch (_) {
    // not cached
  }
  try {
    const mod = require(modulePath);
    return mod && typeof mod === 'object' && 'default' in mod ? mod.default : mod;
  } catch (_) {
    return undefined;
  }
}

function loadConfig() {
  const dir = resolveConfigDir();
  if (!dir) {
    _cache = {};
    return _cache;
  }

  // Prefer app.js or app.json
  const appJs = path.join(dir, 'app.js');
  const appJson = path.join(dir, 'app.json');

  let cfg = tryRequire(appJs);
  if (cfg === undefined) cfg = tryRequire(appJson);

  if (cfg === undefined) {
    // Aggregate all config files into a single object keyed by filename
    cfg = {};
    let files = [];
    try {
      files = fs.readdirSync(dir);
    } catch (_) {
      files = [];
    }
    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (!['.js', '.json'].includes(ext)) continue;
      const base = path.basename(file, ext);
      if (base === 'app' || base.startsWith('_')) continue;
      const mod = tryRequire(path.join(dir, file));
      if (mod !== undefined) cfg[base] = mod;
    }
  }

  // If app.js exported a function, allow it to return the config object
  if (typeof cfg === 'function') {
    try {
      cfg = cfg();
    } catch (_) {
      cfg = {};
    }
  }

  if (!cfg || typeof cfg !== 'object') cfg = {};
  _cache = cfg;
  return _cache;
}

function getByPath(obj, key, fallback) {
  if (!key) return obj ?? fallback;
  const parts = String(key).split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return fallback;
    if (Object.prototype.hasOwnProperty.call(cur, p)) {
      cur = cur[p];
    } else {
      return fallback;
    }
  }
  return cur === undefined ? fallback : cur;
}

const MISSING = Symbol('missing');

function config(key, fallback = null) {
  if (_cache === null) loadConfig();
  return getByPath(_cache, key, fallback);
}

config.has = function has(key) {
  if (_cache === null) loadConfig();
  return getByPath(_cache, key, MISSING) !== MISSING;
};

config.all = function all() {
  if (_cache === null) loadConfig();
  return _cache;
};

config.reload = function reload() {
  _cache = null;
  return loadConfig();
};

config.dir = function dir() {
  return resolveConfigDir();
};

module.exports = config;
