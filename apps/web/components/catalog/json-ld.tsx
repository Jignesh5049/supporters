import { serializeJsonLd } from '@/lib/catalog/seo';

/** Structured data for search engines, escaped so owner text can't close the tag. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // Not executable: a data block, serialised with `<`, `>` and `&` escaped.
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
