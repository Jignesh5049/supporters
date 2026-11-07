import { decodeCursor } from '../../lib/pagination';

/**
 * Keyset pages over UUIDv7 ids in either direction. Work queues read oldest
 * first, so the longest-waiting item is on top; history reads newest first.
 */
export const queuePageArgs = (
  cursor: string | undefined,
  limit: number,
  direction: 'asc' | 'desc',
) => {
  const after = decodeCursor(cursor);
  return {
    where: after ? { id: direction === 'asc' ? { gt: after } : { lt: after } } : {},
    orderBy: { id: direction },
    take: limit + 1,
  };
};
