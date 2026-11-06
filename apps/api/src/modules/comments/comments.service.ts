import {
  type Comment,
  type CommentsQuery,
  type CreateCommentInput,
  type Page,
  RATE_LIMITS,
} from '@supporters/shared';
import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import { AppError, ErrorCode, invalidField, notFound, rateLimited } from '../../lib/errors';
import { pageArgs, splitPage } from '../../lib/pagination';
import { recordEvent } from '../notifications/outbox';
import type { SlidingWindowLimiter } from '../../lib/sliding-window';
import { PUBLIC_POST, type PostsService } from '../posts/posts.service';

const commentInclude = {
  user: { select: { id: true, name: true } },
  post: { select: { business: { select: { ownerUserId: true } } } },
} satisfies Prisma.CommentInclude;
type CommentRow = Prisma.CommentGetPayload<{ include: typeof commentInclude }>;

const forbidden = () =>
  new AppError(403, ErrorCode.Forbidden, 'Only the author or the post owner can delete this');

function toComment(row: CommentRow): Comment {
  return {
    id: row.id,
    postId: row.postId,
    parentId: row.parentId,
    body: row.body,
    author: row.user,
    isByBusiness: row.userId === row.post.business.ownerUserId,
    replyCount: row.replyCount,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Text comments with one level of replies (product spec, Feed and social). */
export class CommentsService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly posts: PostsService,
    private readonly limiter: SlidingWindowLimiter,
  ) {}

  /** Top-level comments of a public post, or the replies of one of them; newest first. */
  async list(postId: string, query: CommentsQuery): Promise<Page<Comment>> {
    await this.posts.requirePublicId(postId);
    const page = pageArgs(query.cursor, query.limit);
    const rows = await this.prisma.comment.findMany({
      ...page,
      where: {
        ...page.where,
        postId,
        parentId: query.parentId ?? null,
        deletedAt: null,
        user: { status: 'active' },
      },
      include: commentInclude,
    });
    const split = splitPage(rows, query.limit);
    return { data: split.rows.map(toComment), nextCursor: split.nextCursor };
  }

  /**
   * Adds a comment or a reply. A reply's parent must be a live top-level
   * comment of the same post, so a reply to a reply is rejected. The post's
   * comment count (and the parent's reply count) move in the same transaction.
   */
  async create(userId: string, postId: string, input: CreateCommentInput): Promise<Comment> {
    await this.posts.requirePublicId(postId);
    const limit = await this.limiter.hit(`comments:${userId}`, RATE_LIMITS.commentsPerHour, 3_600);
    if (!limit.allowed) throw rateLimited(limit.resetMs / 1000);

    if (input.parentId) {
      const parent = await this.prisma.comment.findFirst({
        where: { id: input.parentId, postId, deletedAt: null },
        select: { parentId: true },
      });
      if (!parent) throw invalidField('body.parentId', 'Unknown comment');
      if (parent.parentId !== null) {
        throw invalidField('body.parentId', 'Replies cannot have replies');
      }
    }

    const row = await this.prisma.$transaction(async (tx) => {
      if (input.parentId) {
        // Locks the parent, and fails if it was deleted since the check above.
        const { count } = await tx.comment.updateMany({
          where: { id: input.parentId, deletedAt: null },
          data: { replyCount: { increment: 1 } },
        });
        if (count === 0) throw invalidField('body.parentId', 'Unknown comment');
      }
      const comment = await tx.comment.create({
        data: { postId, userId, parentId: input.parentId ?? null, body: input.body },
        include: commentInclude,
      });
      await this.posts.adjustCounter(tx, postId, 'commentCount', 1);
      await recordEvent(tx, 'comment.created', { commentId: comment.id });
      return comment;
    });
    return toComment(row);
  }

  /**
   * Soft delete by the author, or by the owner of the post's business.
   * Deleting a top-level comment deletes its replies too. Counters only move
   * by rows this call actually deleted, so concurrent deletes can't double-count.
   */
  async remove(userId: string, id: string): Promise<void> {
    const comment = await this.prisma.comment.findFirst({
      where: { id, deletedAt: null, post: PUBLIC_POST },
      include: commentInclude,
    });
    if (!comment) throw notFound();
    const isAuthor = comment.userId === userId;
    const isPostOwner = comment.post.business.ownerUserId === userId;
    if (!isAuthor && !isPostOwner) throw forbidden();

    await this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const { count } = await tx.comment.updateMany({
        where: { id, deletedAt: null },
        data: { deletedAt: now },
      });
      if (count === 0) return;
      let removed = 1;
      if (comment.parentId === null) {
        const replies = await tx.comment.updateMany({
          where: { parentId: id, deletedAt: null },
          data: { deletedAt: now },
        });
        removed += replies.count;
      } else {
        await tx.comment.update({
          where: { id: comment.parentId },
          data: { replyCount: { decrement: 1 } },
        });
      }
      await this.posts.adjustCounter(tx, comment.postId, 'commentCount', -removed);
    });
  }
}
