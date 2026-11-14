import { NotificationCategory, NotificationType } from '@supporters/shared';

export interface NotificationRule {
  category: NotificationCategory;
  push: boolean;
  email: boolean;
  /** Collapsed per group key for the batch window; one push goes out when the window ends. */
  isBatched: boolean;
  /** Security events: always pushed and emailed, ignore preferences and quiet hours. */
  isUrgent: boolean;
}

const rule = (category: NotificationCategory, rest: Partial<NotificationRule> = {}) => ({
  category,
  push: true,
  email: false,
  isBatched: false,
  isUrgent: false,
  ...rest,
});

/** The event table of the product spec (Notifications), for the events built so far. */
export const NOTIFICATION_RULES: Record<NotificationType, NotificationRule> = {
  [NotificationType.MessageNew]: rule(NotificationCategory.Messages),
  [NotificationType.EnquiryNew]: rule(NotificationCategory.Enquiries, { email: true }),
  [NotificationType.EnquiryReplied]: rule(NotificationCategory.Enquiries),
  [NotificationType.FollowNew]: rule(NotificationCategory.Business, { isBatched: true }),
  [NotificationType.PostLiked]: rule(NotificationCategory.Business, { isBatched: true }),
  [NotificationType.PostCommented]: rule(NotificationCategory.Business, { isBatched: true }),
  [NotificationType.CommentReplied]: rule(NotificationCategory.Business, { isBatched: true }),
  [NotificationType.ReviewNew]: rule(NotificationCategory.Business, { isBatched: true }),
  [NotificationType.RequirementMatched]: rule(NotificationCategory.Enquiries),
  [NotificationType.RequirementQuoted]: rule(NotificationCategory.Enquiries, { email: true }),
  [NotificationType.SecurityLogin]: rule(NotificationCategory.Account, {
    email: true,
    isUrgent: true,
  }),
  [NotificationType.SecurityPasswordChanged]: rule(NotificationCategory.Account, {
    email: true,
    isUrgent: true,
  }),
  [NotificationType.BusinessVerified]: rule(NotificationCategory.Business, { email: true }),
  [NotificationType.BusinessVerificationRejected]: rule(NotificationCategory.Business, {
    email: true,
  }),
  // Moderation notices sit in Account, which cannot be switched off.
  [NotificationType.ContentHidden]: rule(NotificationCategory.Account, { email: true }),
  [NotificationType.AccountWarned]: rule(NotificationCategory.Account, { email: true }),
  [NotificationType.PremiumRenewing]: rule(NotificationCategory.Subscription, { email: true }),
  [NotificationType.PremiumRenewed]: rule(NotificationCategory.Subscription, { email: true }),
  [NotificationType.PremiumPaymentFailed]: rule(NotificationCategory.Subscription, {
    email: true,
  }),
  [NotificationType.PremiumExpired]: rule(NotificationCategory.Subscription, { email: true }),
};
