import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query';
import type { Comment, CreateCommentInput, Page } from '@supporters/shared';
import { socialApi } from '../../../lib/api';
import { updatePostInCaches } from '../../social/post-cache';
import { socialKeys } from '../../social/query-keys';

type CommentPages = InfiniteData<Page<Comment>, string | undefined>;

/** Top-level comments of a post, or the replies of `parentId`, newest first. */
export function useComments(postId: string, parentId?: string, enabled = true) {
  return useInfiniteQuery({
    queryKey: socialKeys.comments(postId, parentId),
    queryFn: ({ pageParam }) => socialApi.comments(postId, { cursor: pageParam, parentId }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(postId) && enabled,
  });
}

function editComments(
  queryClient: QueryClient,
  postId: string,
  parentId: string | undefined,
  edit: (comments: Comment[], pageIndex: number) => Comment[],
) {
  queryClient.setQueryData<CommentPages>(socialKeys.comments(postId, parentId), (data) =>
    data
      ? { ...data, pages: data.pages.map((page, i) => ({ ...page, data: edit(page.data, i) })) }
      : data,
  );
}

function adjustCommentCount(queryClient: QueryClient, postId: string, delta: number) {
  updatePostInCaches(queryClient, postId, (post) => ({
    ...post,
    commentCount: Math.max(0, post.commentCount + delta),
  }));
}

function adjustReplyCount(
  queryClient: QueryClient,
  postId: string,
  parentId: string,
  delta: number,
) {
  editComments(queryClient, postId, undefined, (comments) =>
    comments.map((c) =>
      c.id === parentId ? { ...c, replyCount: Math.max(0, c.replyCount + delta) } : c,
    ),
  );
}

export function useAddComment(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCommentInput) => socialApi.addComment(postId, input),
    onSuccess: (comment) => {
      const parentId = comment.parentId ?? undefined;
      editComments(queryClient, postId, parentId, (comments, page) =>
        page === 0 ? [comment, ...comments] : comments,
      );
      if (parentId) adjustReplyCount(queryClient, postId, parentId, 1);
      adjustCommentCount(queryClient, postId, 1);
    },
  });
}

/** Authors delete their own comments; post owners delete any on their posts. */
export function useDeleteComment(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (comment: Comment) => socialApi.removeComment(comment.id),
    onSuccess: (_result, comment) => {
      const parentId = comment.parentId ?? undefined;
      editComments(queryClient, postId, parentId, (comments) =>
        comments.filter((c) => c.id !== comment.id),
      );
      if (parentId) {
        adjustReplyCount(queryClient, postId, parentId, -1);
        adjustCommentCount(queryClient, postId, -1);
      } else {
        // Deleting a top-level comment removes its replies too.
        queryClient.removeQueries({ queryKey: socialKeys.comments(postId, comment.id) });
        adjustCommentCount(queryClient, postId, -(1 + comment.replyCount));
      }
    },
  });
}
