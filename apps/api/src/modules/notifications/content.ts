import { NotificationCategory, NotificationType } from '@supporters/shared';

/**
 * Push and email copy. It never names anyone or quotes a message: push
 * payloads leave our infrastructure (Expo, FCM, APNs, browser push services),
 * so they carry generic text and ids only.
 */
interface Copy {
  title: string;
  body: (count: number) => string;
}

const people = (count: number, one: string, many: string) => (count > 1 ? `${count} ${many}` : one);

const COPY: Record<NotificationType, Copy> = {
  [NotificationType.MessageNew]: { title: 'New message', body: () => 'You have a new message' },
  [NotificationType.EnquiryNew]: {
    title: 'New enquiry',
    body: () => 'A buyer sent your business an enquiry',
  },
  [NotificationType.EnquiryReplied]: {
    title: 'Enquiry answered',
    body: () => 'A business replied to your enquiry',
  },
  [NotificationType.FollowNew]: {
    title: 'New followers',
    body: (n) => `${people(n, 'Someone', 'people')} followed your business`,
  },
  [NotificationType.PostLiked]: {
    title: 'New likes',
    body: (n) => `${people(n, 'Someone', 'people')} liked your post`,
  },
  [NotificationType.PostCommented]: {
    title: 'New comments',
    body: (n) => `${people(n, 'Someone', 'people')} commented on your post`,
  },
  [NotificationType.CommentReplied]: {
    title: 'New replies',
    body: (n) => `${people(n, 'Someone', 'people')} replied to your comment`,
  },
  [NotificationType.ReviewNew]: {
    title: 'New reviews',
    body: (n) => `${people(n, 'Someone', 'people')} reviewed your business`,
  },
  [NotificationType.RequirementMatched]: {
    title: 'New buyer requirement',
    body: () => 'A buyer needs something your business offers',
  },
  [NotificationType.RequirementQuoted]: {
    title: 'New quote',
    body: () => 'A business quoted on your requirement',
  },
  [NotificationType.SecurityLogin]: {
    title: 'New sign-in',
    body: () => "Your account was just signed in to. If this wasn't you, reset your password.",
  },
  [NotificationType.SecurityPasswordChanged]: {
    title: 'Password changed',
    body: () => "Your password was changed. If this wasn't you, contact support.",
  },
  [NotificationType.BusinessVerified]: {
    title: 'Business verified',
    body: () => 'Your business now shows the Verified badge',
  },
  [NotificationType.BusinessVerificationRejected]: {
    title: 'Verification not approved',
    body: () => 'Your verification request was not approved. See the reason and try again.',
  },
  [NotificationType.ContentHidden]: {
    title: 'Content hidden',
    body: () => 'Something you posted was hidden for breaking our community guidelines',
  },
  [NotificationType.AccountWarned]: {
    title: 'Account warning',
    body: () => 'Content you posted was reported and reviewed. Please follow our guidelines.',
  },
  [NotificationType.ReferralPending]: {
    title: 'Referral pending',
    body: () =>
      'Your referral bought Premium. Your reward is credited after the 7-day refund window.',
  },
  [NotificationType.ReferralCredited]: {
    title: 'Referral reward credited',
    body: () => 'A referral reward was added to your wallet',
  },
  [NotificationType.ReferralIneligible]: {
    title: 'Referral not eligible',
    body: () => 'One of your referrals did not qualify for a reward. See the reason in Referrals.',
  },
  [NotificationType.WithdrawalApproved]: {
    title: 'Withdrawal approved',
    body: () => 'Your withdrawal was approved and is being paid out',
  },
  [NotificationType.WithdrawalPaid]: {
    title: 'Withdrawal paid',
    body: () => 'Your withdrawal was paid to your account',
  },
  [NotificationType.WithdrawalRejected]: {
    title: 'Withdrawal not approved',
    body: () => 'Your withdrawal was not approved and the amount is back in your wallet',
  },
  [NotificationType.WithdrawalFailed]: {
    title: 'Withdrawal failed',
    body: () => 'The payout could not be completed. The amount is back in your wallet.',
  },
  [NotificationType.SecurityPayoutDetailsChanged]: {
    title: 'Payout details changed',
    body: () =>
      "Your payout details were changed. Withdrawals are paused for 24 hours. If this wasn't you, contact support.",
  },
};

export const pushCopy = (type: NotificationType, actorCount: number) => {
  const copy = COPY[type];
  return { title: copy.title, body: copy.body(actorCount) };
};

/** The Android notification channels the mobile app creates. */
export const androidChannel = (category: NotificationCategory): string => {
  switch (category) {
    case NotificationCategory.Messages:
      return 'messages';
    case NotificationCategory.Enquiries:
      return 'enquiries';
    case NotificationCategory.Account:
      return 'account';
    default:
      return 'activity';
  }
};

/** Plain-text email for the events that send one. */
export function emailCopy(type: NotificationType, appOrigin: string) {
  const { title, body } = pushCopy(type, 1);
  const path: Partial<Record<NotificationType, string>> = {
    [NotificationType.EnquiryNew]: '/business/enquiries',
    [NotificationType.RequirementQuoted]: '/requirements/mine',
    [NotificationType.BusinessVerified]: '/business/verification',
    [NotificationType.BusinessVerificationRejected]: '/business/verification',
    [NotificationType.ReferralCredited]: '/wallet',
    [NotificationType.WithdrawalApproved]: '/wallet',
    [NotificationType.WithdrawalPaid]: '/wallet',
    [NotificationType.WithdrawalRejected]: '/wallet',
    [NotificationType.WithdrawalFailed]: '/wallet',
    [NotificationType.SecurityPayoutDetailsChanged]: '/wallet/withdraw',
  };
  const link = `${appOrigin}${path[type] ?? '/settings'}`;
  return {
    subject: `Supporters: ${title}`,
    text: `${body}\n\nOpen Supporters: ${link}\n\nYou can't reply to this email.`,
  };
}
