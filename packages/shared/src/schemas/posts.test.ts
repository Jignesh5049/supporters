import { describe, expect, it } from 'vitest';
import { TEXT_LIMITS } from '../limits';
import { createPostSchema, postShapeIssues, updatePostSchema } from './posts';

const uuid = '0199f4a0-0000-7000-8000-000000000001';
const otherUuid = '0199f4a0-0000-7000-8000-000000000002';

describe('createPostSchema', () => {
  it('defaults to an empty draft', () => {
    expect(createPostSchema.parse({ type: 'update' })).toEqual({
      type: 'update',
      body: '',
      mediaIds: [],
      status: 'draft',
    });
  });

  it('caps the text', () => {
    const body = 'a'.repeat(TEXT_LIMITS.postBody.max + 1);
    expect(createPostSchema.safeParse({ type: 'update', body }).success).toBe(false);
  });

  it('needs an offer tag on offers and refuses it elsewhere', () => {
    expect(createPostSchema.safeParse({ type: 'offer' }).success).toBe(false);
    expect(createPostSchema.safeParse({ type: 'offer', offerTag: '20% off' }).success).toBe(true);
    expect(createPostSchema.safeParse({ type: 'update', offerTag: '20% off' }).success).toBe(false);
  });

  it('attaches at most one listing, of the matching kind', () => {
    const both = { type: 'update', productId: uuid, serviceId: otherUuid };
    expect(createPostSchema.safeParse(both).success).toBe(false);
    expect(createPostSchema.safeParse({ type: 'product', serviceId: uuid }).success).toBe(false);
    expect(createPostSchema.safeParse({ type: 'service', productId: uuid }).success).toBe(false);
    expect(createPostSchema.safeParse({ type: 'testimonial', productId: uuid }).success).toBe(true);
  });

  it('rejects repeated media and unknown keys', () => {
    expect(createPostSchema.safeParse({ type: 'update', mediaIds: [uuid, uuid] }).success).toBe(
      false,
    );
    expect(createPostSchema.safeParse({ type: 'update', likeCount: 5 }).success).toBe(false);
  });
});

describe('updatePostSchema', () => {
  it('cannot change the type', () => {
    expect(updatePostSchema.safeParse({ type: 'offer' }).success).toBe(false);
  });

  it('leaves cross-field checks to the merged post', () => {
    expect(postShapeIssues({ type: 'offer', offerTag: null })).toHaveLength(1);
  });
});
