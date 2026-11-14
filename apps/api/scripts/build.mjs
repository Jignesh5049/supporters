// Bundles the API and the worker into dist/ for the production image (`node dist/server.js`,
// `node dist/worker.js`). Our own TypeScript, the generated Prisma client and the
// @supporters/shared workspace package (which ships TypeScript source) are bundled; every other
// dependency stays external and is installed from the lockfile by `pnpm deploy --prod`.
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';

const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const external = Object.keys(pkg.dependencies).filter((name) => !name.startsWith('@supporters/'));

await build({
  entryPoints: { server: 'src/server.ts', worker: 'src/worker.ts' },
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
