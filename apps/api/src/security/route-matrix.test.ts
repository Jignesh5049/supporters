import { randomUUID } from 'node:crypto';
import type { RouteOptions } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { call } from '../test/catalog';
import { POLICY } from './policy';
import {
  type MobileSession,
  type TestContext,
  createTestApp,
  registerMobile,
  resetState,
} from '../test/helpers';

/** See policy.ts for what each class means. */
type Policy = keyof typeof POLICY;
const EXPECTED = new Map<string, Policy>(
  (Object.keys(POLICY) as Policy[]).flatMap((policy) =>
    POLICY[policy].map((route) => [route, policy] as const),
  ),
);

interface Seen {
  method: string;
  url: string;
  config: Record<string, unknown>;
  schema?: { body?: unknown; querystring?: unknown; params?: unknown } | undefined;
}
const seen: Seen[] = [];
const key = (route: Seen) => `${route.method} ${route.url}`;
const withPolicy = (...policies: Policy[]) =>
  seen.filter((route) => policies.includes(EXPECTED.get(key(route)) ?? 'public'));

let ctx: TestContext;
let user: MobileSession;

beforeAll(async () => {
  ctx = await createTestApp({}, undefined, {
    onRoute: (route: RouteOptions) => {
      for (const method of [route.method].flat()) {
        if (method === 'HEAD' || method === 'OPTIONS') continue;
        seen.push({
          method,
          url: route.url,
          config: { ...(route.config as object) },
          schema: route.schema,
        });
      }
    },
  });
});
afterAll(async () => {
  await ctx.app.close();
});
beforeEach(async () => {
  await resetState();
  user = await registerMobile(ctx);
});

const concrete = (url: string) =>
  url
    .replace(':slug', 'no-such-business')
    .replace(':type', 'product')
    .replace(/:\w+/g, () => randomUUID());

const send = (route: Seen, as?: MobileSession) =>
  call(ctx, route.method as 'GET', concrete(route.url), {
    ...(as ? { as } : {}),
    ...(route.method === 'GET' ? {} : { body: {} }),
  });

describe('route inventory', () => {
  it('classifies every registered route, and nothing else', () => {
    const registered = new Set(seen.map(key));
    expect([...registered].filter((route) => !EXPECTED.has(route)).sort()).toEqual([]);
    expect([...EXPECTED.keys()].filter((route) => !registered.has(route)).sort()).toEqual([]);
  });

  it('declares the policy it is classified with', () => {
    for (const route of seen) {
      const expected = EXPECTED.get(key(route));
      // Admin routes get theirs from the admin plugin's onRoute hook, which runs after this one
      // (the 404 tests below prove it). Public and sign-in routes must declare nothing.
      if (expected === 'admin') continue;
      const want = expected === 'user' ? 'user' : 'none';
      expect(route.config.auth ?? 'none', key(route)).toBe(want);
    }
  });
});

/** Unwraps nullish/optional/default wrappers down to the object schema, if there is one. */
function objectShape(
  schema: unknown,
): { catchall?: { _zod?: { def?: { type?: string } } } } | null {
  let current = schema as { _zod?: { def?: Record<string, unknown> } } | undefined;
  for (let depth = 0; current?._zod?.def && depth < 6; depth += 1) {
    const def = current._zod.def;
    if (def.type === 'object') return def;
    current = (def.innerType ?? def.in) as typeof current;
  }
  return null;
}

describe('mass assignment', () => {
  it('rejects unknown properties in every request body, query and params schema', () => {
    const loose: string[] = [];
    let checked = 0;
    for (const route of seen) {
      for (const part of ['body', 'querystring', 'params'] as const) {
        const shape = objectShape(route.schema?.[part]);
        if (shape && shape.catchall?._zod?.def?.type !== 'never')
          loose.push(key(route) + ' ' + part);
        if (shape) checked += 1;
      }
    }
    expect(loose).toEqual([]);
    // The check really looked at schemas (a wrapper it cannot unwrap would pass silently).
    expect(checked).toBeGreaterThan(80);
  });

  it('puts a body schema on every write that takes one (nothing is read unvalidated)', () => {
    const bodiless = new Set(['DELETE /v1/me/push-tokens', 'DELETE /v1/me/web-push-subscriptions']);
    const missing = seen
      .filter((route) => ['POST', 'PUT', 'PATCH'].includes(route.method))
      .filter((route) => !route.schema?.body && !bodiless.has(key(route)))
      .map(key);
    // Writes that act on the URL alone (likes, follows, uploads/:id/complete).
    expect(missing.sort()).toEqual([
      'POST /v1/admin/users/:id/restore',
      'POST /v1/admin/verifications/:id/approve',
      'POST /v1/admin/withdrawals/:id/approve',
      'POST /v1/admin/withdrawals/:id/retry',
      'POST /v1/uploads/:id/complete',
      'PUT /v1/blocks/:userId',
      'PUT /v1/follows/:businessId',
      'PUT /v1/posts/:id/like',
      'PUT /v1/saves/:type/:id',
    ]);
  });
});

describe('guests', () => {
  it('get 401 on every user route, before validation or any database work', async () => {
    for (const route of withPolicy('user')) {
      expect((await send(route)).statusCode, key(route)).toBe(401);
    }
  });

  it('see the admin surface as a 404, and so do signed-in non-admins', async () => {
    for (const route of withPolicy('admin')) {
      expect((await send(route)).statusCode, `guest ${key(route)}`).toBe(404);
      expect((await send(route, user)).statusCode, `user ${key(route)}`).toBe(404);
    }
  });

  it('never crash a public, sign-in or webhook route with empty input', async () => {
    for (const route of withPolicy('public', 'signin', 'webhook')) {
      if (route.url === '/ready') continue;
      const response = await send(route);
      expect(response.statusCode, key(route)).toBeLessThan(500);
    }
  });

  it('are not asked to sign in on public routes', async () => {
    for (const route of withPolicy('public')) {
      if (route.url === '/ready') continue;
      expect((await send(route)).statusCode, key(route)).not.toBe(401);
    }
  });
});

describe('forged tokens', () => {
  it('are refused: bad signature, alg none, and a missing token', async () => {
    const [header, payload] = user.accessToken.split('.');
    const none = Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url');
    const tokens = [`${header}.${payload}.${'A'.repeat(86)}`, `${none}.${payload}.`, 'x'];
    for (const token of tokens) {
      const response = await ctx.app.inject({
        method: 'GET',
        url: '/v1/me',
        headers: { authorization: `Bearer ${token}` },
      });
      expect(response.statusCode, token.slice(0, 20)).toBe(401);
    }
  });
});
