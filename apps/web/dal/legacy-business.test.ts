import { NextRequest } from 'next/server';
import { describe, expect, it, vi } from 'vitest';
import { legacyBusinessRedirect } from '@/proxy';
import { resolveLegacyBusinessSlug } from './legacy-business';

const ID = '0b6f3f0e-6a55-4c65-9a3f-1f6f3d1d2c7a';
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const page = (slug?: string) => json({ data: slug ? [{ business: { slug } }] : [] });

/** A fake API answering by path. */
function api(routes: Record<string, () => Response>) {
  return vi.fn<typeof fetch>((input) => {
    const path = new URL(String(input)).pathname + new URL(String(input)).search;
    const route = routes[path];
    return Promise.resolve(route ? route() : json({ code: 'NOT_FOUND' }, 404));
  });
}

describe('resolveLegacyBusinessSlug', () => {
  it('reads the slug from a published product', async () => {
    const fetchImpl = api({
      [`/v1/businesses/${ID}/products?limit=1`]: () => page('asha-traders'),
    });
    await expect(resolveLegacyBusinessSlug(ID, fetchImpl)).resolves.toBe('asha-traders');
  });

  it('falls back to services when there are no products', async () => {
    const fetchImpl = api({
      [`/v1/businesses/${ID}/products?limit=1`]: () => page(),
      [`/v1/businesses/${ID}/services?limit=1`]: () => page('asha-traders'),
    });
    await expect(resolveLegacyBusinessSlug(ID, fetchImpl)).resolves.toBe('asha-traders');
  });

  it('leaves a UUID-shaped slug that exists alone', async () => {
    const fetchImpl = api({ [`/v1/businesses/${ID}`]: () => json({ slug: ID }) });
    await expect(resolveLegacyBusinessSlug(ID, fetchImpl)).resolves.toBeNull();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('returns null for non-ids, unknown businesses and an unreachable API', async () => {
    const never = vi.fn<typeof fetch>();
    await expect(resolveLegacyBusinessSlug('b-1', never)).resolves.toBeNull();
    expect(never).not.toHaveBeenCalled();
    await expect(resolveLegacyBusinessSlug(ID, api({}))).resolves.toBeNull();
    const down = vi.fn<typeof fetch>(() => Promise.reject(new TypeError('fetch failed')));
    await expect(resolveLegacyBusinessSlug(ID, down)).resolves.toBeNull();
  });

  it('ignores a malformed slug in the response', async () => {
    const fetchImpl = api({
      [`/v1/businesses/${ID}/products?limit=1`]: () => page('../../evil'),
      [`/v1/businesses/${ID}/services?limit=1`]: () => page(),
    });
    await expect(resolveLegacyBusinessSlug(ID, fetchImpl)).resolves.toBeNull();
  });
});

describe('legacyBusinessRedirect', () => {
  const request = (path: string) => new NextRequest(new URL(path, 'http://localhost:3000'));

  it('redirects an old id URL to the slug URL with a 308, keeping the query', async () => {
    const resolve = vi.fn(() => Promise.resolve('asha-traders'));
    const response = await legacyBusinessRedirect(
      request(`/business/${ID.toUpperCase()}?tab=x`),
      resolve,
    );
    expect(resolve).toHaveBeenCalledWith(ID);
    expect(response?.status).toBe(308);
    expect(response?.headers.get('location')).toBe(
      'http://localhost:3000/business/asha-traders?tab=x',
    );
  });

  it('does nothing for slugs, hub routes or unresolvable ids', async () => {
    const resolve = vi.fn(() => Promise.resolve(null));
    await expect(
      legacyBusinessRedirect(request('/business/asha-traders'), resolve),
    ).resolves.toBeNull();
    await expect(
      legacyBusinessRedirect(request('/business/products'), resolve),
    ).resolves.toBeNull();
    expect(resolve).not.toHaveBeenCalled();
    await expect(legacyBusinessRedirect(request(`/business/${ID}`), resolve)).resolves.toBeNull();
    await expect(
      legacyBusinessRedirect(request(`/business/${ID}/extra`), resolve),
    ).resolves.toBeNull();
  });
});
