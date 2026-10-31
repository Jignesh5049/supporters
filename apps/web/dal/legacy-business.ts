import 'server-only';
import { businessSlugSchema } from '@supporters/shared';
import { z } from 'zod';
import { apiUrl } from './config';

/** Business pages used to live at `/business/<id>`; they are now `/business/<slug>`. */
const uuid = z.uuid();
const listingPageSchema = z.object({
  data: z.array(z.object({ business: z.object({ slug: businessSlugSchema }) })),
});

async function getJson(path: `/v1/${string}`, fetchImpl: typeof fetch): Promise<unknown> {
  const response = await fetchImpl(apiUrl(path), {
    headers: { accept: 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(3_000),
  });
  return response.ok ? response.json() : null;
}

/**
 * The slug for an old id-based URL, or null when there is nothing to redirect
 * to. The API has no lookup by id yet, so the slug is read from the seller card
 * of one of the business's published listings (see the PR's API follow-ups).
 * A UUID-shaped string that is itself a slug is left alone.
 */
export async function resolveLegacyBusinessSlug(
  id: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  if (!uuid.safeParse(id).success) return null;
  try {
    if ((await getJson(`/v1/businesses/${id}`, fetchImpl)) !== null) return null;
    for (const kind of ['products', 'services'] as const) {
      const page = listingPageSchema.safeParse(
        await getJson(`/v1/businesses/${id}/${kind}?limit=1`, fetchImpl),
      );
      const slug = page.success ? page.data.data[0]?.business.slug : undefined;
      if (slug) return slug;
    }
  } catch {
    // The API is unreachable: render the page, which shows its own error.
  }
  return null;
}
