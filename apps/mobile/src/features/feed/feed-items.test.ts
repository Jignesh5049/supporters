import type { FeedItem } from '@supporters/shared';
import { makePost } from '../social/fixtures';
import { buildFeedRows } from './feed-items';

const item = (n: number) => ({ ...makePost(n), source: 'all_india' }) as FeedItem;
const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => item(from + i));

describe('buildFeedRows', () => {
  it('adds a prompt after every 10th post for guests', () => {
    const rows = buildFeedRows([{ data: range(1, 10) }, { data: range(11, 25) }], true);
    const promptAt = rows.flatMap((row, i) => (row.kind === 'prompt' ? [i] : []));
    expect(promptAt).toEqual([10, 21]);
    expect(rows.filter((r) => r.kind === 'post')).toHaveLength(25);
  });

  it('adds no prompts for signed-in users', () => {
    expect(buildFeedRows([{ data: range(1, 30) }], false).some((r) => r.kind === 'prompt')).toBe(
      false,
    );
  });

  it('drops a post that repeats across pages', () => {
    const rows = buildFeedRows([{ data: range(1, 3) }, { data: range(3, 5) }], false);
    expect(rows.map((r) => r.key)).toEqual([1, 2, 3, 4, 5].map((n) => item(n).id));
  });
});
