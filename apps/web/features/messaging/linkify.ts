/**
 * Splits user text into plain parts and `https:` links (web spec, Security:
 * user text is plain text plus auto-linked URLs, and only `https:` is linked).
 * Rendered as React text, never as HTML.
 */
export type TextPart =
  { kind: 'text'; text: string } | { kind: 'link'; text: string; href: string };

const URL_PATTERN = /https:\/\/[^\s<>"'`]+/g;
/** Punctuation that usually ends a sentence rather than the URL. */
const TRAILING = /[.,;:!?)\]}]+$/;

export const UGC_LINK_REL = 'noopener noreferrer nofollow ugc';

export function linkify(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;
  for (const match of text.matchAll(URL_PATTERN)) {
    const start = match.index;
    const raw = match[0];
    const trimmed = raw.replace(TRAILING, '');
    let href: string | null = null;
    try {
      const url = new URL(trimmed);
      if (url.protocol === 'https:' && url.hostname.includes('.')) href = url.href;
    } catch {
      href = null;
    }
    if (!href) continue;
    if (start > last) parts.push({ kind: 'text', text: text.slice(last, start) });
    parts.push({ kind: 'link', text: trimmed, href });
    last = start + trimmed.length;
  }
  if (last < text.length) parts.push({ kind: 'text', text: text.slice(last) });
  return parts;
}
