'use strict';

const Oxen = require('oxen-queue');
const config = require('@core/util/functions/config');

const _cache = new Map();

function build_mysql_config() {
  const db = config('db') || {};
  const url = db.url || process.env.DATABASE_URL || null;
  if (url) {
    // Naive URL parsing for mysql://user:pass@host:port/db
    try {
      const u = new URL(url);
      return {
        user: decodeURIComponent(u.username || ''),
        password: decodeURIComponent(u.password || ''),
        host: u.hostname || '127.0.0.1',
        port: u.port ? Number(u.port) : undefined,
        database: (u.pathname || '').replace(/^\//, '') || undefined,
      };
    } catch (_) {}
  }
  return {
    user: db.username || process.env.DB_USER || 'root',
    password: db.password || process.env.DB_PASS || '',
    host: db.host || process.env.DB_HOST || '127.0.0.1',
    port: db.port || (process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined),
    database: db.database || process.env.DB_NAME || 'expressjs_api_server',
  };
}

function get_instance(job_type = 'email_jobs') {
  if (_cache.has(job_type)) return _cache.get(job_type);
  const inst = new Oxen({
    mysql_config: build_mysql_config(),
    db_table: 'oxen_queue',
    job_type,
  });
  _cache.set(job_type, inst);
  return inst;
}

const default_instance = get_instance('email_jobs');
default_instance.for = (type) => get_instance(type);
// Gracefully stop all processors and close underlying DB pools
default_instance.closeAll = async () => {
  for (const inst of _cache.values()) {
    try { inst.stopProcessing && inst.stopProcessing(); } catch (_) {}
    try { inst.db && typeof inst.db.end === 'function' && (await inst.db.end()); } catch (_) {}
  }
  _cache.clear();
};

module.exports = default_instance;
