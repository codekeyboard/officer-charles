// Lightweight Node env helper you can copy to any project.
// Usage:
//   const env = require('./core/util/functions/env');
//   const port = env.int('PORT', 3000);
//   const nodeEnv = env('NODE_ENV', 'development');
//   const debug = env.bool('DEBUG', false);
//   const secret = env.required('JWT_SECRET');

let _dotenvTried = false;
function _maybeLoadDotenv() {
  if (_dotenvTried) return;
  _dotenvTried = true;
  try {
    // Load .env from process.cwd() if dotenv is installed.
    // Safe to ignore if not installed.
    require('dotenv').config();
  } catch (_) {
    // no-op if dotenv is not available
  }
}

function env(key, fallback = null, prefix = '') {
  _maybeLoadDotenv();
  const fullKey = prefix ? `${prefix}${key}` : key;
  const value = process.env[fullKey];
  return value !== undefined ? value : fallback;
}

env.required = function required(key, prefix = '') {
  const value = env(key, undefined, prefix);
  if (value === undefined) {
    const fullKey = prefix ? `${prefix}${key}` : key;
    throw new Error(`Missing required environment variable: ${fullKey}`);
  }
  return value;
};

env.int = function int(key, fallback = null, prefix = '') {
  const value = env(key, undefined, prefix);
  if (value === undefined) return fallback;
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? fallback : n;
};

env.float = function float(key, fallback = null, prefix = '') {
  const value = env(key, undefined, prefix);
  if (value === undefined) return fallback;
  const n = parseFloat(value);
  return Number.isNaN(n) ? fallback : n;
};

env.bool = function bool(key, fallback = null, prefix = '') {
  const value = env(key, undefined, prefix);
  if (value === undefined) return fallback;
  const s = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(s)) return true;
  if (['0', 'false', 'no', 'off'].includes(s)) return false;
  return fallback;
};

module.exports = env;

