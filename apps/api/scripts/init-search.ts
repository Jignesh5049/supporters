import { z } from 'zod';
import { createMeili, ensureIndexes, ensureScopedKeys } from '../src/modules/search/meili';

/**
 * Sets up Meilisearch once per environment: creates the scoped API and worker
 * keys with the master key, then the indexes and their settings with the
 * worker key. Prints the keys as .env lines, so locally:
 *
 *   MEILI_MASTER_KEY=meili-local-master-key pnpm --silent search:init >> .env
 *
 * The master key is read from the shell only, never from .env. Safe to re-run.
 */
const { MEILI_URL, MEILI_MASTER_KEY } = z
  .object({ MEILI_URL: z.url(), MEILI_MASTER_KEY: z.string().min(16) })
  .parse(process.env);

const keys = await ensureScopedKeys(createMeili(MEILI_URL, MEILI_MASTER_KEY));
await ensureIndexes(createMeili(MEILI_URL, keys.index));

process.stdout.write(
  [`MEILI_SEARCH_KEY=${keys.search}`, `MEILI_INDEX_KEY=${keys.index}`, ''].join('\n'),
);
