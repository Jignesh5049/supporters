import type { Comment, FeedItem, Page } from '@supporters/shared';
import { InfiniteQueryObserver, QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { postFixture } from '@/lib/catalog/fixtures';
import {
  adjustReplyCount,
  canDeleteComment,
  prependComment,
  removeComment,
  removedByDelete,
} from './comment-cache';
import { createSeenBatcher } from './seen-batcher';
import { cursorListOptions, flattenPages, seedPages } from './use-feed';

const item = (id: string): FeedItem => ({ ...postFixture, id, source: 'all_india' });

describe('feed pages', () => {
  it('seeds the first server page and flattens without duplicates', () => {
    const data = seedPages<FeedItem>({ data: [item('a'), item('b')], nextCursor: 'c1' });
    data.pages.push({ data: [item('b'), item('c')], nextCursor: null });
    expect(flattenPages(data).map((post) => post.id)).toEqual(['a', 'b', 'c']);
    expect(flattenPages(undefined)).toEqual([]);
  });

  it('continues from the cursor the server page returned', async () => {
    const fetchPage = vi.fn(async (cursor: string | undefined): Promise<Page<FeedItem>> =>
      cursor === 'c1' ? { data: [item('c')], nextCursor: null } : { data: [], nextCursor: null },
    );
    const first: Page<FeedItem> = { data: [item('a')], nextCursor: 'c1' };
    const observer = new InfiniteQueryObserver(
      new QueryClient(),
      cursorListOptions(['t'], fetchPage, first),
    );
    expect(observer.getCurrentResult().hasNextPage).toBe(true);
    await observer.fetchNextPage();
    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect(fetchPage).toHaveBeenCalledWith('c1');
    expect(flattenPages(observer.getCurrentResult().data).map((post) => post.id)).toEqual([
      'a',
      'c',
    ]);
    expect(observer.getCurrentResult().hasNextPage).toBe(false);
  });
});

describe('seen batcher', () => {
  it('sends each id once and batches at the API maximum', () => {
    const send = vi.fn(async (ids: string[]) => ids.length);
    const batcher = createSeenBatcher(send);
    for (let i = 0; i < 60; i += 1) batcher.add(`p${i}`);
    batcher.add('p0');
    batcher.flush();
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[0]![0]).toHaveLength(50);
    expect(send.mock.calls[1]![0]).toHaveLength(10);
    batcher.add('p1');
    batcher.flush();
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('swallows a failed batch', () => {
    const batcher = createSeenBatcher(async () => {
      throw new Error('offline');
    });
    batcher.add('p1');
    expect(() => batcher.flush()).not.toThrow();
  });
});

const comment = (over: Partial<Comment>): Comment => ({
  id: 'c1',
  postId: postFixture.id,
  parentId: null,
  body: 'Nice',
  author: { id: 'u1', name: 'Asha' },
  isByBusiness: false,
  replyCount: 0,
  createdAt: '2026-11-03T10:00:00.000Z',
  ...over,
});

describe('comment cache', () => {
  const pages = (data: Comment[]) => ({
    pages: [{ data, nextCursor: null }],
    pageParams: [undefined],
  });

  it('adds new comments first, removes them, and adjusts reply counts', () => {
    const base = pages([comment({ id: 'c1', replyCount: 1 })]);
    expect(prependComment(base, comment({ id: 'c2' }))!.pages[0]!.data.map((c) => c.id)).toEqual([
      'c2',
      'c1',
    ]);
    expect(removeComment(base, 'c1')!.pages[0]!.data).toEqual([]);
    expect(adjustReplyCount(base, 'c1', -5)!.pages[0]!.data[0]!.replyCount).toBe(0);
    expect(prependComment(undefined, comment({}))).toBeUndefined();
  });

  it('counts a top-level delete with its replies', () => {
    expect(removedByDelete(comment({ replyCount: 3 }))).toBe(4);
    expect(removedByDelete(comment({ parentId: 'c0', replyCount: 0 }))).toBe(1);
  });

  it('lets authors and the post owner delete, nobody else', () => {
    const mine = comment({ author: { id: 'u1', name: 'Asha' } });
    expect(canDeleteComment(mine, { userId: 'u1', isPostOwner: false })).toBe(true);
    expect(canDeleteComment(mine, { userId: 'u2', isPostOwner: false })).toBe(false);
    expect(canDeleteComment(mine, { userId: 'u2', isPostOwner: true })).toBe(true);
    expect(canDeleteComment(mine, { userId: null, isPostOwner: false })).toBe(false);
  });
});
