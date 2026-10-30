import type { Redis } from 'ioredis';

/**
 * Sliding-window rate limiter on Valkey (backend spec, Limits and quotas).
 *
 * Uses the sliding-window counter: the previous fixed window's count is
 * weighted by how much of it still overlaps the sliding window. Memory is
 * two integers per key, and only allowed requests are counted, so "5 per
 * hour" means five successes. Clock comes from Valkey's TIME so every API
 * instance agrees.
 */
const SCRIPT = `
local windowMs = tonumber(ARGV[1])
local max = tonumber(ARGV[2])
local cost = tonumber(ARGV[3])
local commit = ARGV[4] == '1'
local t = redis.call('TIME')
local now = tonumber(t[1]) * 1000 + math.floor(tonumber(t[2]) / 1000)
local index = math.floor(now / windowMs)
local elapsed = now - index * windowMs
local currentKey = KEYS[1] .. ':' .. index
local previousKey = KEYS[1] .. ':' .. (index - 1)
local current = tonumber(redis.call('GET', currentKey) or '0')
local previous = tonumber(redis.call('GET', previousKey) or '0')
local weighted = previous * (windowMs - elapsed) / windowMs + current
if weighted + cost <= max then
  if commit then
    redis.call('INCRBY', currentKey, cost)
    redis.call('PEXPIRE', currentKey, windowMs * 2)
  end
  return {1, math.ceil(weighted + cost), windowMs - elapsed}
end
local waitMs
if current + cost <= max and previous > 0 then
  waitMs = math.ceil(windowMs - (max - cost - current) * windowMs / previous) - elapsed
else
  local into = 0
  if current > 0 then into = math.ceil(windowMs * (1 - (max - cost) / current)) end
  waitMs = windowMs - elapsed + into
end
if waitMs < 1 then waitMs = 1 end
return {0, math.ceil(weighted + cost), waitMs}
`;

export interface LimitResult {
  allowed: boolean;
  /** Weighted count including this request. */
  count: number;
  /** When denied: milliseconds until one more request fits. Otherwise: until the window rolls. */
  resetMs: number;
}

type LimiterClient = Redis & {
  slidingWindow(
    key: string,
    windowMs: number,
    max: number,
    cost: number,
    commit: 0 | 1,
  ): Promise<number[]>;
};

export class SlidingWindowLimiter {
  private readonly client: LimiterClient;

  constructor(
    client: Redis,
    private readonly prefix = 'rl:',
  ) {
    if (!('slidingWindow' in client)) {
      client.defineCommand('slidingWindow', { numberOfKeys: 1, lua: SCRIPT });
    }
    this.client = client as LimiterClient;
  }

  /** Counts one request against `key` if it fits. Braces keep both windows on one cluster slot. */
  async hit(key: string, max: number, windowSec: number): Promise<LimitResult> {
    return this.run(key, max, windowSec, 1);
  }

  /** Whether one more request would fit, without counting it. */
  async peek(key: string, max: number, windowSec: number): Promise<LimitResult> {
    return this.run(key, max, windowSec, 0);
  }

  private async run(key: string, max: number, windowSec: number, commit: 0 | 1) {
    const [allowed, count, resetMs] = await this.client.slidingWindow(
      `${this.prefix}{${key}}`,
      windowSec * 1000,
      max,
      1,
      commit,
    );
    return { allowed: allowed === 1, count: count ?? 0, resetMs: resetMs ?? 0 };
  }
}
