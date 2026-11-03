import { z } from 'zod';
import { invalidField } from './errors';

/**
 * Keyset pagination over UUIDv7 ids, newest first (backend spec, API design:
 * Pagination). The cursor is the last id of the page, base64url-encoded so
 * clients treat it as opaque.
 */
export const encodeCursor = (id: string) => Buffer.from(id, 'utf8').toString('base64url');

export function decodeCursor(cursor: string | undefined): string | undefined {
  if (cursor === undefined) return undefined;
  const id = z.uuid().safeParse(Buffer.from(cursor, 'base64url').toString('utf8'));
  if (!id.success) throw invalidField('query.cursor', 'Invalid cursor');
  return id.data;
}

/** Prisma arguments for one page: fetch one extra row to know whether another page follows. */
export const pageArgs = (cursor: string | undefined, limit: number) => {
  const after = decodeCursor(cursor);
  return {
    where: after ? { id: { lt: after } } : {},
    orderBy: { id: 'desc' as const },
    take: limit + 1,
  };
};

/** Drops the look-ahead row and returns the cursor for the next page, if any. */
export function splitPage<Row extends { id: string }>(rows: Row[], limit: number) {
  const pageRows = rows.slice(0, limit);
  const last = pageRows.at(-1);
  return { rows: pageRows, nextCursor: rows.length > limit && last ? encodeCursor(last.id) : null };
}

/**
 * Keyset pagination over (published_at, id), newest first, for posts: a post
 * keeps the time of its first publish, which can be later than its id's.
 */
export const encodeTimeCursor = (at: Date, id: string) =>
  Buffer.from(`${at.toISOString()}|${id}`, 'utf8').toString('base64url');

const timeCursorSchema = z
  .string()
  .transform((value) => value.split('|'))
  .pipe(z.tuple([z.iso.datetime(), z.uuid()]));

export function decodeTimeCursor(cursor: string | undefined) {
  if (cursor === undefined) return undefined;
  const parsed = timeCursorSchema.safeParse(Buffer.from(cursor, 'base64url').toString('utf8'));
  if (!parsed.success) throw invalidField('query.cursor', 'Invalid cursor');
  const [at, id] = parsed.data;
  return { at: new Date(at), id };
}

/** Rows strictly after the cursor in (published_at DESC, id DESC) order. */
export const afterTimeCursor = (after: { at: Date; id: string } | undefined) =>
  after
    ? { OR: [{ publishedAt: { lt: after.at } }, { publishedAt: after.at, id: { lt: after.id } }] }
    : {};
