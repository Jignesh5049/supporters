/** Security headers that do not depend on the request (web spec, Other headers). */
export const STATIC_SECURITY_HEADERS: readonly { key: string; value: string }[] = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value:
      'camera=(), microphone=(), geolocation=(), payment=(self "https://checkout.razorpay.com")',
  },
  // Razorpay Checkout opens a popup, so `same-origin` would break its window handle.
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
  // Legacy clickjacking defence next to CSP `frame-ancestors 'none'`.
  { key: 'X-Frame-Options', value: 'DENY' },
];

export const HSTS = {
  key: 'Strict-Transport-Security',
  value: 'max-age=63072000; includeSubDomains; preload',
} as const;

export function securityHeaders(isProduction: boolean) {
  // HSTS is meaningless over http and sticky in a browser, so it is production only.
  return isProduction ? [HSTS, ...STATIC_SECURITY_HEADERS] : [...STATIC_SECURITY_HEADERS];
}
