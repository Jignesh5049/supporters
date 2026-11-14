// Bundles the API, the worker and the operations scripts into dist/ for the production image (`node dist/server.js`,
// `node dist/worker.js`). Our own TypeScript, the generated Prisma client and the
// @supporters/shared workspace package (which ships TypeScript source) are bundled; every other
// dependency stays external and is installed from the lockfile by `pnpm deploy --prod`.
import { readFile } from 'node:fs/promises';
import { URL } from 'node:url';
import { build } from 'esbuild';

const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const external = Object.keys(pkg.dependencies).filter((name) => !name.startsWith('@supporters/'));

await build({
  entryPoints: {
    server: 'src/server.ts',
    worker: 'src/worker.ts',
    // One-off operations tasks, run in the same image (deploy/README.md).
    'scripts/init-search': 'scripts/init-search.ts',
    'scripts/reindex-search': 'scripts/reindex-search.ts',
    'scripts/create-admin': 'scripts/create-admin.ts',
  },
  outdir: 'dist',
  bundle: true,
  platform: 'node',
  target: 'node24',
  format: 'esm',
  sourcemap: true,
  // CommonJS packages that call require() at runtime need one in an ES module.
  banner: {
    js: "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);",
  },
  external: [...external, ...external.map((name) => `${name}/*`)],
  logLevel: 'info',
});
