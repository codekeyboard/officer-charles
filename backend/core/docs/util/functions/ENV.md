# env(key, fallback = null, prefix = '')

## Overview

Lightweight Node helper for reading environment variables with optional prefixing and type helpers. Mirrors the simplicity of the React `env` utility, but tailored for Node.

## Features

- Optional prefix support (e.g., `MYAPP_`)
- Sensible fallbacks when missing
- Type helpers: `bool`, `int`, `float`, and `required`
- Auto-loads `.env` via `dotenv` when available

## Installation

Optional for `.env` support:

```sh
npm i dotenv
```

## Usage

```js
const env = require('core/util/functions/env');

// strings
const nodeEnv = env('NODE_ENV', 'development');

// with prefix
const apiUrl = env('API_URL', null, 'MYAPP_'); // reads MYAPP_API_URL

// required
const secret = env.required('JWT_SECRET'); // throws if missing

// typed
const debug = env.bool('DEBUG', false); // true/false
const port = env.int('PORT', 3000);     // number
const ratio = env.float('RATIO', 0.75); // number
```

## Notes

- If `dotenv` is installed, `.env` at project root is loaded automatically.
- Unknown or malformed values fall back to the provided default.

