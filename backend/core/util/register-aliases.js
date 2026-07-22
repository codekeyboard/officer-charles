// Lightweight require alias registration for Node (CommonJS).
// Aliases:
//   @src/  -> <project>/src/
//   @core/ -> <project>/core/
//   @/     -> <project>/
// Load with: node -r ./core/util/register-aliases.js src/index.js

const path = require('path');
const Module = require('module');

// This file lives at <project>/core/util/register-aliases.js
// So repoRoot is the Node project root (one level up from core/util)
const projectRoot = path.resolve(__dirname, '..', '..');

const aliasMap = new Map([
  ['@src/', path.join(projectRoot, 'src') + path.sep],
  ['@core/', path.join(projectRoot, 'core') + path.sep],
  ['@/', projectRoot + path.sep],
]);

const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function patchedResolve(request, parent, isMain, options) {
  for (const [alias, target] of aliasMap) {
    if (request.startsWith(alias)) {
      const rel = request.slice(alias.length);
      const resolved = path.join(target, rel);
      return originalResolveFilename.call(this, resolved, parent, isMain, options);
    }
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

