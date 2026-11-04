import { describe, expect, it } from 'vitest';
import { postFixture } from '@/lib/catalog/fixtures';
import {
  EMPTY_POST_FORM,
  type PostFormValues,
  isPostLimitReached,
  isoToLocal,
  localToIso,
  parseAttachment,
  postToFormValues,
  publishedThisWeek,
  toCreateInput,
  toPostLimit,
  toUpdateInput,
} from './post-form-values';

const image = { id: '4b0c4c55-3f6d-4b1f-9a51-2b2c0f3c9a41', url: 'https://m.example/a.webp' };
const valid: PostFormValues = {
  ...EMPTY_POST_FORM,
  body: 'Hello',
  media: [{ ...image, kind: 'image' }],
};

describe('India-time dates', () => {
  it('round-trips a datetime-local value', () => {
    expect(localToIso('2026-11-10T18:00')).toBe('2026-11-10T12:30:00.000Z');
    expect(isoToLocal('2026-11-10T12:30:00.000Z')).toBe('2026-11-10T18:00');
    expect(localToIso('')).toBeNull();
    expect(isoToLocal(null)).toBe('');
  });
});

describe('toCreateInput', () => {
  it('builds the API body for a published update', () => {
    const result = toCreateInput(valid);
    expect(result).toMatchObject({
      ok: true,
      data: { type: 'update', body: 'Hello', mediaIds: [image.id], status: 'published' },
    });
  });

  it('requires media to publish, but not for a draft', () => {
    const published = toCreateInput({ ...valid, media: [] });
    expect(published).toMatchObject({ ok: false });
    expect(!published.ok && published.issues[0]?.path).toBe('mediaIds');
    expect(toCreateInput({ ...valid, media: [], status: 'draft' }).ok).toBe(true);
  });

  it('requires an offer tag on offers and drops offer fields on other types', () => {
    const offer = toCreateInput({ ...valid, type: 'offer' });
    expect(!offer.ok && offer.issues.map((issue) => issue.path)).toContain('offerTag');
    const withTag = toCreateInput({
      ...valid,
      type: 'offer',
      offerTag: '20% off',
      offerEndsAt: '2026-12-01T10:00',
    });
    expect(withTag).toMatchObject({ ok: true, data: { offerTag: '20% off' } });
    const update = toCreateInput({
      ...valid,
      offerTag: 'ignored',
      offerEndsAt: '2026-12-01T10:00',
    });
    expect(update).toMatchObject({ ok: true });
    expect(update.ok && update.data.offerTag).toBeUndefined();
  });

  it('attaches a product but not to the wrong kind of post', () => {
    const id = '4b0c4c55-3f6d-4b1f-9a51-2b2c0f3c9a60';
    expect(toCreateInput({ ...valid, type: 'product', attachment: `product:${id}` })).toMatchObject(
      {
        ok: true,
        data: { productId: id },
      },
    );
    expect(toCreateInput({ ...valid, type: 'product', attachment: `service:${id}` }).ok).toBe(
      false,
    );
  });

  it('refuses images mixed with a video and over-long text', () => {
    const mixed = toCreateInput({
      ...valid,
      media: [
        { ...image, kind: 'image' },
        {
          id: '4b0c4c55-3f6d-4b1f-9a51-2b2c0f3c9a42',
          url: 'https://m.example/v.mp4',
          kind: 'video',
        },
      ],
    });
    expect(mixed.ok).toBe(false);
    expect(toCreateInput({ ...valid, body: 'x'.repeat(2201) }).ok).toBe(false);
  });
});

describe('toUpdateInput', () => {
  it('clears optional fields with null', () => {
    const result = toUpdateInput(valid);
    expect(result).toMatchObject({
      ok: true,
      data: { offerTag: null, offerEndsAt: null, productId: null, serviceId: null },
    });
  });

  it('starts from the stored post', () => {
    const values = postToFormValues(postFixture);
    expect(values).toMatchObject({ type: 'update', body: postFixture.body, status: 'published' });
    expect(toUpdateInput(values).ok).toBe(true);
  });
});

describe('parseAttachment', () => {
  it('splits kind and id', () => {
    expect(parseAttachment('service:abc')).toEqual({ serviceId: 'abc' });
    expect(parseAttachment('')).toEqual({});
  });
});

describe('weekly post limit', () => {
  const now = new Date('2026-11-04T00:00:00.000Z');
  const at = (days: number) => ({
    publishedAt: new Date(now.getTime() - days * 86_400_000).toISOString(),
  });

  it('counts first publishes in the last 7 days only', () => {
    const posts = [at(1), at(6.9), at(7.1), { publishedAt: null }];
    expect(publishedThisWeek(posts, now)).toBe(2);
  });

  it('hits the free limit at 10 and never on Premium', () => {
    const posts = Array.from({ length: 10 }, () => at(1));
    expect(isPostLimitReached(toPostLimit(posts, false, now))).toBe(true);
    expect(isPostLimitReached(toPostLimit(posts.slice(1), false, now))).toBe(false);
    expect(isPostLimitReached(toPostLimit(posts, true, now))).toBe(false);
  });
});
