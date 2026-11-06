import type { Conversation, Enquiry, Message } from '@supporters/shared';

/** Test fixtures for chat (not used by app code). */

export const BUYER_ID = '0a000000-0000-4000-8000-000000000001';
export const OWNER_ID = '0a000000-0000-4000-8000-000000000002';
export const BUSINESS_ID = '0b000000-0000-4000-8000-000000000001';
export const CONVERSATION_ID = '0c000000-0000-4000-8000-000000000001';

const uuid = (prefix: string, n: number) =>
  `${prefix}000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

export const messageId = (n: number) => uuid('0d', n);
export const clientIdOf = (n: number) => uuid('0e', n);

/** Message `n`, sent `n` minutes after 10:00 UTC on 4 Nov 2026. */
export function chatMessage(n: number, overrides: Partial<Message> = {}): Message {
  const isBuyer = overrides.senderSide !== 'business';
  return {
    id: messageId(n),
    conversationId: CONVERSATION_ID,
    senderSide: 'user',
    senderId: isBuyer ? BUYER_ID : OWNER_ID,
    clientId: clientIdOf(n),
    type: 'text',
    body: `Message ${n}`,
    attachments: [],
    listing: null,
    enquiry: null,
    createdAt: new Date(Date.UTC(2026, 10, 4, 10, n)).toISOString(),
    ...overrides,
  };
}

export function conversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: CONVERSATION_ID,
    user: { id: BUYER_ID, name: 'Asha Buyer' },
    business: {
      id: BUSINESS_ID,
      slug: 'surat-silks',
      name: 'Surat Silks',
      logo: null,
      city: { id: '0f000000-0000-4000-8000-000000000001', name: 'Surat', stateCode: 'GJ' },
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
    lastMessageAt: '2026-11-04T09:00:00.000Z',
    createdAt: '2026-11-04T09:00:00.000Z',
    ...overrides,
  };
}

export function enquiry(overrides: Partial<Enquiry> = {}): Enquiry {
  const base = conversation();
  return {
    id: '0a100000-0000-4000-8000-000000000001',
    status: 'new',
    conversationId: CONVERSATION_ID,
    messageId: messageId(1),
    buyer: base.user,
    business: base.business,
    listing: {
      type: 'product',
      id: '0a200000-0000-4000-8000-000000000001',
      title: 'Banarasi silk saree',
      price: { amountPaise: 250_000, currency: 'INR' },
      image: null,
    },
    quantity: 50,
    unit: 'piece',
    deliveryCity: null,
    message: 'Please share your best wholesale rate for 50 pieces.',
    sharePhone: false,
    buyerPhone: null,
    firstResponseAt: null,
    closedAt: null,
    createdAt: '2026-11-04T10:00:00.000Z',
    ...overrides,
  };
}
