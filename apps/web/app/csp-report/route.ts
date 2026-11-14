import { NextResponse } from 'next/server';

/** Reports are tiny; anything bigger is not a browser's violation report. */
const MAX_BYTES = 16 * 1024;
const REPORT_TYPES = new Set(['application/csp-report', 'application/reports+json']);

/** The few fields worth keeping from a report. Strings are cut short; nothing else is logged. */
const FIELDS = [
  'document-uri',
  'documentURL',
  'violated-directive',
  'effective-directive',
  'effectiveDirective',
  'blocked-uri',
  'blockedURL',
  'disposition',
  'source-file',
  'sourceFile',
  'line-number',
  'lineNumber',
] as const;

function pick(report: unknown): Record<string, string | number> | null {
  if (typeof report !== 'object' || report === null) return null;
  const record = (report as Record<string, unknown>)['csp-report'] ?? report;
  if (typeof record !== 'object' || record === null) return null;
  const out: Record<string, string | number> = {};
  for (const field of FIELDS) {
    const value = (record as Record<string, unknown>)[field];
    if (typeof value === 'string') out[field] = value.slice(0, 300).split('?')[0] ?? '';
    else if (typeof value === 'number') out[field] = value;
  }
  return Object.keys(out).length > 0 ? out : null;
}

/**
 * Default CSP report sink, used when `CSP_REPORT_URL` (the Sentry security endpoint) is not set.
 * It logs one structured line per report; query strings are dropped because they can carry
 * tokens. Unauthenticated by design (browsers send reports without credentials), so it answers
 * 204 to everything and stores nothing.
 */
export async function POST(request: Request) {
  const type = request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() ?? '';
  const length = Number(request.headers.get('content-length') ?? 0);
  if (REPORT_TYPES.has(type) && length <= MAX_BYTES) {
    try {
      const text = await request.text();
      if (text.length <= MAX_BYTES) {
        const body: unknown = JSON.parse(text);
        for (const item of Array.isArray(body) ? body.slice(0, 20) : [body]) {
          const fields = pick(Array.isArray(body) ? (item as { body?: unknown }).body : item);
          if (fields) console.warn(JSON.stringify({ event: 'csp-violation', ...fields }));
        }
      }
    } catch {
      // Malformed report: ignore.
    }
  }
  return new NextResponse(null, { status: 204 });
}
