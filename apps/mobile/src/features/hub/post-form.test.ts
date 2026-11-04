import { PostStatus, PostType } from '@supporters/shared';
import { buildPostInput, EMPTY_POST_FORM } from './post-form';

const MEDIA = '00000000-0000-4000-8000-000000000001';
const PRODUCT = '00000000-0000-4000-8000-000000000002';

describe('buildPostInput', () => {
  it('builds an update', () => {
    const result = buildPostInput(
      { ...EMPTY_POST_FORM, body: ' New stock ', mediaIds: [MEDIA] },
      PostStatus.Published,
    );
    expect(result).toMatchObject({
      ok: true,
      input: { type: 'update', body: 'New stock', status: 'published' },
    });
  });

  it('needs media to publish, but not to save a draft', () => {
    const values = { ...EMPTY_POST_FORM, body: 'Hello' };
    expect(buildPostInput(values, PostStatus.Published)).toMatchObject({ ok: false });
    expect(buildPostInput(values, PostStatus.Draft)).toMatchObject({ ok: true });
  });

  it('needs an offer tag on offers and drops it from other types', () => {
    const offer = { ...EMPTY_POST_FORM, type: PostType.Offer, body: 'Sale', mediaIds: [MEDIA] };
    expect(buildPostInput(offer, PostStatus.Published)).toMatchObject({ ok: false });
    expect(buildPostInput({ ...offer, offerTag: '20% off' }, PostStatus.Published)).toMatchObject({
      ok: true,
      input: { offerTag: '20% off' },
    });
    const update = buildPostInput(
      { ...EMPTY_POST_FORM, offerTag: 'x', mediaIds: [MEDIA] },
      PostStatus.Published,
    );
    expect(update.ok && update.input.offerTag).toBeFalsy();
  });

  it('attaches only the listing that matches the post type', () => {
    const product = buildPostInput(
      {
        ...EMPTY_POST_FORM,
        type: PostType.Product,
        productId: PRODUCT,
        serviceId: PRODUCT,
        mediaIds: [MEDIA],
      },
      PostStatus.Published,
    );
    expect(product.ok && product.input.productId).toBe(PRODUCT);
    expect(product.ok && product.input.serviceId).toBeUndefined();
  });

  it('refuses a body over the limit', () => {
    expect(
      buildPostInput(
        { ...EMPTY_POST_FORM, body: 'x'.repeat(2201), mediaIds: [MEDIA] },
        PostStatus.Draft,
      ),
    ).toMatchObject({ ok: false });
  });
});
