import { makePost } from './fixtures';
import { formatCount, formatPrice, formatTimeAgo, toPostCardModel } from './mappers';

const NOW = new Date('2026-11-04T12:00:00.000Z');

describe('formatTimeAgo', () => {
  it.each([
    ['2026-11-04T11:59:40.000Z', 'just now'],
    ['2026-11-04T11:55:00.000Z', '5m'],
    ['2026-11-04T09:00:00.000Z', '3h'],
    ['2026-11-02T12:00:00.000Z', '2d'],
  ])('%s -> %s', (iso, expected) => {
    expect(formatTimeAgo(iso, NOW)).toBe(expected);
  });

  it('falls back to a date after a week, and to empty for bad input', () => {
    expect(formatTimeAgo('2026-10-01T12:00:00.000Z', NOW)).toMatch(/1/);
    expect(formatTimeAgo(null, NOW)).toBe('');
    expect(formatTimeAgo('nope', NOW)).toBe('');
  });
});

describe('formatPrice', () => {
  it('formats paise as rupees with Indian grouping', () => {
    expect(formatPrice({ amountPaise: 12_345_000, currency: 'INR' })).toBe('₹1,23,450');
    expect(formatPrice({ amountPaise: 9_950, currency: 'INR' })).toBe('₹99.50');
  });

  it('asks for the price when there is none', () => {
    expect(formatPrice(null)).toBe('Ask for price');
  });
});

describe('formatCount', () => {
  it('pluralises', () => {
    expect(formatCount(1, 'like')).toBe('1 like');
    expect(formatCount(2500, 'like')).toBe('2,500 likes');
  });
});

describe('toPostCardModel', () => {
  it('splits images from video and formats the attachment price', () => {
    const post = makePost(1, {
      media: [
        { id: '00000000-0000-4000-8000-000000000a01', url: 'https://x.test/a.jpg', kind: 'image' },
        { id: '00000000-0000-4000-8000-000000000a02', url: 'https://x.test/b.mp4', kind: 'video' },
      ],
      attachment: {
        type: 'product',
        id: '00000000-0000-4000-8000-000000000b01',
        title: 'Silk saree',
        price: null,
        image: null,
      },
    });
    const model = toPostCardModel(post, NOW);
    expect(model.images).toHaveLength(1);
    expect(model.hasVideo).toBe(true);
    expect(model.attachment).toMatchObject({ title: 'Silk saree', price: 'Ask for price' });
    expect(model.city).toBe('Surat');
  });
});
