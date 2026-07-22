const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('@src/config/env.config');

const ACCESS_COOKIE = process.env.AUTH_ACCESS_COOKIE_NAME || 'oc_access_token';
const REFRESH_COOKIE = process.env.AUTH_REFRESH_COOKIE_NAME || 'oc_refresh_token';
const DEFAULT_ACCESS_EXPIRES_IN = '15m';
const DEFAULT_REFRESH_EXPIRES_IN = '7d';

function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role || 'user'
    },
    config.jwt.accessSecret || 'local-access-secret',
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' }
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      type: 'refresh'
    },
    config.jwt.refreshSecret || 'local-refresh-secret',
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.accessSecret || 'local-access-secret');
}

function verifyRefreshToken(token) {
  return jwt.verify(token, config.jwt.refreshSecret || 'local-refresh-secret');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function getRefreshExpiry() {
  return new Date(Date.now() + getRefreshMaxAgeMs());
}

function getAccessExpiry() {
  return new Date(Date.now() + getAccessMaxAgeMs());
}

function getAccessMaxAgeMs() {
  return parseDurationToMs(process.env.JWT_ACCESS_EXPIRES_IN || DEFAULT_ACCESS_EXPIRES_IN, 15 * 60 * 1000);
}

function getRefreshMaxAgeMs() {
  const fallbackDays = Number(process.env.JWT_REFRESH_EXPIRES_DAYS || 7);
  const fallbackMs = (Number.isFinite(fallbackDays) && fallbackDays > 0 ? fallbackDays : 7) * 24 * 60 * 60 * 1000;
  return parseDurationToMs(process.env.JWT_REFRESH_EXPIRES_IN || DEFAULT_REFRESH_EXPIRES_IN, fallbackMs);
}

function parseDurationToMs(value, fallbackMs) {
  const raw = String(value || '').trim();
  if (!raw) return fallbackMs;
  if (/^\d+$/.test(raw)) return Number(raw) * 1000;

  const match = raw.match(/^(\d+(?:\.\d+)?)\s*(ms|s|m|h|d|w)$/i);
  if (!match) return fallbackMs;

  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return fallbackMs;

  const unit = match[2].toLowerCase();
  const multipliers = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000
  };
  return Math.round(amount * multipliers[unit]);
}

function setAuthCookies(res, { accessToken, refreshToken }) {
  const secure = process.env.NODE_ENV === 'production';
  const sameSite = secure ? 'none' : 'lax';

  res.cookie(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure,
    sameSite,
    maxAge: getAccessMaxAgeMs()
  });

  res.cookie(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure,
    sameSite,
    maxAge: getRefreshMaxAgeMs()
  });
}

function clearAuthCookies(res) {
  res.clearCookie(ACCESS_COOKIE);
  res.clearCookie(REFRESH_COOKIE);
}

function readAccessToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  return req.cookies?.[ACCESS_COOKIE] || '';
}

function readRefreshToken(req) {
  return req.cookies?.[REFRESH_COOKIE] || req.body?.refreshToken || '';
}

module.exports = {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
  getRefreshExpiry,
  getAccessExpiry,
  getAccessMaxAgeMs,
  getRefreshMaxAgeMs,
  setAuthCookies,
  clearAuthCookies,
  readAccessToken,
  readRefreshToken
};
