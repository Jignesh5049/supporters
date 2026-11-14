import { describe, expect, it } from 'vitest';
import { signWebhookBody, verifyWebhookSignature } from './signature';

const SECRET = 'whsec_unit_test_0123456789abcdef';
const body = Buffer.from('{"event":"subscription.charged","created_at":1700000000}');

describe('webhook signature', () => {
  it('accepts the HMAC-SHA256 of the exact raw bytes', () => {
    expect(verifyWebhookSignature(body, signWebhookBody(body, SECRET), SECRET)).toBe(true);
  });

  it('refuses another secret, a changed byte, and re-serialised JSON', () => {
    const good = signWebhookBody(body, SECRET);
    expect(verifyWebhookSignature(body, good, 'whsec_other_0123456789abcdef')).toBe(false);
    expect(verifyWebhookSignature(Buffer.from(`${body.toString()} `), good, SECRET)).toBe(false);
    const pretty = Buffer.from(JSON.stringify(JSON.parse(body.toString()), null, 2));
    expect(verifyWebhookSignature(pretty, good, SECRET)).toBe(false);
  });

  it('never throws on a missing, short, long or non-hex signature', () => {
    const good = signWebhookBody(body, SECRET);
    for (const bad of [undefined, '', 'zz', good.slice(0, 62), `${good}00`, 'g'.repeat(64)]) {
      expect(verifyWebhookSignature(body, bad, SECRET)).toBe(false);
    }
    expect(verifyWebhookSignature(body, good.toUpperCase(), SECRET)).toBe(true);
  });
});
