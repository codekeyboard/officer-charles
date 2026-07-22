# register-aliases

## Overview

Small Node require hook that adds path aliases to your project so you can import using concise prefixes instead of long relative paths.

Aliases
- `@src/` → `<project>/src/`
- `@core/` → `<project>/core/`
- `@/` → `<project>/`

## Location

File: `core/util/register-aliases.js` (relative to the project root)

## Usage

Preload the hook when starting your app so `require()` understands the aliases.

Package script example (in `project/package.json`):
```json
{
  "scripts": {
    "dev": "node -r ./core/util/register-aliases.js src/index.js",
    "start": "node -r ./core/util/register-aliases.js src/index.js"
  }
}
```

Then import with aliases anywhere in your project:
```js
// from project/src/index.js (or any file)
const config = require('@core/util/functions/config');
const debug = require('@core/util/functions/debug');
const routes = require('@src/routes');
const pkg = require('@/package.json');
```

## VS Code IntelliSense

Add a `jsconfig.json` in your project root so the editor resolves the aliases for auto-imports and Go to Definition.

`project/jsconfig.json`:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["*"],
      "@core/*": ["core/*"],
      "@src/*": ["src/*"]
    }
  },
  "exclude": [
    "node_modules",
    "**/dist",
    "**/build"
  ]
}
```

## Notes
- The hook patches Node's internal module resolver at runtime; no extra dependency needed.
- Keep the `-r ./core/util/register-aliases.js` preload in all start commands (dev, start, tests) that execute Node.
- You can change mappings by editing `core/util/register-aliases.js`.

