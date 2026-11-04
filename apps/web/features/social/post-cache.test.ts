import type { FollowState, Page, Post, SavedItem } from '@supporters/shared';
import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { postFixture } from '@/lib/catalog/fixtures';
import {
  followUpdates,
  likeUpdates,
  saveUpdates,
  socialKeys,
  updatePostIn,
  withFollow,
  withLike,
} from './post-cache';

const other: Post = { ...postFixture, id: '4b0c4c55-3f6d-4b1f-9a51-2b2c0f3c9a99' };

function seeded() {
  const client = new QueryClient();
  client.setQueryData(socialKeys.post(postFixture.id), postFixture);
  client.setQueryData(socialKeys.feed(null), {
    pages: [{ data: [{ ...postFixture, source: 'all_india' }, other], nextCursor: null }],
    pageParams: [undefined],
  });
  const saved: SavedItem = {
    id: '4b0c4c55-3f6d-4b1f-9a51-2b2c0f3c9a50',
    savedAt: '2026-11-03T10:00:00.000Z',
    type: 'post',
    post: postFixture,
  };
  client.setQueryData(socialKeys.saves('post'), {
    pages: [{ data: [saved], nextCursor: null }],
    pageParams: [undefined],
  });
  return client;
}

const feedPosts = (client: QueryClient) =>
  client.getQueryData<{ pages: Page<Post>[] }>(socialKeys.feed(null))!.pages[0]!.data;
const postData = (client: QueryClient) =>
  client.getQueryData<Post>(socialKeys.post(postFixture.id));

describe('withLike', () => {
  it('flips the flag and moves the count', () => {
    expect(withLike(postFixture, true)).toMatchObject({ isLiked: true, likeCount: 4 });
    expect(withLike({ ...postFixture, isLiked: true }, false)).toMatchObject({
      isLiked: false,
      likeCount: 2,
    });
  });

  it('is a no-op when already in that state, and never goes below zero', () => {
    expect(withLike(postFixture, false)).toBe(postFixture);
    expect(withLike({ ...postFixture, isLiked: true, likeCount: 0 }, false).likeCount).toBe(0);
  });
});

describe('updatePostIn', () => {
  it('leaves other posts and unrelated data untouched (same reference)', () => {
    const page: Page<Post> = { data: [other], nextCursor: null };
    expect(updatePostIn(page, postFixture.id, (post) => withLike(post, true))).toBe(page);
    expect(updatePostIn(undefined, postFixture.id, (post) => post)).toBeUndefined();
  });
});

describe('optimistic like', () => {
  it('updates the post everywhere at once: page, feed and saved list', () => {
    const client = seeded();
    likeUpdates(client, postFixture.id, true).apply();
    expect(postData(client)?.isLiked).toBe(true);
    expect(feedPosts(client)[0]).toMatchObject({ isLiked: true, likeCount: 4 });
    expect(feedPosts(client)[1]).toMatchObject({ isLiked: false, likeCount: 3 });
    const saved = client.getQueryData<{ pages: Page<SavedItem>[] }>(socialKeys.saves('post'));
    expect(saved!.pages[0]!.data[0]).toMatchObject({ post: { isLiked: true, likeCount: 4 } });
  });

  it('rolls back to the original on error', () => {
    const client = seeded();
    const like = likeUpdates(client, postFixture.id, true);
    like.apply();
    like.rollback();
    expect(postData(client)).toMatchObject({ isLiked: false, likeCount: 3 });
  });

  it('settles on the count the API returned', () => {
    const client = seeded();
    const like = likeUpdates(client, postFixture.id, true);
    like.apply();
    like.settle({ isLiked: true, likeCount: 9 });
    expect(postData(client)?.likeCount).toBe(9);
  });

  it('does not undo a later tap when an earlier request fails', () => {
    const client = seeded();
    const first = likeUpdates(client, postFixture.id, true);
    first.apply();
    likeUpdates(client, postFixture.id, false).apply(); // quick second tap: unlike
    first.rollback(); // the like request failed, but the post already shows "not liked"
    expect(postData(client)).toMatchObject({ isLiked: false, likeCount: 3 });
  });
});

describe('optimistic save', () => {
  it('saves and rolls back', () => {
    const client = seeded();
    const save = saveUpdates(client, postFixture.id, true);
    save.apply();
    expect(feedPosts(client)[0]).toMatchObject({ isSaved: true, saveCount: 2 });
    save.rollback();
    expect(feedPosts(client)[0]).toMatchObject({ isSaved: false, saveCount: 1 });
  });
});

describe('optimistic follow', () => {
  const key = socialKeys.follow('b1');
  const initial: FollowState = { isFollowing: false, followerCount: 5 };

  it('withFollow moves the count and clamps at zero', () => {
    expect(withFollow(initial, true)).toEqual({ isFollowing: true, followerCount: 6 });
    expect(withFollow({ isFollowing: true, followerCount: 0 }, false).followerCount).toBe(0);
  });

  it('applies, settles and rolls back', () => {
    const client = new QueryClient();
    client.setQueryData(key, initial);
    const follow = followUpdates(client, 'b1', true);
    follow.apply();
    expect(client.getQueryData(key)).toEqual({ isFollowing: true, followerCount: 6 });
    follow.settle({ isFollowing: true, followerCount: 7 });
    expect(client.getQueryData(key)).toEqual({ isFollowing: true, followerCount: 7 });
    follow.rollback();
    expect(client.getQueryData(key)).toEqual({ isFollowing: false, followerCount: 6 });
  });
});
