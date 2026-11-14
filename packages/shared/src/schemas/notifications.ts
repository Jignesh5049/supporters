import { z } from 'zod';
import { NOTIFICATION_LIMITS } from '../limits';
import { paginationQuerySchema } from './common';

// Notifications (product spec, Notifications; backend spec, Realtime, jobs and notifications).

/** The in-app tab a notification shows under, and the unit users switch push or email off by. */
export const NotificationCategory = {
  Messages: 'messages',
  Enquiries: 'enquiries',
  Business: 'business',
  Referrals: 'referrals',
  Subscription: 'subscription',
  /** Security events: always sent by push and email, and cannot be switched off. */
  Account: 'account',
} as const;
export type NotificationCategory = (typeof NotificationCategory)[keyof typeof NotificationCategory];
export const notificationCategorySchema = z.enum(NotificationCategory);

/** Categories that cannot be switched off. */
export const LOCKED_NOTIFICATION_CATEGORIES: readonly NotificationCategory[] = [
  NotificationCategory.Account,
];

/** Channels besides in-app, which is always on. */
export const NotificationChannel = { Push: 'push', Email: 'email' } as const;
export type NotificationChannel = (typeof NotificationChannel)[keyof typeof NotificationChannel];
export const notificationChannelSchema = z.enum(NotificationChannel);

export const NotificationType = {
  MessageNew: 'message.new',
  EnquiryNew: 'enquiry.new',
  /** The business answered the buyer's enquiry for the first time. */
  EnquiryReplied: 'enquiry.replied',
  FollowNew: 'follow.new',
  PostLiked: 'post.liked',
  PostCommented: 'post.commented',
  CommentReplied: 'comment.replied',
  /** Someone reviewed the recipient's business (batched per business). */
  ReviewNew: 'review.new',
  /** A new buyer requirement matches the recipient's business (top 50 verified only). */
  RequirementMatched: 'requirement.matched',
  /** A business quoted on the recipient's buyer requirement. */
  RequirementQuoted: 'requirement.quoted',
  SecurityLogin: 'security.login',
  SecurityPasswordChanged: 'security.password_changed',
  /** An admin approved the business's verification request. */
  BusinessVerified: 'business.verified',
  /** An admin rejected it; the reason is on `GET /me/business/verification`. */
  BusinessVerificationRejected: 'business.verification_rejected',
  /** A post, comment, message or the business page was hidden by moderation. */
  ContentHidden: 'content.hidden',
  /** An admin warned the account about reported content. */
  AccountWarned: 'account.warned',
  /** Premium renews in 7 days (only while auto-renew is on). */
  PremiumRenewing: 'premium.renewing',
  PremiumRenewed: 'premium.renewed',
  /** A renewal payment failed; Premium continues for the 7-day grace period. */
  PremiumPaymentFailed: 'premium.payment_failed',
  PremiumExpired: 'premium.expired',
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];
export const notificationTypeSchema = z.enum(NotificationType);

/** What a notification opens. `id` is null for `account` (the security settings screen). */
export const NotificationTargetType = {
  Conversation: 'conversation',
  Enquiry: 'enquiry',
  Post: 'post',
  Business: 'business',
  Account: 'account',
  Requirement: 'requirement',
} as const;
export type NotificationTargetType =
  (typeof NotificationTargetType)[keyof typeof NotificationTargetType];

export const notificationSchema = z.object({
  id: z.uuid(),
  type: notificationTypeSchema,
  category: notificationCategorySchema,
  /** The latest person behind it, or null for system events. */
  actor: z.object({ id: z.uuid(), name: z.string() }).nullable(),
  /** People behind a batched item ("Ravi and 12 others"), counting the actor. */
  actorCount: z.number().int().min(1),
  target: z.object({
    type: z.enum(NotificationTargetType),
    id: z.uuid().nullable(),
  }),
  readAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  /** When the item last changed: a batched item moves when someone else joins it. */
  updatedAt: z.iso.datetime(),
});
export type Notification = z.infer<typeof notificationSchema>;

/** Newest first. Today, Yesterday and Earlier are grouped on the client. */
export const notificationsQuerySchema = paginationQuerySchema.extend({
  category: notificationCategorySchema.optional(),
});
export type NotificationsQuery = z.infer<typeof notificationsQuerySchema>;

export const notificationsPageSchema = z.object({
  data: z.array(notificationSchema),
  nextCursor: z.string().nullable(),
  /** Across every category, for the badge. */
  unreadCount: z.number().int().min(0),
});
export type NotificationsPage = z.infer<typeof notificationsPageSchema>;

/** Marks the given ids read, or everything with `{ all: true }`. Unknown ids are ignored. */
export const markNotificationsReadSchema = z.union([
  z.strictObject({
    ids: z.array(z.uuid()).min(1).max(NOTIFICATION_LIMITS.readIdsMax),
  }),
  z.strictObject({ all: z.literal(true) }),
]);
export type MarkNotificationsReadInput = z.infer<typeof markNotificationsReadSchema>;

export const unreadCountSchema = z.object({ unreadCount: z.number().int().min(0) });
export type UnreadCount = z.infer<typeof unreadCountSchema>;

export const notificationPrefSchema = z.object({
  category: notificationCategorySchema,
  channel: notificationChannelSchema,
  enabled: z.boolean(),
  /** True for security events, which are always sent. */
  isLocked: z.boolean(),
});
export type NotificationPref = z.infer<typeof notificationPrefSchema>;

export const notificationPrefsSchema = z.object({ prefs: z.array(notificationPrefSchema) });
export type NotificationPrefs = z.infer<typeof notificationPrefsSchema>;

/** Only the entries given change. Locked categories are rejected. */
export const updateNotificationPrefsSchema = z.strictObject({
  prefs: z
    .array(
      z.strictObject({
        category: notificationCategorySchema.exclude(['Account']),
        channel: notificationChannelSchema,
        enabled: z.boolean(),
      }),
    )
    .min(1)
    .max(Object.keys(NotificationCategory).length * Object.keys(NotificationChannel).length),
});
export type UpdateNotificationPrefsInput = z.infer<typeof updateNotificationPrefsSchema>;

/** Socket.IO event on `/v1/ws`, sent to the recipient's `user:<id>` room. */
export const NotificationSocketEvent = {
  /** `{ notificationId, unreadCount }` when an item is added or a batched one grows. */
  New: 'notification:new',
} as const;

export const notificationNewEventSchema = z.object({
  notificationId: z.uuid(),
  unreadCount: z.number().int().min(0),
});
export type NotificationNewEvent = z.infer<typeof notificationNewEventSchema>;
