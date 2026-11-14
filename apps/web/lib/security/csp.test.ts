import { describe, expect, it } from 'vitest';
import { securityHeaders } from './headers';
import { type CspConfig, buildCsp, generateNonce, readCspConfig } from './csp';

const config = (overrides: Partial<CspConfig> = {}): CspConfig => ({
  nonce: 'abc123==',
  isDev: false,
  mode: 'enforce',
  appOrigin: 'https://supporters.in',
  mediaOrigin: 'https://media.supporters.in',
  uploadOrigins: ['https://s3.ap-south-1.amazonaws.com'],
  reportUrl: '/csp-report',
  razorpay: true,
  ...overrides,
});

const directive = (value: string, name: string) =>
  value
    .split('; ')
    .find((part) => part.startsWith(`${name} `))
    ?.slice(name.length + 1)
    .split(' ');

describe('generateNonce', () => {
  it('is 128 bits of base64 and different every time', () => {
    const nonces = new Set(Array.from({ length: 50 }, generateNonce));
    expect(nonces.size).toBe(50);
    for (const nonce of nonces) {
      expect(nonce).toMatch(/^[A-Za-z0-9+/]{22}==$/);
    }
  });
});

describe('buildCsp (production)', () => {
  const { value, headerName } = buildCsp(config());

  it('enforces by default', () => {
    expect(headerName).toBe('Content-Security-Policy');
  });

  it('allows scripts by nonce and strict-dynamic only, with no unsafe-* keywords', () => {
    expect(directive(value, 'script-src')).toEqual([
      "'self'",
      "'nonce-abc123=='",
      "'strict-dynamic'",
      'https://checkout.razorpay.com',
    ]);
    expect(value).not.toContain('unsafe-eval');
    expect(directive(value, 'style-src')).toEqual(["'self'", "'nonce-abc123=='"]);
    // The one relaxation: style attributes. Never scripts, never <style> elements.
    expect(directive(value, 'style-src-attr')).toEqual(["'unsafe-inline'"]);
    expect(value.match(/unsafe-inline/g)).toHaveLength(1);
  });

  it('closes the injection vectors: objects, base, forms, framing', () => {
    expect(directive(value, 'object-src')).toEqual(["'none'"]);
    expect(directive(value, 'base-uri')).toEqual(["'self'"]);
    expect(directive(value, 'form-action')).toEqual(["'self'"]);
    expect(directive(value, 'frame-ancestors')).toEqual(["'none'"]);
    expect(directive(value, 'default-src')).toEqual(["'self'"]);
    expect(value).toContain('upgrade-insecure-requests');
  });

  it('opens only the hosts the app needs', () => {
    expect(directive(value, 'img-src')).toEqual([
      "'self'",
      'blob:',
      'data:',
      'https://media.supporters.in',
      // Private chat attachments redirect to a presigned S3 URL.
      'https://s3.ap-south-1.amazonaws.com',
    ]);
    expect(directive(value, 'connect-src')).toEqual([
      "'self'",
      'wss://supporters.in',
      'https://media.supporters.in',
      'https://s3.ap-south-1.amazonaws.com',
      'https://*.ingest.sentry.io',
      'https://api.razorpay.com',
      'https://lumberjack.razorpay.com',
    ]);
    expect(directive(value, 'frame-src')).toEqual([
      'https://api.razorpay.com',
      'https://checkout.razorpay.com',
    ]);
    expect(directive(value, 'worker-src')).toEqual(["'self'"]);
  });

  it('reports with both report-uri and report-to', () => {
    const policy = buildCsp(
      config({ reportUrl: 'https://o1.ingest.sentry.io/api/2/security/?k=x' }),
    );
    expect(policy.value).toContain('report-uri https://o1.ingest.sentry.io/api/2/security/?k=x');
    expect(policy.value).toContain('report-to csp-endpoint');
    expect(policy.reportingEndpoints).toBe(
      'csp-endpoint="https://o1.ingest.sentry.io/api/2/security/?k=x"',
    );
  });

  it('has no empty or duplicated sources when optional origins are missing', () => {
    const policy = buildCsp(
      config({ appOrigin: undefined, mediaOrigin: undefined, uploadOrigins: [] }),
    );
    expect(policy.value).not.toMatch(/undefined|;;|\s{2}/);
    expect(directive(policy.value, 'img-src')).toEqual(["'self'", 'blob:', 'data:']);
  });

  it('does not upgrade requests for a local http build', () => {
    const policy = buildCsp(config({ appOrigin: 'http://localhost:3000' }));
    expect(policy.value).not.toContain('upgrade-insecure-requests');
  });

  it('uses ws:// for an http app origin', () => {
    const policy = buildCsp(config({ appOrigin: 'http://localhost:3000' }));
    expect(directive(policy.value, 'connect-src')).toContain('ws://localhost:3000');
  });

  it('can leave Razorpay out', () => {
    const policy = buildCsp(config({ razorpay: false }));
    expect(policy.value).not.toContain('razorpay');
    expect(directive(policy.value, 'frame-src')).toEqual(["'none'"]);
  });
});

