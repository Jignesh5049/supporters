import { REPORT_LIMITS, type ReportTargetType } from '@supporters/shared';
import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import { PUBLIC_OWNER } from '../businesses/businesses.service';
import { PUBLIC_POST } from '../posts/posts.service';

type Tx = Prisma.TransactionClient;

/** Serializes new reports and admin actions on one target (advisory lock key). */
export const reportLockKey = (type: ReportTargetType, id: string) => `report:${type}:${id}`;

/**
 * One kind of reportable thing. Modules that add one (reviews, buyer
 * requirements) register it with `ReportTargets.register`; until then reports
 * of that type answer 404.
 */
export interface ReportTarget {
  /**
   * The author or owner, when the reporter can see the target; null otherwise
   * (unknown, deleted, hidden, or private to others), which answers 404.
   */
  load(id: string, reporterId: string): Promise<{ subjectUserId: string } | null>;
  /** Hides it from public reads; true only when this call hid it. */
  hide(tx: Tx, id: string): Promise<boolean>;
  /** Shows it again; true only when this call changed it. */
  unhide(tx: Tx, id: string): Promise<boolean>;
  /** Hidden for review once enough different people report it (product spec, Moderation). */
  isAutoHidden: boolean;
  /** What the admin queue shows for each id that still exists (deleted or hidden included). */
  describe(ids: string[]): Promise<Map<string, TargetPreview>>;
}

/** The admin queue's view of a reported item. */
export interface TargetPreview {
  excerpt: string | null;
  isHidden: boolean;
  isDeleted: boolean;
  postId: string | null;
  businessSlug: string | null;
}

const excerpt = (text: string) => text.slice(0, REPORT_LIMITS.excerpt.max) || null;

const byId = <Row extends { id: string }>(rows: Row[], toPreview: (row: Row) => TargetPreview) =>
  new Map(rows.map((row) => [row.id, toPreview(row)]));

/** Sets or clears `hidden_at` with a guard, so only the call that changes it counts. */
const toggle = (
  update: (args: {
    where: { id: string; hiddenAt: null | { not: null } };
    data: { hiddenAt: Date | null };
  }) => Promise<{ count: number }>,
) => ({
  hide: async (id: string) =>
    (await update({ where: { id, hiddenAt: null }, data: { hiddenAt: new Date() } })).count === 1,
  unhide: async (id: string) =>
    (await update({ where: { id, hiddenAt: { not: null } }, data: { hiddenAt: null } })).count ===
    1,
});

export class ReportTargets {
  private readonly targets = new Map<ReportTargetType, ReportTarget>();

  constructor(prisma: PrismaClient) {
    this.register('post', {
      isAutoHidden: true,
      load: async (id) => {
        const post = await prisma.post.findFirst({
          where: { id, ...PUBLIC_POST },
          select: { business: { select: { ownerUserId: true } } },
        });
        return post ? { subjectUserId: post.business.ownerUserId } : null;
      },
      describe: async (ids) =>
        byId(
          await prisma.post.findMany({
            where: { id: { in: ids } },
            select: {
              id: true,
              body: true,
              hiddenAt: true,
              deletedAt: true,
              business: { select: { slug: true } },
            },
          }),
          (row) => ({
            excerpt: excerpt(row.body),
            isHidden: row.hiddenAt !== null,
            isDeleted: row.deletedAt !== null,
            postId: row.id,
            businessSlug: row.business.slug,
          }),
        ),
      hide: (tx, id) => toggle((args) => tx.post.updateMany(args)).hide(id),
      unhide: (tx, id) => toggle((args) => tx.post.updateMany(args)).unhide(id),
    });

    this.register('comment', {
      isAutoHidden: true,
      load: async (id) => {
        const comment = await prisma.comment.findFirst({
          where: {
            id,
            deletedAt: null,
            hiddenAt: null,
            user: { status: 'active' },
            post: PUBLIC_POST,
          },
          select: { userId: true },
        });
        return comment ? { subjectUserId: comment.userId } : null;
      },
      describe: async (ids) =>
        byId(
          await prisma.comment.findMany({
            where: { id: { in: ids } },
            select: {
              id: true,
              body: true,
              postId: true,
              hiddenAt: true,
              deletedAt: true,
              post: { select: { business: { select: { slug: true } } } },
            },
          }),
          (row) => ({
            excerpt: excerpt(row.body),
            isHidden: row.hiddenAt !== null,
            isDeleted: row.deletedAt !== null,
            postId: row.postId,
            businessSlug: row.post.business.slug,
          }),
        ),
      hide: (tx, id) => toggle((args) => tx.comment.updateMany(args)).hide(id),
      unhide: (tx, id) => toggle((args) => tx.comment.updateMany(args)).unhide(id),
    });

    // Only the two ends of a thread can see, and so report, its messages.
    this.register('message', {
      isAutoHidden: false,
      load: async (id, reporterId) => {
        const message = await prisma.message.findFirst({
          where: {
            id,
            hiddenAt: null,
            hiddenFor: { none: { userId: reporterId } },
            conversation: {
              OR: [{ userId: reporterId }, { business: { ownerUserId: reporterId } }],
            },
          },
          select: { senderUserId: true },
        });
        return message ? { subjectUserId: message.senderUserId } : null;
      },
      // Admins read only the reported message, never the rest of the thread.
      describe: async (ids) =>
        byId(
          await prisma.message.findMany({
            where: { id: { in: ids } },
            select: { id: true, body: true, hiddenAt: true },
          }),
          (row) => ({
            excerpt: excerpt(row.body),
            isHidden: row.hiddenAt !== null,
            isDeleted: false,
            postId: null,
            businessSlug: null,
          }),
        ),
      hide: (tx, id) => toggle((args) => tx.message.updateMany(args)).hide(id),
      unhide: (tx, id) => toggle((args) => tx.message.updateMany(args)).unhide(id),
    });

    // A whole business page is never hidden by report count alone, only by an admin.
    this.register('business', {
      isAutoHidden: false,
      load: async (id) => {
        const business = await prisma.business.findFirst({
          where: { id, ...PUBLIC_OWNER },
          select: { ownerUserId: true },
        });
        return business ? { subjectUserId: business.ownerUserId } : null;
      },
      describe: async (ids) =>
        byId(
          await prisma.business.findMany({
            where: { id: { in: ids } },
            select: { id: true, name: true, slug: true, hiddenAt: true },
          }),
          (row) => ({
            excerpt: row.name,
            isHidden: row.hiddenAt !== null,
            isDeleted: false,
            postId: null,
            businessSlug: row.slug,
          }),
        ),
      hide: (tx, id) => toggle((args) => tx.business.updateMany(args)).hide(id),
      unhide: (tx, id) => toggle((args) => tx.business.updateMany(args)).unhide(id),
    });
  }

  register(type: ReportTargetType, target: ReportTarget) {
    this.targets.set(type, target);
  }

  get(type: ReportTargetType): ReportTarget | undefined {
    return this.targets.get(type);
  }
}
