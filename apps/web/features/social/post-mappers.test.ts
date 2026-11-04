import { describe, expect, it } from 'vitest';
import { postFixture, summaryFixture } from '@/lib/catalog/fixtures';
import { countLabel, postSummary, toPostView, withSignUpPrompts } from './post-mappers';

const NOW = new Date('2026-11-04T00:00:00.000Z');

describe('toPostView', () => {
  it('maps the business, images and links', () => {
    const view = toPostView(postFixture, NOW);
    expect(view.href).toBe(`/post/${postFixture.id}`);
    expect(view.business).toMatchObject({
      name: 'Sharma Textiles',
      href: '/business/sharma-textiles-surat',
      city: 'Surat',
    });
    expect(view.media).toEqual({ kind: 'images', urls: ['https://media.example/p1.webp'] });
    expect(view.publishedLabel).toMatch(/^3 Nov, 4:00\s?pm$/i);
    expect(view.offer).toBeNull();
  });

  it('prefers a video and marks ended offers', () => {
    const view = toPostView(
      {
        ...postFixture,
        type: 'offer',
        offerTag: '20% off',
        offerEndsAt: '2026-11-03T00:00:00.000Z',
        media: [
          { id: postFixture.media[0]!.id, url: 'https://media.example/v.mp4', kind: 'video' },
        ],
      },
      NOW,
    );
    expect(view.media).toEqual({ kind: 'video', url: 'https://media.example/v.mp4' });
    expect(view.offer).toMatchObject({ tag: '20% off', isEnded: true });
  });

  it('builds the attached listing card, with "Ask for price" when there is no price', () => {
    const base = {
      type: 'product' as const,
      id: '4b0c4c55-3f6d-4b1f-9a51-2b2c0f3c9a60',
      title: 'Cotton',
      image: null,
    };
    const priced = toPostView(
      { ...postFixture, attachment: { ...base, price: { amountPaise: 14950, currency: 'INR' } } },
      NOW,
    );
    expect(priced.attachment).toMatchObject({ href: `/product/${base.id}`, priceText: '₹149.50' });
    const unpriced = toPostView({ ...postFixture, attachment: { ...base, price: null } }, NOW);
    expect(unpriced.attachment?.priceText).toBe('Ask for price');
  });
});

describe('labels', () => {
  it('pluralises counts', () => {
    expect(countLabel(1, 'like')).toBe('1 like');
    expect(countLabel(1200, 'like')).toBe('1,200 likes');
    expect(countLabel(0, 'reply', 'replies')).toBe('0 replies');
  });

  it('summarises a post for metadata', () => {
    expect(postSummary(postFixture).title).toBe('Sharma Textiles: New season prints are in.');
    expect(postSummary({ ...postFixture, body: '' }).description).toContain(summaryFixture.name);
  });
});

describe('withSignUpPrompts', () => {
  it('inserts a prompt after every 10th post', () => {
    const rows = withSignUpPrompts(Array.from({ length: 21 }, (_, i) => i));
    expect(rows).toHaveLength(23);
    expect(rows[10]).toEqual({ kind: 'prompt', key: 'prompt-10' });
    expect(rows[21]).toEqual({ kind: 'prompt', key: 'prompt-20' });
    expect(rows.at(-1)).toEqual({ kind: 'item', item: 20 });
  });

  it('adds none to a short list', () => {
    expect(withSignUpPrompts([1, 2, 3]).every((row) => row.kind === 'item')).toBe(true);
  });
});
