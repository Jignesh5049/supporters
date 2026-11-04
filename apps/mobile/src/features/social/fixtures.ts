import type { Business, Post } from '@supporters/shared';

export const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

export function makePost(n: number, overrides: Partial<Post> = {}): Post {
  return {
    id: uuid(n),
    business: {
      id: uuid(900),
      slug: 'asha-traders',
      name: 'Asha Traders',
      logo: null,
      city: { id: uuid(901), name: 'Surat', stateCode: 'GJ' },
      isVerified: true,
      isPremium: false,
    },
    type: 'update',
    body: `Post ${n}`,
    offerTag: null,
    offerEndsAt: null,
    attachment: null,
    media: [],
    status: 'published',
    likeCount: 3,
    commentCount: 0,
    saveCount: 1,
    isLiked: false,
    isSaved: false,
    publishedAt: '2026-11-01T10:00:00.000Z',
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-01T10:00:00.000Z',
    ...overrides,
  };
}

export const makeBusiness = (overrides: Partial<Business> = {}) =>
  ({ id: uuid(900), slug: 'asha-traders', followerCount: 10, ...overrides }) as Business;
