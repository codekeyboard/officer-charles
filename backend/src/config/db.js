const config = require('./env.config');

const dbConfig = {
  dialect: config.database.dialect || 'postgres',
  host: config.database.host || '127.0.0.1',
  port: config.database.port || 5432,
  username: config.database.username || undefined,
  password: config.database.password || undefined,
  database: config.database.database || undefined,
  logging: config.database.logging
};

if (config.database.url) {
  dbConfig.url = config.database.url;
  dbConfig.use_env_variable = 'DATABASE_URL';
}

module.exports = dbConfig;
