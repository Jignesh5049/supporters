import { inject } from 'vitest';
import { SEARCH_ENTITIES, SEARCH_INDEX, createMeili } from '../modules/search/meili';
import { SearchIndexer } from '../modules/search/search.indexer';
import { SEARCH_SYNC_EVENT } from '../modules/search/search.sync';
import { type ReferenceData, call, readyUpload } from './catalog';
import { type MobileSession, type TestContext, prisma } from './helpers';

/** The worker's view of Meilisearch (scoped index key). */
export const meili = createMeili(inject('meiliUrl'), inject('meiliIndexKey'));
export const indexer = new SearchIndexer(prisma, meili, 10_000);

/**
 * Applies every pending `search.sync` event in order, the way the worker
 * does, and returns once Meilisearch has them all. Call it before searching,
 * so no indexing is still running when the next test resets the database.
 */
export async function drainSearch(): Promise<number> {
  const events = await prisma.outboxEvent.findMany({
    where: { type: SEARCH_SYNC_EVENT, processedAt: null },
    orderBy: { id: 'asc' },
    select: { id: true },
  });
  for (const event of events) await indexer.processEvent(event.id);
  return events.length;
}

/** Empties every index; run before each search test. */
export async function resetSearch() {
  for (const entity of SEARCH_ENTITIES) {
    await meili.index(SEARCH_INDEX[entity]).deleteAllDocuments().waitTask({ timeout: 10_000 });
  }
}

/** Ids in a search index, sorted. */
export async function indexedIds(entity: (typeof SEARCH_ENTITIES)[number]): Promise<string[]> {
  const page = await meili
    .index<{ id: string }>(SEARCH_INDEX[entity])
    .getDocuments<{ id: string }>({ fields: ['id'], limit: 1_000 });
  return page.results.map((doc) => doc.id).sort();
}

/** Creates a product (published, with an image, unless overridden) through the API. */
export async function createProduct(
  ctx: TestContext,
  owner: MobileSession,
  refs: ReferenceData,
  overrides: object = {},
) {
  const response = await call(ctx, 'POST', '/v1/me/business/products', {
    as: owner,
    body: {
      title: 'M8 steel bolts',
      categoryId: refs.subcategory.id,
      description: 'Zinc-plated, grade 8.8.',
      mediaIds: [await readyUpload(owner.user.id)],
      status: 'published',
      ...overrides,
    },
  });
  if (response.statusCode !== 201) throw new Error(`create product failed: ${response.body}`);
  return response.json<{ id: string }>().id;
}

export async function createService(
  ctx: TestContext,
  owner: MobileSession,
  refs: ReferenceData,
  overrides: object = {},
) {
  const response = await call(ctx, 'POST', '/v1/me/business/services', {
    as: owner,
    body: {
      title: 'CNC machining',
      categoryId: refs.otherCategory.id,
      description: 'Short runs, 3-axis.',
      mediaIds: [await readyUpload(owner.user.id)],
      status: 'published',
      ...overrides,
    },
  });
  if (response.statusCode !== 201) throw new Error(`create service failed: ${response.body}`);
  return response.json<{ id: string }>().id;
}

interface Hit {
  type: string;
  business?: { id: string };
  listing?: { id: string };
  post?: { id: string };
}

/** The result ids of a search response, in order. */
export const hitIds = (body: { data: Hit[] }) =>
  body.data.map((hit) => (hit.business ?? hit.listing ?? hit.post)?.id);

/** One indexed document, as the worker wrote it. */
export const docOf = (entity: (typeof SEARCH_ENTITIES)[number], id: string) =>
  meili.index<Record<string, unknown>>(SEARCH_INDEX[entity]).getDocument(id);
