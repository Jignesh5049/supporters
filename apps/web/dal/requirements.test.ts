import { describe, expect, it, vi, beforeEach } from 'vitest';
import { listBuyerRequirements, getBuyerRequirement } from './requirements';

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({
  headers: () => Promise.resolve(new Headers()),
  cookies: () => Promise.resolve({ get: () => undefined }),
}));

describe('requirements DAL', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns empty array when listing requirements fails or API is unavailable', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('API offline'));

    const list = await listBuyerRequirements();
    expect(list).toEqual([]);
  });

  it('returns null when single requirement fetch fails', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('API offline'));

    const item = await getBuyerRequirement('req-1');
    expect(item).toBeNull();
  });
});
