import { describe, expect, it } from 'vitest';
import { createEnquirySchema } from './enquiries';
import { messagesQuerySchema, sendMessageSchema, updateConversationSchema } from './chat';

const id = '0199f4a0-0000-7000-8000-000000000001';

describe('sendMessageSchema', () => {
  const ok = (input: object) => sendMessageSchema.safeParse(input).success;

  it('needs a body for text and refuses attachments on it', () => {
    expect(ok({ type: 'text', body: 'hi' })).toBe(true);
    expect(ok({ type: 'text', body: '  ' })).toBe(false);
    expect(ok({ type: 'text', body: 'hi', attachmentIds: [id] })).toBe(false);
    expect(ok({ type: 'text', body: 'x'.repeat(4_001) })).toBe(false);
  });

  it('takes 1 to 5 images and exactly one file', () => {
    const ids = (n: number) =>
      Array.from({ length: n }, (_, i) => `0199f4a0-0000-7000-8000-00000000010${i}`);
    expect(ok({ type: 'image', attachmentIds: ids(5) })).toBe(true);
    expect(ok({ type: 'image', attachmentIds: ids(6) })).toBe(false);
    expect(ok({ type: 'image' })).toBe(false);
    expect(ok({ type: 'image', attachmentIds: [id, id] })).toBe(false);
    expect(ok({ type: 'file', attachmentIds: ids(1) })).toBe(true);
    expect(ok({ type: 'file', attachmentIds: ids(2) })).toBe(false);
  });

  it('needs a listing for cards, and only for cards', () => {
    expect(ok({ type: 'listing_card', listing: { type: 'product', id } })).toBe(true);
    expect(ok({ type: 'listing_card' })).toBe(false);
    expect(ok({ type: 'text', body: 'hi', listing: { type: 'product', id } })).toBe(false);
  });

  it('does not let clients send enquiry messages or unknown fields', () => {
    expect(ok({ type: 'enquiry', body: 'hi' })).toBe(false);
    expect(ok({ type: 'text', body: 'hi', senderSide: 'business' })).toBe(false);
  });
});

describe('createEnquirySchema', () => {
  const message = 'Need 500 units delivered next month.';

  it('names one listing', () => {
    expect(createEnquirySchema.safeParse({ productId: id, message }).success).toBe(true);
    expect(createEnquirySchema.safeParse({ serviceId: id, message }).success).toBe(true);
    expect(createEnquirySchema.safeParse({ message }).success).toBe(false);
    expect(createEnquirySchema.safeParse({ productId: id, serviceId: id, message }).success).toBe(
      false,
    );
  });

  it('keeps the message between 20 and 1,000 characters and defaults sharePhone off', () => {
    expect(createEnquirySchema.safeParse({ productId: id, message: 'short' }).success).toBe(false);
    expect(
      createEnquirySchema.safeParse({ productId: id, message: 'x'.repeat(1_001) }).success,
    ).toBe(false);
    expect(createEnquirySchema.parse({ productId: id, message }).sharePhone).toBe(false);
  });
});

describe('other chat inputs', () => {
  it('refuses cursor and after together', () => {
    expect(messagesQuerySchema.safeParse({ cursor: 'abc', after: id }).success).toBe(false);
    expect(messagesQuerySchema.safeParse({ after: id }).success).toBe(true);
  });

  it('needs muted or hidden to update a conversation', () => {
    expect(updateConversationSchema.safeParse({}).success).toBe(false);
    expect(updateConversationSchema.safeParse({ muted: true }).success).toBe(true);
  });
});
