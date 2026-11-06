import { describe, expect, it, vi, beforeEach } from 'vitest';
import { searchAll } from './search';

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({
  headers: () => Promise.resolve(new Headers()),
  cookies: () => Promise.resolve({ get: () => undefined }),
}));

describe('searchAll DAL', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns empty structure when API request fails or is unavailable', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const result = await searchAll({ q: 'fabrics', type: 'all' });
    expect(result).toEqual({
      query: 'fabrics',
      counts: { all: 0, businesses: 0, products: 0, services: 0, requirements: 0 },
      businesses: [],
      products: [],
      services: [],
      requirements: [],
    });
  });

  it('safely parses empty query parameters', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        query: '',
        counts: { all: 0, businesses: 0, products: 0, services: 0, requirements: 0 },
        businesses: [],
        products: [],
        services: [],
        requirements: [],
      }),
    });

    const result = await searchAll({ type: 'all' });
    expect(result.counts.all).toBe(0);
  });
});
