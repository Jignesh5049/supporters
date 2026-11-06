import { describe, expect, it } from 'vitest';
import { urlBase64ToUint8Array } from './use-web-push';

describe('use-web-push utils', () => {
  it('converts base64 url-safe string to Uint8Array', () => {
    // Standard test base64 string
    const testKey = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
    const uint8 = urlBase64ToUint8Array(testKey);

    expect(uint8).toBeInstanceOf(Uint8Array);
    expect(uint8.length).toBeGreaterThan(0);
  });
});
