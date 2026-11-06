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
  const link =
    type === NotificationType.EnquiryNew
      ? `${appOrigin}/business/enquiries`
      : type === NotificationType.RequirementQuoted
        ? `${appOrigin}/requirements/mine`
        : `${appOrigin}/settings`;
  return {
    subject: `Supporters: ${title}`,
    text: `${body}\n\nOpen Supporters: ${link}\n\nYou can't reply to this email.`,
  };
}
