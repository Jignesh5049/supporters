import { loadEnv } from '../src/config/env';
import { createMeili } from '../src/modules/search/meili';
import { SearchIndexer } from '../src/modules/search/search.indexer';
import { createPrisma } from '../src/plugins/data';

/**
 * Full reindex from PostgreSQL: applies index settings, upserts every public
 * business, product, service and post, and deletes whatever is no longer
 * public. Runs in place, so search stays up. Use after restoring Meilisearch,
 * changing index settings, or if the worker was down long enough to lose jobs.
 */
const env = loadEnv();
if (!env.MEILI_INDEX_KEY) throw new Error('search:reindex needs MEILI_INDEX_KEY');

const prisma = createPrisma(env.DATABASE_URL);
try {
  const indexer = new SearchIndexer(prisma, createMeili(env.MEILI_URL, env.MEILI_INDEX_KEY));
  await indexer.reindexAll((entity, count) => {
    process.stderr.write(`\r${entity}: ${count} indexed`);
  });
  process.stderr.write('\ndone\n');
} finally {
  await prisma.$disconnect();
}
