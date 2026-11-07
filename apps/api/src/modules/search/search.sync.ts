import { z } from 'zod';
import type { Prisma } from '../../generated/prisma/client';
import { SEARCH_ENTITIES, type SearchEntity } from './meili';

/**
 * Outbox type for "this row may have changed what search should show". The
 * relay sends these to the `search-index` queue instead of `notifications`.
 */
export const SEARCH_SYNC_EVENT = 'search.sync';

export const searchSyncPayloadSchema = z.object({
  entity: z.enum(SEARCH_ENTITIES),
  id: z.uuid(),
});
export type SearchSyncPayload = z.infer<typeof searchSyncPayloadSchema>;

/**
 * Records, in the caller's transaction, that a business, product, service or
 * post must be re-read into the index (transactional outbox, so no committed
 * change is ever missed). The worker re-reads the row: it does not matter what
 * changed, or whether the row still exists. A business also refreshes its
 * listings and posts, which copy its name, city, type and badge.
 *
 * Call it from any write that changes a searchable field or whether the row is
 * public: publish, unpublish, edit, delete, hide, suspend, verify.
 */
export async function recordSearchSync(
  tx: Prisma.TransactionClient,
  entity: SearchEntity,
  id: string,
): Promise<void> {
  await tx.outboxEvent.create({
    data: { type: SEARCH_SYNC_EVENT, payload: { entity, id } satisfies SearchSyncPayload },
  });
}
