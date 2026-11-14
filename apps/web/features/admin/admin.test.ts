import { NextRequest } from 'next/server';
import { describe, expect, it, vi } from 'vitest';
import { isAdminRoute, isSignedInRoute, withAdminSession } from '@/proxy';
import { ApiError } from '@/lib/api/errors';
import { adminLoginUrlFor } from '@/lib/auth/session-cookies';
import { PopupBlockedError, openInNewTab, queryString } from './admin-api';
import { formatBytes, targetHref, workingDaysSince } from './admin-format';
import { adminLoginError } from './admin-login-form';
import { slugFromName } from './categories-editor';

const NOW = 1_800_000_000;
/** An unsigned JWT-shaped token; the proxy only reads claims (the API verifies). */
const token = (exp: number, claims: object = { role: 'admin', mfa: true }) =>
  [
    'e30',
    Buffer.from(JSON.stringify({ sub: 'a1', exp, ...claims })).toString('base64url'),
    'sig',
  ].join('.');
const request = (path: string, access?: string) =>
  new NextRequest(new URL(path, 'http://localhost:3000'), {
    headers: access ? { cookie: `__Host-at=${access}` } : {},
  });

describe('admin proxy step', () => {
  it('sends visitors without a live admin cookie to the admin sign-in', () => {
    for (const access of [undefined, token(NOW - 1), 'garbage']) {
      const response = withAdminSession(request('/admin/reports?status=open', access), NOW);
      expect(response.status).toBe(307);
      const location = new URL(response.headers.get('location') ?? '');
      expect(location.pathname).toBe('/admin/login');
      expect(location.searchParams.get('next')).toBe('/admin/reports?status=open');
    }
  });

  it('lets a live cookie through, and never caches or indexes any admin page', () => {
    const through = withAdminSession(request('/admin/users', token(NOW + 600)), NOW);
    expect(through.status).toBe(200);
    const login = withAdminSession(request('/admin/login'), NOW);
    expect(login.status).toBe(200);
    for (const response of [through, login]) {
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow');
    }
  });

  it('answers a real 404 to a signed-in user, or an admin token without TOTP', () => {
    for (const claims of [{ role: 'user' }, { role: 'admin' }]) {
      const response = withAdminSession(request('/admin/users', token(NOW + 600, claims)), NOW);
      expect(response.status).toBe(404);
      expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow');
    }
  });

  it('routes /admin separately from the user session check', () => {
    expect(isAdminRoute('/admin')).toBe(true);
    expect(isAdminRoute('/admin/login')).toBe(true);
    expect(isAdminRoute('/administrator')).toBe(false);
    expect(isSignedInRoute('/admin')).toBe(false);
  });

  it('only returns to admin pages after sign-in', () => {
    expect(adminLoginUrlFor('/admin/users')).toBe('/admin/login?next=%2Fadmin%2Fusers');
    expect(adminLoginUrlFor('/messages')).toBe('/admin/login?next=%2Fadmin');
    expect(adminLoginUrlFor('//evil.example')).toBe('/admin/login?next=%2Fadmin');
  });
});

describe('openInNewTab', () => {
  it('opens the tab in the click, cuts the opener, then goes to the link', async () => {
    const tab = { opener: {}, location: { replace: vi.fn() }, close: vi.fn() };
    const open = vi.fn(() => tab as unknown as Window);
    await openInNewTab(async () => 'https://s3.example/kyc/1?X-Amz-Expires=300', open);
    expect(open).toHaveBeenCalledWith('about:blank', '_blank', 'noopener=no');
    expect(tab.opener).toBeNull();
    expect(tab.location.replace).toHaveBeenCalledWith('https://s3.example/kyc/1?X-Amz-Expires=300');
  });

  it('closes the empty tab when the link fails, and opens nothing when pop-ups are blocked', async () => {
    const tab = { opener: {}, location: { replace: vi.fn() }, close: vi.fn() };
    await expect(
      openInNewTab(
        () => Promise.reject(new Error('404')),
        () => tab as unknown as Window,
      ),
    ).rejects.toThrow('404');
    expect(tab.close).toHaveBeenCalled();

    const open = vi.fn<(url: string, target: string, features: string) => Window | null>(
      () => null,
    );
    const getUrl = vi.fn(async () => 'https://s3.example/x');
    await expect(openInNewTab(getUrl, open)).rejects.toBeInstanceOf(PopupBlockedError);
    // No link fetched (so no audit entry), and nothing navigated to the document.
    expect(getUrl).not.toHaveBeenCalled();
    expect(open).toHaveBeenCalledTimes(1);
  });
});

describe('admin helpers', () => {
  it('builds query strings from defined values only', () => {
    expect(queryString({ status: 'open', cursor: undefined, q: '' })).toBe('?status=open');
    expect(queryString({})).toBe('');
  });

  it('links reported items to their public page, when they have one', () => {
    const target = {
      excerpt: 'x',
      isHidden: false,
      isDeleted: false,
      postId: 'p1',
      businessSlug: 'asha',
    };
    expect(targetHref({ targetType: 'comment', target })).toBe('/post/p1');
    expect(targetHref({ targetType: 'business', target })).toBe('/business/asha');
    expect(targetHref({ targetType: 'message', target: { ...target, postId: null } })).toBeNull();
  });

  it('counts working days (Monday to Saturday) and formats sizes', () => {
    // Friday 6 Nov 2026 to Monday 9 Nov: Saturday and Monday count, Sunday doesn't.
    expect(
      workingDaysSince('2026-11-06T10:00:00+05:30', new Date('2026-11-09T11:00:00+05:30')),
    ).toBe(2);
    expect(formatBytes(2_048)).toBe('2 KB');
    expect(formatBytes(3 * 1024 * 1024)).toBe('3.0 MB');
  });

  it('suggests slugs and gives one sign-in error message', () => {
    expect(slugFromName('  Corrugated Boxes & Cartons ')).toBe('corrugated-boxes-cartons');
    const error = new ApiError({ status: 401, code: 'INVALID_CREDENTIALS', title: 'x' });
    expect(adminLoginError(error)).toMatch(/Codes work once/);
  });
});
