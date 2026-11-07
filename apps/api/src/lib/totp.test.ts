import { describe, expect, it } from 'vitest';
import { base32Decode, base32Encode, matchTotp, totpAt, totpUri } from './totp';

// RFC 6238 appendix B (SHA-1), last 6 digits of each 8-digit value.
const RFC_SECRET = Buffer.from('12345678901234567890', 'ascii');
const VECTORS: [number, string][] = [
  [59, '287082'],
  [1_111_111_109, '081804'],
  [1_111_111_111, '050471'],
  [1_234_567_890, '005924'],
  [2_000_000_000, '279037'],
];

describe('totp', () => {
  it('matches the RFC 6238 test vectors', () => {
    for (const [seconds, code] of VECTORS) {
      expect(totpAt(RFC_SECRET, Math.floor(seconds / 30))).toBe(code);
    }
  });

  it('accepts one step of drift either way and nothing further', () => {
    const now = 1_234_567_890_000;
    const step = Math.floor(now / 30_000);
    expect(matchTotp(RFC_SECRET, totpAt(RFC_SECRET, step), now)).toBe(step);
    expect(matchTotp(RFC_SECRET, totpAt(RFC_SECRET, step - 1), now)).toBe(step - 1);
    expect(matchTotp(RFC_SECRET, totpAt(RFC_SECRET, step + 1), now)).toBe(step + 1);
    expect(matchTotp(RFC_SECRET, totpAt(RFC_SECRET, step - 2), now)).toBeNull();
    expect(matchTotp(RFC_SECRET, 'abcdef', now)).toBeNull();
    expect(matchTotp(RFC_SECRET, '1234567', now)).toBeNull();
  });

  it('round-trips base32 and builds an otpauth URI', () => {
    expect(base32Encode(RFC_SECRET)).toBe('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
    expect(base32Decode('gezd gnbv gy3t qojq gezd gnbv gy3t qojq')).toEqual(RFC_SECRET);
    const uri = new URL(totpUri(RFC_SECRET, '+919800000001'));
    expect(uri.protocol).toBe('otpauth:');
    expect(uri.searchParams.get('secret')).toBe('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
    expect(uri.searchParams.get('issuer')).toBe('Supporters Admin');
  });
});
