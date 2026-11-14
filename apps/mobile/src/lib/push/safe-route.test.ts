import { pathSegment, safeInternalPath } from './safe-route';

describe('safeInternalPath', () => {
  it('lets in-app paths through', () => {
    for (const path of [
      '/messages/0194f3a2-7b1c-7d2e-9f10-aabbccddeeff',
      '/requirements/123',
      '/business/asha-traders?tab=about',
      '/hub/enquiries',
      '/notifications',
    ]) {
      expect(safeInternalPath(path)).toBe(path);
    }
  });

  it.each([
    'https://evil.example/phish',
    'http://evil.example',
    '//evil.example/x',
    '\\evil.example',
    'javascript:alert(1)',
    'supporters://wallet/withdraw',
    'tel:+911234567890',
    '/\evil.example',
    '/messages/../../etc/passwd',
    '/messages/%2e%2e/wallet',
    '/messages/a%2fb',
    '/business/x#fragment',
    '/unknown-section/1',
    '/admin/users',
    'messages/1',
    '',
    '/' + 'a'.repeat(400),
  ])('refuses %s', (value) => {
    expect(safeInternalPath(value)).toBeNull();
  });

  it('refuses anything that is not a string', () => {
    for (const value of [undefined, null, 42, {}, ['/messages/1']]) {
      expect(safeInternalPath(value)).toBeNull();
    }
  });
});

describe('pathSegment', () => {
  it('encodes separators so an id cannot add path segments', () => {
    expect(pathSegment('../wallet')).toBe('..%2Fwallet');
    expect(pathSegment('a/b?c')).toBe('a%2Fb%3Fc');
  });
});
