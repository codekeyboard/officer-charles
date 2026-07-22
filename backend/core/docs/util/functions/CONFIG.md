# config(key, fallback = null)

## Overview

Node config helper (inspired by the Python core version) that reads configuration from the project's `src/config` directory. The primary entry is `src/config/app.js`, which can compose other config files (similar to Laravel). Falls back to aggregating all files in the directory when `app.js` is not present. Supports dot-notation lookups.

## How It Loads

- Resolves config directory from the first existing location:
  - `process.env.CONFIG_DIR`
  - `<project>/src/config`
  - `<project>/config`
- If `app.js` or `app.json` exists there, loads it as the root configuration.
- Otherwise, loads all `*.js`/`*.json` files in the directory (excluding `app.*` and files prefixed with `_`) and combines them into a single object keyed by filename.

## API

```js
const config = require('core/util/functions/config');

config('app.name', 'MyApp');  // read with default
config.has('database.host');  // boolean
config.all();                 // entire config object
config.reload();              // reload from disk
config.dir();                 // resolved config directory
```

## Example Structure

```
project/
  src/
    config/
      app.js
      app.json (optional)
      database.js
      mail.json
```

### src/config/database.js
```js
const env = require('core/util/functions/env');

module.exports = {
  driver: env('DB_DRIVER', 'postgres'),
  host: env('DB_HOST', 'localhost'),
  port: env.int('DB_PORT', 5432),
  user: env('DB_USER', 'postgres'),
  pass: env('DB_PASS', ''),
  name: env('DB_NAME', 'app_db'),
};
```

### src/config/app.js
```js
const env = require('core/util/functions/env');
const database = require('./database');

module.exports = {
  app: {
    name: env('APP_NAME', 'MyApp'),
    env: env('NODE_ENV', 'development'),
    debug: env.bool('DEBUG', false),
    url: env('APP_URL', 'http://localhost:3000'),
  },
  database,
};
```

## Usage Examples

```js
const config = require('core/util/functions/config');

// Basic
const appName = config('app.name', 'MyApp');

// Nested
const dbHost = config('database.host', 'localhost');

// Missing with fallback
const mailFrom = config('mail.from', 'no-reply@example.com');

// Get everything
const all = config.all();
```

## Notes

- `app.js` can export an object or a function returning an object.
- When aggregating without `app.js`, each file becomes a top-level key.
- Use the `env` helper in your config files to read `.env` values with sensible defaults.
- Override the config directory via `CONFIG_DIR` if your structure differs.

