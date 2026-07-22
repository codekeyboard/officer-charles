const fs = require('fs');
const path = require('path');
const config = require('./config');

function pad(n) {
  return String(n).padStart(2, '0');
}

function timestampParts(date = new Date()) {
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return { y, m, d, hh, mm, ss };
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function formatArg(arg) {
  if (arg instanceof Error) return arg.stack || arg.message;
  if (typeof arg === 'object') {
    try { return JSON.stringify(arg, null, 2); } catch (_) { return String(arg); }
  }
  return String(arg);
}

function logFilePath(baseDir, date = new Date()) {
  const { y, m, d, hh, mm, ss } = timestampParts(date);
  const dayDir = `${y}-${m}-${d}`; // Daily folder
  const hourDir = `${y}-${m}-${d}--${hh}-00-logs`; // Hourly folder
  const file = `${y}-${m}-${d}--${hh}-${mm}-${ss}-debug.log`;
  const dir = path.join(baseDir, dayDir, hourDir);
  return path.join(dir, file);
}

function debug(...args) {
  // Honor either top-level debug or app.debug for convenience
  const enabled = !!(config('debug', false) || config('app.debug', false));
  if (!enabled) return;

  const baseLogsDir = process.env.LOGS_DIR || path.join(process.cwd(), 'logs');
  const filePath = logFilePath(baseLogsDir, new Date());
  ensureDir(path.dirname(filePath));

  const now = new Date();
  const { y, m, d, hh, mm, ss } = timestampParts(now);
  const stamp = `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
  const line = `[${stamp}] ` + args.map(formatArg).join(' ');
  try {
    fs.appendFileSync(filePath, line + '\n', { encoding: 'utf8' });
  } catch (e) {
    // As a fallback, try to write to stderr
    try { process.stderr.write(`debug log write failed: ${e.message}\n`); } catch (_) {}
  }
}

module.exports = debug;

