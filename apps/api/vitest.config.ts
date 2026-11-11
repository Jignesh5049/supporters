import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    // Starts PostgreSQL 18, Valkey 9, MinIO and Meilisearch in Testcontainers once, then migrates.
    globalSetup: ['src/test/global-setup.ts'],
    // Test files share one database and reset it between tests, so run them one at a time.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 180_000,
  },
});
