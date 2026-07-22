const envConfig = require('./env.config');
const server = require('./server');
const db = require('./db');
const middleware = require('./middleware');

module.exports = {
  debug: process.env.DEBUG === 'true',
  env: envConfig.app.nodeEnv,
  server,
  db,
  middleware,
  azure: envConfig.azure,
  ai: envConfig.ai,
  limits: envConfig.limits
};
