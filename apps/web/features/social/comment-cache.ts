import type { Comment, Page } from '@supporters/shared';
import type { InfiniteData } from '@tanstack/react-query';

export type CommentPages = InfiniteData<Page<Comment>, string | undefined>;

/** Puts a new comment at the top of its list (lists are newest first). */
export function prependComment(data: CommentPages | undefined, comment: Comment) {
  if (!data) return data;
  const [first, ...rest] = data.pages;
  const head: Page<Comment> = first
    ? { ...first, data: [comment, ...first.data] }
    : { data: [comment], nextCursor: null };
  return { ...data, pages: [head, ...rest] };
}

export function removeComment(data: CommentPages | undefined, commentId: string) {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      data: page.data.filter((comment) => comment.id !== commentId),
    })),
  };
}

export function adjustReplyCount(data: CommentPages | undefined, parentId: string, by: number) {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      data: page.data.map((comment) =>
        comment.id === parentId
          ? { ...comment, replyCount: Math.max(0, comment.replyCount + by) }
          : comment,
      ),
    })),
  };
}

/** Comments removed by a delete: a top-level comment takes its replies with it. */
export const removedByDelete = (comment: Comment) =>
  comment.parentId === null ? 1 + comment.replyCount : 1;

/**
 * Who may delete a comment (product spec, Feed and social): its author, or
 * the owner of the post's business. The API checks the same rule.
 */
export function canDeleteComment(
  comment: Comment,
  viewer: { userId: string | null; isPostOwner: boolean },
) {
  return viewer.isPostOwner || (viewer.userId !== null && comment.author.id === viewer.userId);
}
