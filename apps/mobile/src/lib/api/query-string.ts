/** `?a=1&b=x` from the defined values, or '' when there are none. */
export function toQueryString(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

/** Ids and slugs go into paths encoded, so a value can never change the path. */
export const seg = (value: string) => encodeURIComponent(value);
