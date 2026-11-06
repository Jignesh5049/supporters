import { describe, expect, it } from 'vitest';
import type { PendingMessage } from '@/lib/socket/chat-socket';
import {
  BUYER_ID,
  OWNER_ID,
  chatMessage,
  clientIdOf,
  conversation,
  messageId,
} from './chat-fixtures';
import {
  formatInboxTime,
  messagePreview,
  peerOf,
  peerUserIdOf,
  quantityText,
  settledClientIds,
  threadView,
  toMessageView,
} from './chat-mappers';

const pending = (overrides: Partial<PendingMessage> = {}): PendingMessage => ({
  clientId: clientIdOf(99),
  conversationId: conversation().id,
  input: { type: 'text', body: 'On its way', attachmentIds: [] },
  status: 'sending',
  createdAt: '2026-11-04T11:00:00.000Z',
  ...overrides,
});

describe('peer', () => {
  it('shows the business to the buyer, with its page', () => {
    expect(peerOf(conversation())).toMatchObject({
      kind: 'business',
      name: 'Surat Silks',
      href: '/business/surat-silks',
      subtitle: 'Surat',
      isVerified: true,
    });
  });

  it('shows the buyer to the owner, with no public page', () => {
    expect(peerOf(conversation({ side: 'business' }))).toMatchObject({
      kind: 'user',
      userId: BUYER_ID,
      name: 'Asha Buyer',
      href: null,
    });
  });

  it('finds the account to block: the buyer, or the owner from their messages', () => {
    expect(peerUserIdOf(conversation({ side: 'business' }), [])).toBe(BUYER_ID);
    expect(peerUserIdOf(conversation(), [chatMessage(1)])).toBeNull();
    expect(
      peerUserIdOf(conversation(), [chatMessage(1), chatMessage(2, { senderSide: 'business' })]),
    ).toBe(OWNER_ID);
  });
});

describe('previews and times', () => {
  it('previews each message type, with "You:" for mine', () => {
    expect(messagePreview(null, 'user')).toBe('No messages yet');
    expect(messagePreview(chatMessage(1), 'user')).toBe('You: Message 1');
    expect(messagePreview(chatMessage(1), 'business')).toBe('Message 1');
    const file = {
      id: messageId(5),
      contentType: 'application/pdf',
      size: 10,
      url: '/v1/attachments/x',
    };
    expect(
      messagePreview(chatMessage(2, { type: 'file', body: '', attachments: [file] }), 'business'),
    ).toBe('PDF document');
    expect(
      messagePreview(
        chatMessage(3, { type: 'image', body: '', attachments: [file, file] }),
        'business',
      ),
    ).toBe('2 photos');
    expect(
      messagePreview(chatMessage(4, { type: 'enquiry', body: 'Need 50 sarees' }), 'business'),
    ).toBe('Enquiry: Need 50 sarees');
  });

  it('formats inbox times in India time', () => {
    const now = new Date('2026-11-04T12:00:00.000Z'); // 17:30 IST
    expect(formatInboxTime('2026-11-04T04:35:00.000Z', now)).toBe('10:05 am');
    expect(formatInboxTime('2026-11-03T12:00:00.000Z', now)).toBe('Yesterday');
    expect(formatInboxTime('2026-10-28T12:00:00.000Z', now)).toBe('28 Oct');
    // 23:30 UTC on 3 Nov is already 4 Nov in India.
    expect(formatInboxTime('2026-11-03T23:30:00.000Z', now)).toBe('5:00 am');
  });

  it('writes quantities with their unit', () => {
    expect(quantityText(50, 'piece')).toBe('50 piece');
    expect(quantityText(3, null)).toBe('3');
    expect(quantityText(null, 'kg')).toBeNull();
  });
});

describe('message views', () => {
  it('opens files only through the API attachment route, never a raw storage URL', () => {
    const view = toMessageView(
      chatMessage(1, {
        type: 'image',
        attachments: [
          {
            id: messageId(7),
            contentType: 'image/jpeg',
            size: 2048,
            url: 'https://bucket.example/private/key.jpg',
          },
          { id: messageId(8), contentType: 'application/pdf', size: 3 * 1024 * 1024, url: '' },
        ],
      }),
      'user',
      false,
    );
    expect(view.attachments).toEqual([
      { id: messageId(7), href: `/v1/attachments/${messageId(7)}`, isImage: true, label: 'Photo' },
      {
        id: messageId(8),
        href: `/v1/attachments/${messageId(8)}`,
        isImage: false,
        label: 'PDF document · 3.0 MB',
      },
    ]);
  });

  it('links listing cards to the public page and prices them', () => {
    const view = toMessageView(
      chatMessage(1, {
        type: 'listing_card',
        listing: {
          type: 'service',
          id: messageId(9),
          title: 'Saree embroidery',
          price: null,
          image: null,
        },
      }),
      'business',
      false,
    );
    expect(view.listing).toEqual({
      title: 'Saree embroidery',
      href: `/service/${messageId(9)}`,
      priceText: 'Ask for price',
      imageUrl: null,
    });
    expect(view.isMine).toBe(false);
    expect(view.delivery).toBeNull();
  });

  it('orders a thread oldest first, ticks mine up to the peer’s read pointer', () => {
    const messages = [chatMessage(3), chatMessage(2, { senderSide: 'business' }), chatMessage(1)];
    const views = threadView(conversation({ peerLastReadMessageId: messageId(2) }), messages, []);
    expect(views.map((v) => [v.id, v.delivery])).toEqual([
      [messageId(1), 'read'],
      [messageId(2), null],
      [messageId(3), 'sent'],
    ]);
  });

  it('shows a pending send once, and hides it when its stored copy arrives', () => {
    const base = conversation();
    const stored = [chatMessage(1)];
    const waiting = pending();
    expect(threadView(base, stored, [waiting]).map((v) => v.key)).toEqual([
      messageId(1),
      waiting.clientId,
    ]);
    expect(threadView(base, stored, [waiting])[1]).toMatchObject({ delivery: 'sending' });
    expect(threadView(base, stored, [pending({ conversationId: messageId(50) })])).toHaveLength(1);

    const echoed = [chatMessage(2, { clientId: waiting.clientId }), ...stored];
    expect(threadView(base, echoed, [{ ...waiting, status: 'sent' }])).toHaveLength(2);
    expect(settledClientIds(echoed, [waiting])).toEqual([waiting.clientId]);
  });

  it('explains a refused send', () => {
    const views = threadView(
      conversation(),
      [],
      [
        pending({ status: 'failed', error: { code: 'BLOCKED', message: 'Blocked' } }),
        pending({
          clientId: clientIdOf(98),
          status: 'failed',
          error: { code: 'RATE_LIMITED', message: 'Slow', retryAfter: 4 },
        }),
      ],
    );
    expect(views.map((v) => [v.delivery, v.error])).toEqual([
      ['failed', 'You can’t message this conversation.'],
      ['failed', 'Sending too fast. Try again in 4 s.'],
    ]);
  });
});
