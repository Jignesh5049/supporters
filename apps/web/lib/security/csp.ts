/**
 * Content-Security-Policy builder (web spec, Security). Pure: everything it needs is passed in,
 * so it is unit-tested without Next.js. `readCspConfig` turns the environment into that input.
 *
 * Production has no `'unsafe-eval'`, and `'unsafe-inline'` only for style *attributes* (see below),
 * never for scripts or `<style>` elements. Development needs
 * `'unsafe-eval'` (React's debugging) and `'unsafe-inline'` styles (Turbopack's HMR style tags).
 */

export type CspMode = 'enforce' | 'report-only';

export interface CspConfig {
  /** Fresh per request. */
  nonce: string;
  isDev: boolean;
  mode: CspMode;
  /** The public origin, e.g. `https://supporters.in`; the chat socket is `wss://` on it. */
  appOrigin?: string | undefined;
  /** Where public media is served from (`https://media.<domain>`). */
  mediaOrigin?: string | undefined;
  /** Extra origins presigned uploads PUT to (the bucket's regional S3 endpoint). */
  uploadOrigins: readonly string[];
  /** Absolute or root-relative URL the browser POSTs violation reports to. */
  reportUrl: string;
  /** Razorpay Checkout hosts. Reserved for the payments work; the spec lists them. */
  razorpay: boolean;
}

const RAZORPAY_SCRIPT = ['https://checkout.razorpay.com'];
const RAZORPAY_CONNECT = ['https://api.razorpay.com', 'https://lumberjack.razorpay.com'];
const RAZORPAY_FRAME = ['https://api.razorpay.com', 'https://checkout.razorpay.com'];
const SENTRY_INGEST = ['https://*.ingest.sentry.io'];

export const CSP_REPORT_GROUP = 'csp-endpoint';
export const DEFAULT_CSP_REPORT_PATH = '/csp-report';

export interface CspPolicy {
  /** `Content-Security-Policy` or `Content-Security-Policy-Report-Only`. */
  headerName: 'Content-Security-Policy' | 'Content-Security-Policy-Report-Only';
  value: string;
  /** The `Reporting-Endpoints` header value naming the `report-to` group. */
  reportingEndpoints: string;
}

/** 16 bytes of CSPRNG output as base64: 128 bits, unguessable, fresh per request. */
export function generateNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

const wsOrigin = (origin: string): string => origin.replace(/^http/, 'ws');

export function buildCsp(config: CspConfig): CspPolicy {
  const { nonce, isDev } = config;
  const media = config.mediaOrigin ? [config.mediaOrigin] : [];
  const socket = config.appOrigin ? [wsOrigin(config.appOrigin)] : [];
  // Dev HMR connects a websocket to the dev server's own origin.
  const devSocket = isDev ? ['ws://localhost:*', 'ws://127.0.0.1:*'] : [];

  const directives: [string, string[]][] = [
    ['default-src', ["'self'"]],
    [
      'script-src',
      [
        "'self'",
        `'nonce-${nonce}'`,
        "'strict-dynamic'",
        ...(config.razorpay ? RAZORPAY_SCRIPT : []),
        ...(isDev ? ["'unsafe-eval'"] : []),
      ],
    ],
    ['style-src', ["'self'", isDev ? "'unsafe-inline'" : `'nonce-${nonce}'`]],
    // Attributes only. next/image (`color:transparent`, and the positioning `fill` needs) and Radix
    // write `style="..."` into the server HTML, which a nonce cannot cover. `<style>` elements and
    // stylesheets stay nonce-only, and an attribute cannot run script. Listed as a gap in the PR.
    ['style-src-attr', ["'unsafe-inline'"]],
    // Private attachments (chat) open through /v1/attachments/:id, which redirects to a presigned S3
    // URL, and CSP applies to the redirect target: so the bucket origin is allowed for loads too.
    ['img-src', ["'self'", 'blob:', 'data:', ...media, ...config.uploadOrigins]],
    ['media-src', ["'self'", 'blob:', ...media, ...config.uploadOrigins]],
    [
      'connect-src',
      [
        "'self'",
        ...socket,
        ...devSocket,
        ...media,
        ...config.uploadOrigins,
        ...SENTRY_INGEST,
        ...(config.razorpay ? RAZORPAY_CONNECT : []),
      ],
    ],
    ['frame-src', config.razorpay ? RAZORPAY_FRAME : ["'none'"]],
    ['worker-src', ["'self'"]],
    ['font-src', ["'self'"]],
    ['object-src', ["'none'"]],
    ['base-uri', ["'self'"]],
    ['form-action', ["'self'"]],
    ['frame-ancestors', ["'none'"]],
  ];

  const parts = directives.map(([name, sources]) => `${name} ${[...new Set(sources)].join(' ')}`);
  // Upgrading would turn local http (MinIO) into https and break a local build, so only an https
  // app origin (or an unset one, which only happens in tests) upgrades.
  if (!isDev && config.appOrigin?.startsWith('http:') !== true)
    parts.push('upgrade-insecure-requests');
  // `report-uri` for browsers without the Reporting API (Firefox); `report-to` for the rest.
  parts.push(`report-uri ${config.reportUrl}`, `report-to ${CSP_REPORT_GROUP}`);

  return {
    headerName:
      config.mode === 'report-only'
        ? 'Content-Security-Policy-Report-Only'
        : 'Content-Security-Policy',
    value: parts.join('; '),
    reportingEndpoints: `${CSP_REPORT_GROUP}="${config.reportUrl}"`,
  };
}

function toOrigin(raw: string | undefined, name: string): string | undefined {
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('protocol');
    return url.origin;
  } catch {
    console.error(`[csp] ${name} is not a valid http(s) URL; ignored`);
    return undefined;
  }
}

/**
 * Environment (read per request, so one image works for every stage):
 * - `CSP_MODE`: `enforce` (default, in every environment) or `report-only` for a staged rollout.
 * - `APP_ORIGIN`: the public origin (also used by the DAL).
 * - `MEDIA_PUBLIC_URL`: the media CDN (same variable as the API's).
 * - `CSP_UPLOAD_ORIGINS`: comma-separated S3 endpoints presigned PUTs go to.
 * - `CSP_REPORT_URL`: where reports go (the Sentry security endpoint); defaults to `/csp-report`.
 */
export function readCspConfig(env: Record<string, string | undefined>, nonce: string): CspConfig {
  const uploads = (env.CSP_UPLOAD_ORIGINS ?? '')
    .split(',')
    .map((value) => toOrigin(value.trim() || undefined, 'CSP_UPLOAD_ORIGINS'))
    .filter((value): value is string => Boolean(value));
  return {
    nonce,
    isDev: env.NODE_ENV === 'development',
    // Anything but an explicit `report-only` enforces: a typo must not switch protection off.
    mode: env.CSP_MODE === 'report-only' ? 'report-only' : 'enforce',
    appOrigin: toOrigin(env.APP_ORIGIN, 'APP_ORIGIN'),
    mediaOrigin: toOrigin(env.MEDIA_PUBLIC_URL, 'MEDIA_PUBLIC_URL'),
    uploadOrigins: uploads,
    reportUrl: env.CSP_REPORT_URL?.trim() || DEFAULT_CSP_REPORT_PATH,
    razorpay: true,
  };
}
