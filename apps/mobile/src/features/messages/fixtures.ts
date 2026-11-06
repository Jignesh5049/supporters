import type { Conversation, Enquiry, Message } from '@supporters/shared';
import { uuid } from '../social/fixtures';

/** Test data for chat and enquiries. Never imported by app code. */
export const VIEWER = uuid(1);
export const OWNER = uuid(2);
export const CONVERSATION = uuid(100);
export const BUSINESS = uuid(200);

const at = (minute: number) => `2026-11-04T10:${String(minute).padStart(2, '0')}:00.000Z`;

export function makeMessage(n: number, overrides: Partial<Message> = {}): Message {
  return {
    id: uuid(1000 + n),
    conversationId: CONVERSATION,
    senderSide: 'business',
    senderId: OWNER,
    clientId: uuid(5000 + n),
    type: 'text',
    body: `message ${n}`,
    attachments: [],
    listing: null,
    enquiry: null,
    createdAt: at(n),
    ...overrides,
  };
}

export function makeConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: CONVERSATION,
    user: { id: VIEWER, name: 'Asha' },
    business: {
      id: BUSINESS,
      slug: 'shree-steel',
      name: 'Shree Steel',
      logo: null,
      city: { id: uuid(300), name: 'Ahmedabad', stateCode: 'GJ' },
      isVerified: true,
      isPremium: false,
    },
    side: 'user',
    lastMessage: null,
    unreadCount: 0,
    muted: false,
    hidden: false,
    lastReadMessageId: null,
    peerLastReadMessageId: null,
    lastMessageAt: at(0),
    createdAt: at(0),
    ...overrides,
  };
}

export function makeEnquiry(n: number, overrides: Partial<Enquiry> = {}): Enquiry {
  const conversation = makeConversation();
  return {
    id: uuid(7000 + n),
    status: 'new',
    conversationId: CONVERSATION,
    messageId: uuid(1000 + n),
    buyer: conversation.user,
    business: conversation.business,
    listing: {
      type: 'product',
      id: uuid(400),
      title: 'SS304 ball valve',
      price: null,
      image: null,
    },
    quantity: 250,
    unit: 'piece',
    deliveryCity: null,
    message: 'Please share a quote for 250 pieces with delivery to Pune.',
    sharePhone: false,
    buyerPhone: null,
    firstResponseAt: null,
    closedAt: null,
    createdAt: at(n),
    ...overrides,
  };
}

export const page = <T>(data: T[], nextCursor: string | null = null) => ({ data, nextCursor });