describe('buildCsp (modes)', () => {
  it('report-only changes the header name, not the policy', () => {
    const enforced = buildCsp(config());
    const reportOnly = buildCsp(config({ mode: 'report-only' }));
    expect(reportOnly.headerName).toBe('Content-Security-Policy-Report-Only');
    expect(reportOnly.value).toBe(enforced.value);
  });

  it('development adds eval, inline styles and the HMR socket, and no upgrade-insecure-requests', () => {
    const { value } = buildCsp(config({ isDev: true }));
    expect(directive(value, 'script-src')).toContain("'unsafe-eval'");
    expect(directive(value, 'style-src')).toContain("'unsafe-inline'");
    expect(directive(value, 'connect-src')).toContain('ws://localhost:*');
    expect(value).not.toContain('upgrade-insecure-requests');
  });
});

describe('readCspConfig', () => {
  it('enforces unless report-only is asked for by name', () => {
    expect(readCspConfig({}, 'n').mode).toBe('enforce');
    expect(readCspConfig({ CSP_MODE: 'report-only' }, 'n').mode).toBe('report-only');
    expect(readCspConfig({ CSP_MODE: 'off' }, 'n').mode).toBe('enforce');
    expect(readCspConfig({ CSP_MODE: 'Report-Only ' }, 'n').mode).toBe('enforce');
  });

  it('is development only when NODE_ENV says so', () => {
    expect(readCspConfig({ NODE_ENV: 'development' }, 'n').isDev).toBe(true);
    expect(readCspConfig({ NODE_ENV: 'production' }, 'n').isDev).toBe(false);
    expect(readCspConfig({}, 'n').isDev).toBe(false);
  });

  it('reduces URLs to origins and drops invalid ones', () => {
    const parsed = readCspConfig(
      {
        APP_ORIGIN: 'https://supporters.in/some/path',
        MEDIA_PUBLIC_URL: 'https://media.supporters.in/supporters-media',
        CSP_UPLOAD_ORIGINS: 'https://a.example.com/x, javascript:alert(1) ,not a url, ',
      },
      'n',
    );
    expect(parsed.appOrigin).toBe('https://supporters.in');
    expect(parsed.mediaOrigin).toBe('https://media.supporters.in');
    expect(parsed.uploadOrigins).toEqual(['https://a.example.com']);
  });

  it('cannot be tricked into injecting a directive through an origin variable', () => {
    const parsed = readCspConfig(
      { MEDIA_PUBLIC_URL: "https://x.example.com; script-src 'unsafe-inline'" },
      'n',
    );
    expect(buildCsp(parsed).value.match(/unsafe-inline/g)).toHaveLength(1); // style-src-attr only
  });

  it('defaults the report URL to the built-in sink', () => {
    expect(readCspConfig({}, 'n').reportUrl).toBe('/csp-report');
    expect(readCspConfig({ CSP_REPORT_URL: 'https://x.test/r' }, 'n').reportUrl).toBe(
      'https://x.test/r',
    );
  });
});

describe('securityHeaders', () => {
  const headers = (production: boolean) =>
    Object.fromEntries(securityHeaders(production).map(({ key, value }) => [key, value]));

  it('carries the spec table in production', () => {
    expect(headers(true)).toMatchObject({
      'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy':
        'camera=(), microphone=(), geolocation=(), payment=(self "https://checkout.razorpay.com")',
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      'X-Frame-Options': 'DENY',
    });
  });

  it('leaves HSTS out of development', () => {
    expect(headers(false)).not.toHaveProperty('Strict-Transport-Security');
  });
});
