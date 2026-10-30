import { beforeEach, describe, expect, it } from 'vitest';
import { resetState, valkey } from '../test/helpers';
import { SlidingWindowLimiter } from './sliding-window';

const limiter = new SlidingWindowLimiter(valkey, 'test:');

beforeEach(resetState);

describe('SlidingWindowLimiter', () => {
  it('allows max hits per window, then denies with a wait time', async () => {
    for (let i = 0; i < 3; i += 1) {
      expect((await limiter.hit('a', 3, 60)).allowed).toBe(true);
    }
    const denied = await limiter.hit('a', 3, 60);
    expect(denied.allowed).toBe(false);
    expect(denied.resetMs).toBeGreaterThan(0);
    expect(denied.resetMs).toBeLessThanOrEqual(120_000);
  });

  it('does not count denied hits or peeks', async () => {
    await limiter.hit('b', 1, 60);
    await limiter.hit('b', 1, 60);
    expect((await limiter.peek('b', 2, 60)).allowed).toBe(true);
    expect((await limiter.peek('b', 2, 60)).allowed).toBe(true);
    expect((await limiter.peek('b', 1, 60)).allowed).toBe(false);
  });

  it('keeps keys apart', async () => {
    await limiter.hit('c', 1, 60);
    expect((await limiter.hit('d', 1, 60)).allowed).toBe(true);
  });
});
