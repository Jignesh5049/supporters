import type { EnqueuedTaskPromise, Meilisearch } from 'meilisearch';
import type { PrismaClient } from '../../generated/prisma/client';
import { SEARCH_ENTITIES, SEARCH_INDEX, type SearchEntity, ensureIndexes } from './meili';
import { LOADERS, type SearchDoc } from './search.documents';
import { SEARCH_SYNC_EVENT, searchSyncPayloadSchema } from './search.sync';

/** Rows per batch in a full reindex. */
const REINDEX_BATCH = 500;
/** Document ids read back per request when looking for stale documents. */
const ID_PAGE = 1_000;

const LISTINGS_AND_POSTS = ['product', 'service', 'post'] as const satisfies SearchEntity[];

/**
 * Keeps Meilisearch in step with PostgreSQL. Every write re-reads the row with
 * the public-page rules: an indexable row is upserted, anything else (draft,
 * archived, deleted, suspended owner, gone) is removed. Meilisearch tasks are
 * awaited, so a job only succeeds once the index has the change.
 */
export class SearchIndexer {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly client: Meilisearch,
    private readonly timeOutMs = 30_000,
  ) {}

  /** Handles one `search.sync` outbox event, then marks it processed. Safe to repeat. */
  async processEvent(eventId: string): Promise<void> {
    const event = await this.prisma.outboxEvent.findUnique({ where: { id: eventId } });
    if (!event || event.type !== SEARCH_SYNC_EVENT) return;
    if (event.processedAt === null) {
      const payload = searchSyncPayloadSchema.parse(event.payload);
      await this.sync(payload.entity, payload.id);
    }
    await this.prisma.outboxEvent.update({
      where: { id: eventId },
      data: { processedAt: event.processedAt ?? new Date() },
    });
  }

  async sync(entity: SearchEntity, id: string): Promise<void> {
    if (entity === 'business') {
      await this.syncBusiness(id);
      return;
    }
    const docs = await LOADERS[entity](this.prisma, { ids: [id] });
    const index = this.client.index(SEARCH_INDEX[entity]);
    await this.wait(docs.length > 0 ? index.addDocuments(docs) : index.deleteDocument(id));
  }

  /** The business, then its listings and posts, which copy its name, place, type and badge. */
  private async syncBusiness(businessId: string) {
    const docs = await LOADERS.business(this.prisma, { ids: [businessId] });
    const index = this.client.index(SEARCH_INDEX.business);
    await this.wait(docs.length > 0 ? index.addDocuments(docs) : index.deleteDocument(businessId));
    for (const entity of LISTINGS_AND_POSTS) {
      const fresh = await LOADERS[entity](this.prisma, { businessId });
      await this.replace(entity, fresh, `businessId = ${JSON.stringify(businessId)}`);
    }
  }

  /**
   * Full rebuild (`pnpm search:reindex`): applies settings, upserts every
   * indexable row in batches, then deletes documents with no indexable row.
   * Runs in place, so search keeps working throughout.
   */
  async reindexAll(onProgress?: (entity: SearchEntity, count: number) => void): Promise<void> {
    await ensureIndexes(this.client, this.timeOutMs * 4);
    for (const entity of SEARCH_ENTITIES) {
      const index = this.client.index(SEARCH_INDEX[entity]);
      const live = new Set<string>();
      let afterId: string | undefined;
      for (;;) {
        const docs = await LOADERS[entity](this.prisma, {
          take: REINDEX_BATCH,
          ...(afterId ? { afterId } : {}),
        });
        if (docs.length === 0) break;
        await this.wait(index.addDocuments(docs));
        for (const doc of docs) live.add(doc.id);
        afterId = docs.at(-1)?.id;
        onProgress?.(entity, live.size);
      }
      const stale = (await this.indexedIds(entity)).filter((id) => !live.has(id));
      if (stale.length > 0) await this.wait(index.deleteDocuments(stale));
    }
  }

  /** Upserts `fresh` and deletes every other document matching `filter`. */
  private async replace(entity: SearchEntity, fresh: SearchDoc[], filter: string) {
    const index = this.client.index(SEARCH_INDEX[entity]);
    if (fresh.length > 0) await this.wait(index.addDocuments(fresh));
    const keep = new Set(fresh.map((doc) => doc.id));
    const stale = (await this.indexedIds(entity, filter)).filter((id) => !keep.has(id));
    if (stale.length > 0) await this.wait(index.deleteDocuments(stale));
  }

  private async indexedIds(entity: SearchEntity, filter?: string): Promise<string[]> {
    const index = this.client.index<{ id: string }>(SEARCH_INDEX[entity]);
    const ids: string[] = [];
    for (let offset = 0; ; offset += ID_PAGE) {
      const page = await index.getDocuments<{ id: string }>({
        fields: ['id'],
        limit: ID_PAGE,
        offset,
        ...(filter ? { filter } : {}),
      });
      ids.push(...page.results.map((doc) => doc.id));
      if (page.results.length < ID_PAGE) return ids;
    }
  }

  private async wait(task: EnqueuedTaskPromise) {
    const done = await task.waitTask({ timeout: this.timeOutMs });
    if (done.status !== 'succeeded') {
      throw new Error(`Meilisearch task ${done.uid} ${done.status}: ${done.error?.code ?? ''}`);
    }
  }
}
