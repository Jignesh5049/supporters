import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\/(.*)$/, replacement: `${fromRoot('./')}$1` },
      // Next swaps `server-only` for an empty module on the server; tests run as the server.
      { find: /^server-only$/, replacement: fromRoot('./test/empty-module.ts') },
    ],
  },
  test: {
    environment: 'node',
    include: ['**/*.test.ts'],
    exclude: ['node_modules/**', 'e2e/**', '.next/**'],
  },
});
