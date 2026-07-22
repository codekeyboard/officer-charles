# debug(...args)

## Overview

Tiny file logger that writes to a rotating folder structure under `logs/` outside of `src`. It mirrors the Python example: daily folders with hourly subfolders, and timestamped files.

## Behavior

- Respects configuration flags: `config('debug', false)` or `config('app.debug', false)`
- Writes to `<project>/logs/<YYYY-MM-DD>/<YYYY-MM-DD--HH-00-logs>/<YYYY-MM-DD--HH-MM-SS>-debug.log`
- Creates directories automatically
- Joins multiple args with spaces; objects are JSON-stringified; `Error` includes stack
- Optional override base logs dir with `process.env.LOGS_DIR`

## Usage

```js
const debug = require('core/util/functions/debug');

// Ensure debug is enabled via config, for example in src/config/app.js:
// module.exports = { app: { debug: true } };

debug('Hello');
debug({ userId: 123, action: 'login' });
debug(new Error('Something went wrong'));
```

## Notes

- Uses `process.cwd()` as the project root by default.
- If `config('debug')` is falsy, the function is a no-op.

