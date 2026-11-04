import { makePost } from './fixtures';
import { patchPostData } from './post-cache';

type Post = ReturnType<typeof makePost>;
const like = (p: Post): Post => ({ ...p, isLiked: true });

describe('patchPostData', () => {
  it('patches a single post by id', () => {
    const post = makePost(1);
    expect(patchPostData(post, post.id, like).isLiked).toBe(true);
    expect(patchPostData(post, makePost(2).id, like)).toBe(post);
  });

  it('patches only the matching post in pages and saved items', () => {
    const a = makePost(1);
    const b = makePost(2);
    const data = {
      pages: [
        { data: [a, b], nextCursor: 'c' },
        { data: [{ id: 'x', type: 'post', savedAt: 'now', post: a }], nextCursor: null },
      ],
      pageParams: [undefined, 'c'],
    };
    const next = patchPostData(data, a.id, like);
    expect((next.pages[0].data[0] as Post).isLiked).toBe(true);
    expect((next.pages[0].data[1] as Post).isLiked).toBe(false);
    expect((next.pages[1].data[0] as unknown as { post: Post }).post.isLiked).toBe(true);
  });

  it('leaves unrelated data alone', () => {
    const data = { foo: 1 };
    expect(patchPostData(data, 'id', like)).toBe(data);
  });
});
