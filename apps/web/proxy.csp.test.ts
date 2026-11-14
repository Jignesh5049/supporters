import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { buildCsp } from '@/lib/security/csp';
import { applyCsp, withAdminSession, withSession } from './proxy';

const policy = buildCsp({
  nonce: 'n0nce',
  isDev: false,
  mode: 'enforce',
  uploadOrigins: [],
  reportUrl: '/csp-report',
  razorpay: true,
});

const request = (path: string, headers: Record<string, string> = {}) =>
  new NextRequest(new URL(path, 'http://localhost:3000'), { headers });

const skipped = () => Promise.resolve({ kind: 'skipped' as const });
const render = { 'x-nonce': 'n0nce', [policy.headerName]: policy.value };

describe('CSP wiring in the proxy', () => {
  it('sends the policy to the browser and the nonce to the render', async () => {
    const res = applyCsp(await withSession(request('/discover'), skipped, render), policy);
    expect(res.headers.get('content-security-policy')).toBe(policy.value);
    expect(res.headers.get('reporting-endpoints')).toBe('csp-endpoint="/csp-report"');
    expect(res.headers.get('x-middleware-request-x-nonce')).toBe('n0nce');
    expect(res.headers.get('x-middleware-request-content-security-policy')).toBe(policy.value);
  });

  it('keeps the refreshed cookies in the render request next to the nonce', async () => {
    const refreshed = () =>
      Promise.resolve({
        kind: 'refreshed' as const,
        setCookies: ['__Host-rt=rt-2; Path=/; HttpOnly; Secure'],
        cookies: new Map([['__Host-rt', 'rt-2']]),
      });
    const res = await withSession(
      request('/discover', { cookie: '__Host-rt=rt-1' }),
      refreshed,
      render,
    );
    expect(res.headers.get('x-middleware-request-cookie')).toBe('__Host-rt=rt-2');
    expect(res.headers.get('x-middleware-request-x-nonce')).toBe('n0nce');
    expect(res.headers.getSetCookie()).toHaveLength(1);
  });

  it('puts the CSP on redirects too', async () => {
    const res = applyCsp(await withSession(request('/wallet'), skipped, render), policy);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/login');
    expect(res.headers.get('content-security-policy')).toBe(policy.value);
  });

  it('covers the admin area, which stays no-store', () => {
    const res = applyCsp(withAdminSession(request('/admin/login'), undefined, render), policy);
    expect(res.headers.get('x-middleware-request-x-nonce')).toBe('n0nce');
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(res.headers.get('content-security-policy')).toBe(policy.value);
  });

  it('overwrites a nonce or CSP the client sent itself', async () => {
    const forged = request('/discover', {
      'x-nonce': 'attacker',
      'content-security-policy': "script-src 'unsafe-inline'",
    });
    const res = await withSession(forged, skipped, render);
    expect(res.headers.get('x-middleware-request-x-nonce')).toBe('n0nce');
    expect(res.headers.get('x-middleware-request-content-security-policy')).toBe(policy.value);
  });
});
