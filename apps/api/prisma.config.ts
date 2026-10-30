import { existsSync } from 'node:fs';
import { defineConfig } from 'prisma/config';

// Prisma 7 no longer reads .env itself. Local only; CI and servers set real env vars.
if (existsSync('.env')) process.loadEnvFile('.env');

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx --env-file-if-exists=.env prisma/seed.ts',
  },
  // `prisma generate` runs in CI without a database, so the URL is optional here;
  // migrate and seed fail fast when it is missing.
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },
});
