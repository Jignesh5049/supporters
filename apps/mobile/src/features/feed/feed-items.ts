import type { FeedItem } from '@supporters/shared';

/** Product spec, Home feed (guest): a sign-up prompt after every 10 posts. */
export const SIGN_UP_PROMPT_EVERY = 10;

export type FeedRow =
  { kind: 'post'; key: string; post: FeedItem } | { kind: 'prompt'; key: string };

/**
 * Rows for the list: the posts of every loaded page (a post seen twice across
 * pages shows once), with a sign-up prompt after each 10th post for guests.
 */
export function buildFeedRows(pages: { data: FeedItem[] }[], isGuest: boolean): FeedRow[] {
  const seen = new Set<string>();
  const rows: FeedRow[] = [];
  let count = 0;
  for (const page of pages) {
    for (const post of page.data) {
      if (seen.has(post.id)) continue;
      seen.add(post.id);
      rows.push({ kind: 'post', key: post.id, post });
      count += 1;
      if (isGuest && count % SIGN_UP_PROMPT_EVERY === 0) {
        rows.push({ kind: 'prompt', key: `prompt-${count}` });
      }
    }
  }
  return rows;
}
