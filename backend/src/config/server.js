const config = require('./env.config');

module.exports = {
  protocol: process.env.SERVER_PROTOCOL || 'http',
  host: config.app.host,
  port: config.app.port,
  corsOrigins: config.app.corsOrigins
};
