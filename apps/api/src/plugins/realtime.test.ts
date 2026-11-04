import { randomUUID } from 'node:crypto';
import { RATE_LIMITS } from '@supporters/shared';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { type ReferenceData, call, referenceData } from '../test/catalog';
import { chatUpload, openThread, ownerAndBuyer, sendText } from '../test/chat';
import {
  APP_ORIGIN,
  type MobileSession,
  type TestContext,
  createTestApp,
  prisma,
  registerMobile,
  resetState,
} from '../test/helpers';
import {
  asMobile,
  asWeb,
  ask,
  closeSockets,
  collect,
  connect,
  listen,
  quiet,
  until,
} from '../test/socket';

let ctx: TestContext;
let refs: ReferenceData;
let url: string;

beforeAll(async () => {
  ctx = await createTestApp();
  refs = await referenceData();
  url = await listen(ctx.app);
});
afterAll(async () => {
  closeSockets();
  await ctx.app.close();
});
beforeEach(resetState);
afterEach(closeSockets);

let owner: MobileSession;
let buyer: MobileSession;
let stranger: MobileSession;
let businessId: string;
let threadId: string;

beforeEach(async () => {
  ({
    owner,
    buyer,
    business: { id: businessId },
  } = await ownerAndBuyer(ctx, refs));
  stranger = await registerMobile(ctx);
  threadId = await openThread(ctx, buyer, businessId);
});

const send = (body = 'hello', clientId: string = randomUUID(), extra: object = {}) => ({
  conversationId: threadId,
  clientId,
  type: 'text',
  body,
  ...extra,
});
const sidOf = (session: MobileSession) => {
  const claims = ctx.app.accessTokens.verify(session.accessToken);
  if (!claims) throw new Error('bad token');
  return claims.sid;
};
const tokenFor = (session: MobileSession, expiresInSec: number) =>
  ctx.app.jwt.sign(
    { sub: session.user.id, sid: sidOf(session), role: 'user' },
    { expiresIn: expiresInSec, kid: ctx.env.JWT_KEY_ID },
  );

describe('handshake', () => {
  it('accepts a bearer token, raw or with the Bearer prefix (mobile)', async () => {
    await expect(asMobile(url, buyer)).resolves.toBeDefined();
    await expect(connect(url, { token: `Bearer ${buyer.accessToken}` })).resolves.toBeDefined();
  });

  it('accepts the __Host-at cookie with the right Origin (web)', async () => {
    await expect(asWeb(url, buyer)).resolves.toBeDefined();
  });

  it('rejects a missing, malformed or forged token', async () => {
    await expect(connect(url, {})).rejects.toThrow('forbidden_origin');
    await expect(connect(url, { token: 'not.a.jwt' })).rejects.toThrow('unauthorized');
    await expect(connect(url, { token: 'x' })).rejects.toThrow('unauthorized');
    const forged = buyer.accessToken.slice(0, -4) + 'AAAA';
    await expect(connect(url, { token: forged })).rejects.toThrow('unauthorized');
    await expect(connect(url, { cookie: 'garbage', origin: APP_ORIGIN })).rejects.toThrow(
      'unauthorized',
    );
  });

  it('rejects an expired token', async () => {
    const expired = tokenFor(buyer, 1);
    await quiet(2_100);
    await expect(connect(url, { token: expired })).rejects.toThrow('unauthorized');
  });

  it('rejects the cookie from a wrong, missing or look-alike Origin', async () => {
    const cookie = buyer.accessToken;
    for (const origin of [
      'https://evil.test',
      'http://supporters.test',
      `${APP_ORIGIN}.evil.test`,
      'null',
    ]) {
      await expect(connect(url, { cookie, origin })).rejects.toThrow('forbidden_origin');
    }
    await expect(connect(url, { cookie })).rejects.toThrow('forbidden_origin');
  });

  it('rejects a foreign Origin even with a token, but allows none (native apps)', async () => {
    await expect(
      connect(url, { token: buyer.accessToken, origin: 'https://evil.test' }),
    ).rejects.toThrow('forbidden_origin');
    await expect(
      connect(url, { token: buyer.accessToken, origin: APP_ORIGIN }),
    ).resolves.toBeDefined();
  });

  it('rejects a revoked session and a suspended account', async () => {
    await ctx.app.services.sessions.revoke(sidOf(buyer));
    await expect(asMobile(url, buyer)).rejects.toThrow('unauthorized');
    await prisma.user.update({ where: { id: stranger.user.id }, data: { status: 'suspended' } });
    await expect(asMobile(url, stranger)).rejects.toThrow('unauthorized');
  });

  it('caps the sockets of one account', async () => {
    for (let i = 0; i < 10; i += 1) await asMobile(url, buyer);
    await expect(asMobile(url, buyer)).rejects.toThrow('too_many_connections');
  });
});

describe('token lifetime', () => {
  it('disconnects at expiry with token_expired', async () => {
    const socket = await connect(url, { token: tokenFor(buyer, 2) });
    const ended = collect<{ reason: string }>(socket, 'auth:expired');
    await until(() => expect(socket.connected).toBe(false));
    expect(ended).toEqual([{ reason: 'token_expired' }]);
  });

  it('stays connected when the mobile client renews before expiry', async () => {
    const socket = await connect(url, { token: tokenFor(buyer, 2) });
    const ack = await ask<{ ok: boolean; expiresAt: string }>(socket, 'auth:renew', {
      token: `Bearer ${tokenFor(buyer, 600)}`,
    });
    expect(ack.ok).toBe(true);
    await quiet(2_600);
    expect(socket.connected).toBe(true);
  });

  it('refuses a renewal for another user, another session, or that does not extend', async () => {
    const socket = await connect(url, { token: tokenFor(buyer, 60) });
    const notExtended = await ask(socket, 'auth:renew', { token: tokenFor(buyer, 30) });
    expect(notExtended).toMatchObject({ ok: false, code: 'CONFLICT' });
    expect(socket.connected).toBe(true);

    const ended = collect<{ reason: string }>(socket, 'auth:expired');
    const other = await ask(socket, 'auth:renew', { token: tokenFor(stranger, 600) });
    expect(other).toMatchObject({ ok: false, code: 'UNAUTHENTICATED' });
    await until(() => expect(socket.connected).toBe(false));
    expect(ended).toEqual([{ reason: 'token_invalid' }]);
  });

  it('tells web clients to reconnect instead of renewing', async () => {
    const socket = await asWeb(url, buyer);
    expect(await ask(socket, 'auth:renew', {})).toMatchObject({ ok: false, code: 'CONFLICT' });
  });

  it('disconnects at once when the session is revoked', async () => {
    const socket = await asMobile(url, buyer);
    const other = await asMobile(url, owner);
    const ended = collect<{ reason: string }>(socket, 'auth:expired');
    await ctx.app.services.sessions.revoke(sidOf(buyer));
    await until(() => expect(socket.connected).toBe(false));
    expect(ended).toEqual([{ reason: 'session_revoked' }]);
    expect(other.connected).toBe(true);
  });

  it('disconnects on logout over HTTP', async () => {
    const socket = await asMobile(url, buyer);
    const response = await call(ctx, 'POST', '/v1/auth/logout', {
      as: buyer,
      body: { refreshToken: buyer.refreshToken },
    });
    expect(response.statusCode).toBeLessThan(300);
    await until(() => expect(socket.connected).toBe(false));
  });
});

describe('message:send', () => {
  it('stores, acks, and delivers message:new to both ends, on every device', async () => {
    const buyerPhone = await asMobile(url, buyer);
    const buyerTab = await asWeb(url, buyer);
    const ownerPhone = await asMobile(url, owner);
    const strangerSocket = await asMobile(url, stranger);
    const toBuyer = collect<{ body: string }>(buyerPhone, 'message:new');
    const toBuyerTab = collect<{ body: string }>(buyerTab, 'message:new');
    const toOwner = collect<{ body: string; senderSide: string }>(ownerPhone, 'message:new');
    const toStranger = collect(strangerSocket, 'message:new');

    const clientId = randomUUID();
    const ack = await ask<{ ok: boolean; id: string; createdAt: string }>(
      buyerPhone,
      'message:send',
      send('Price for 100?', clientId),
    );
    expect(ack).toMatchObject({ ok: true, id: expect.any(String), createdAt: expect.any(String) });
    await until(() => expect(toOwner).toHaveLength(1));
    expect(toOwner[0]).toMatchObject({ body: 'Price for 100?', senderSide: 'user', clientId });
    await until(() => expect(toBuyer).toHaveLength(1));
    await until(() => expect(toBuyerTab).toHaveLength(1));
    await quiet();
    expect(toStranger).toEqual([]);

    const history = await call(ctx, 'GET', `/v1/conversations/${threadId}/messages`, { as: owner });
    expect(history.json().data[0].id).toBe(ack.id);
  });

  it('delivers the reply of the owner to the buyer', async () => {
    const buyerSocket = await asMobile(url, buyer);
    const ownerSocket = await asMobile(url, owner);
    const received = collect<{ body: string; senderSide: string }>(buyerSocket, 'message:new');
    const ack = await ask<{ ok: boolean }>(ownerSocket, 'message:send', send('In stock'));
    expect(ack.ok).toBe(true);
    await until(() => expect(received).toHaveLength(1));
    expect(received[0]).toMatchObject({ body: 'In stock', senderSide: 'business' });
  });

  it('answers a repeated clientId with the first ack and stores one message', async () => {
    const socket = await asMobile(url, buyer);
    const peer = await asMobile(url, owner);
    const received = collect(peer, 'message:new');
    const clientId = randomUUID();
    const first = await ask<{ id: string; createdAt: string }>(
      socket,
      'message:send',
      send('once', clientId),
    );
    const second = await ask<{ id: string; createdAt: string }>(
      socket,
      'message:send',
      send('once', clientId),
    );
    expect(second).toEqual(first);
    expect(await prisma.message.count()).toBe(1);
    await quiet();
    expect(received).toHaveLength(1);

    const reused = await ask(socket, 'message:send', send('another body', clientId));
    expect(reused).toMatchObject({ ok: false, code: 'IDEMPOTENCY_KEY_REUSED' });
  });

  it('dedupes across REST and the socket', async () => {
    const socket = await asMobile(url, buyer);
    const clientId = randomUUID();
    const viaRest = await sendText(ctx, buyer, threadId, 'same', clientId);
    const viaSocket = await ask<{ id: string }>(socket, 'message:send', send('same', clientId));
    expect(viaSocket.id).toBe(viaRest.json().id);
    expect(await prisma.message.count()).toBe(1);
  });

  it('survives concurrent sends of one clientId', async () => {
    const socket = await asMobile(url, buyer);
    const clientId = randomUUID();
    const acks = await Promise.all(
      Array.from({ length: 5 }, () =>
        ask<{ id: string }>(socket, 'message:send', send('race', clientId)),
      ),
    );
    expect(new Set(acks.map((a) => a.id)).size).toBe(1);
    expect(await prisma.message.count()).toBe(1);
  });

  it('validates the payload and does not accept a forged side or sender', async () => {
    const socket = await asMobile(url, buyer);
    const bad: object[] = [
      {},
      { conversationId: threadId },
      { conversationId: threadId, clientId: 'nope', type: 'text', body: 'x' },
      send('   '),
      send('x'.repeat(4_001)),
      { ...send('hi'), type: 'enquiry' },
      { ...send('hi'), senderSide: 'business' },
      { ...send('hi'), senderUserId: owner.user.id },
      { conversationId: threadId, clientId: randomUUID(), type: 'image', attachmentIds: [] },
    ];
    for (const payload of bad) {
      const ack = await ask(socket, 'message:send', payload);
      expect(ack, JSON.stringify(payload)).toMatchObject({ ok: false, code: 'VALIDATION_FAILED' });
    }
    expect(await ask(socket, 'message:send', 'a string')).toMatchObject({ ok: false });
    expect(await prisma.message.count()).toBe(0);
  });

  it('sends attachments and listing cards from the owner of the upload only', async () => {
    const socket = await asMobile(url, buyer);
    const mine = await chatUpload(buyer.user.id);
    const ok = await ask(
      socket,
      'message:send',
      send('look', randomUUID(), { type: 'image', attachmentIds: [mine] }),
    );
    expect(ok).toMatchObject({ ok: true });
    const theirs = await chatUpload(owner.user.id);
    const stolen = await ask(
      socket,
      'message:send',
      send('', randomUUID(), { type: 'image', attachmentIds: [theirs] }),
    );
    expect(stolen).toMatchObject({ ok: false, code: 'VALIDATION_FAILED' });
  });

  it('enforces 30 sends per 10 s, with retryAfter', async () => {
    const socket = await asMobile(url, buyer);
    for (let i = 0; i < RATE_LIMITS.messages.max; i += 1) {
      expect(await ask(socket, 'message:send', send(`m${i}`))).toMatchObject({ ok: true });
    }
    const over = await ask<{ code: string; retryAfter: number }>(
      socket,
      'message:send',
      send('over'),
    );
    expect(over).toMatchObject({ ok: false, code: 'RATE_LIMITED' });
    expect(over.retryAfter).toBeGreaterThanOrEqual(1);
    // The limit is shared with REST.
    expect((await sendText(ctx, buyer, threadId)).statusCode).toBe(429);
  });
});

describe('membership and blocks on every event', () => {
  it('lets a stranger do nothing in the thread, and tells them nothing', async () => {
    const intruder = await asMobile(url, stranger);
    const buyerSocket = await asMobile(url, buyer);
    const seen = collect(buyerSocket, 'typing');
    const reads = collect(buyerSocket, 'message:read');
    const sent = await sendText(ctx, owner, threadId, 'private');

    expect(await ask(intruder, 'message:send', send('hi'))).toMatchObject({
      ok: false,
      code: 'NOT_FOUND',
    });
    expect(await ask(intruder, 'message:read', { conversationId: threadId })).toMatchObject({
      ok: false,
      code: 'NOT_FOUND',
    });
    expect(await ask(intruder, 'typing', { conversationId: threadId })).toMatchObject({
      ok: false,
      code: 'NOT_FOUND',
    });
    expect(await ask(intruder, 'presence:get', { conversationId: threadId })).toMatchObject({
      ok: false,
      code: 'NOT_FOUND',
    });
    expect(
      await ask(intruder, 'message:read', { conversationId: threadId, messageId: sent.json().id }),
    ).toMatchObject({ ok: false });
    await quiet();
    expect(seen).toEqual([]);
    expect(reads).toEqual([]);
    expect(await prisma.message.count()).toBe(1);
  });

  it('does not deliver another thread to the wrong user', async () => {
    const other = await ownerAndBuyer(ctx, refs);
    const otherThread = await openThread(ctx, other.buyer, other.business.id);
    const mine = await asMobile(url, buyer);
    const received = collect(mine, 'message:new');
    await ask(await asMobile(url, other.buyer), 'message:send', {
      conversationId: otherThread,
      clientId: randomUUID(),
      type: 'text',
      body: 'not for you',
    });
    await quiet();
    expect(received).toEqual([]);
  });

  it('refuses sends in both directions once blocked, and sends no typing or presence', async () => {
    const buyerSocket = await asMobile(url, buyer);
    const ownerSocket = await asMobile(url, owner);
    await call(ctx, 'PUT', `/v1/blocks/${owner.user.id}`, { as: buyer });

    expect(await ask(buyerSocket, 'message:send', send('hi'))).toMatchObject({
      ok: false,
      code: 'BLOCKED',
    });
    expect(await ask(ownerSocket, 'message:send', send('hi'))).toMatchObject({
      ok: false,
      code: 'BLOCKED',
    });
    const typed = collect(ownerSocket, 'typing');
    await ask(buyerSocket, 'typing', { conversationId: threadId });
    await quiet();
    expect(typed).toEqual([]);
    expect(await ask(buyerSocket, 'presence:get', { conversationId: threadId })).toMatchObject({
      ok: true,
      online: false,
    });
    expect(await prisma.message.count()).toBe(0);

    await call(ctx, 'DELETE', `/v1/blocks/${owner.user.id}`, { as: buyer });
    await call(ctx, 'PUT', `/v1/blocks/${buyer.user.id}`, { as: owner });
    expect(await ask(buyerSocket, 'message:send', send('hi'))).toMatchObject({
      ok: false,
      code: 'BLOCKED',
    });
  });

  it('sends no read receipt across a block', async () => {
    const message = (await sendText(ctx, owner, threadId, 'hello')).json();
    const ownerSocket = await asMobile(url, owner);
    const buyerSocket = await asMobile(url, buyer);
    const receipts = collect(ownerSocket, 'message:read');
    await call(ctx, 'PUT', `/v1/blocks/${owner.user.id}`, { as: buyer });
    await ask(buyerSocket, 'message:read', { conversationId: threadId, messageId: message.id });
    await quiet();
    expect(receipts).toEqual([]);
  });

  it('stops delivering after the other end is suspended', async () => {
    const buyerSocket = await asMobile(url, buyer);
    await prisma.user.update({ where: { id: owner.user.id }, data: { status: 'suspended' } });
    expect(await ask(buyerSocket, 'message:send', send('hi'))).toMatchObject({
      ok: false,
      code: 'NOT_FOUND',
    });
  });
});

describe('read receipts', () => {
  it('moves the pointer and tells both ends', async () => {
    const sent = (await sendText(ctx, buyer, threadId, 'ping')).json();
    const ownerSocket = await asMobile(url, owner);
    const buyerSocket = await asMobile(url, buyer);
    const toBuyer = collect<{ messageId: string; side: string; readerId: string }>(
      buyerSocket,
      'message:read',
    );
    const toOwner = collect(ownerSocket, 'message:read');

    const ack = await ask(ownerSocket, 'message:read', {
      conversationId: threadId,
      messageId: sent.id,
    });
    expect(ack).toMatchObject({ ok: true, lastReadMessageId: sent.id });
    await until(() => expect(toBuyer).toHaveLength(1));
    expect(toBuyer[0]).toMatchObject({
      messageId: sent.id,
      side: 'business',
      readerId: owner.user.id,
    });
    await until(() => expect(toOwner).toHaveLength(1));

    const inbox = await call(ctx, 'GET', '/v1/conversations', { as: buyer });
    expect(inbox.json().data[0].peerLastReadMessageId).toBe(sent.id);
    // Reading again moves nothing, so no second receipt.
    await ask(ownerSocket, 'message:read', { conversationId: threadId, messageId: sent.id });
    await quiet();
    expect(toBuyer).toHaveLength(1);
  });

  it('defaults to the newest message', async () => {
    await sendText(ctx, buyer, threadId, 'one');
    const last = (await sendText(ctx, buyer, threadId, 'two')).json();
    const ownerSocket = await asMobile(url, owner);
    expect(await ask(ownerSocket, 'message:read', { conversationId: threadId })).toMatchObject({
      ok: true,
      lastReadMessageId: last.id,
    });
  });
});

describe('typing', () => {
  it('reaches only the other end, throttled to one per 3 s, and expires after 5 s', async () => {
    const buyerSocket = await asMobile(url, buyer);
    const ownerSocket = await asMobile(url, owner);
    const own = collect(buyerSocket, 'typing');
    const typed = collect<{ isTyping: boolean; side: string; userId: string }>(
      ownerSocket,
      'typing',
    );

    for (let i = 0; i < 4; i += 1)
      await ask(buyerSocket, 'typing', { conversationId: threadId, isTyping: true });
    await until(() => expect(typed).toHaveLength(1));
    await quiet();
    expect(typed).toHaveLength(1);
    expect(typed[0]).toMatchObject({ isTyping: true, side: 'user', userId: buyer.user.id });
    expect(own).toEqual([]);

    await until(() => expect(typed).toHaveLength(2), 9_000);
    expect(typed[1]).toMatchObject({ isTyping: false });
  }, 15_000);

  it('forwards an explicit stop, and only after a start', async () => {
    const buyerSocket = await asMobile(url, buyer);
    const ownerSocket = await asMobile(url, owner);
    const typed = collect<{ isTyping: boolean }>(ownerSocket, 'typing');
    await ask(buyerSocket, 'typing', { conversationId: threadId, isTyping: false });
    await quiet();
    expect(typed).toEqual([]);
    await ask(buyerSocket, 'typing', { conversationId: threadId, isTyping: true });
    await ask(buyerSocket, 'typing', { conversationId: threadId, isTyping: false });
    await until(() => expect(typed.map((t) => t.isTyping)).toEqual([true, false]));
  });

  it('shows the owner as the business side', async () => {
    const buyerSocket = await asMobile(url, buyer);
    const ownerSocket = await asMobile(url, owner);
    const typed = collect<{ side: string }>(buyerSocket, 'typing');
    await ask(ownerSocket, 'typing', { conversationId: threadId });
    await until(() => expect(typed).toEqual([expect.objectContaining({ side: 'business' })]));
  });
});

describe('presence', () => {
  it('is online while a socket is connected, and offline after the last one leaves', async () => {
    const buyerSocket = await asMobile(url, buyer);
    expect(await ask(buyerSocket, 'presence:get', { conversationId: threadId })).toMatchObject({
      online: false,
    });

    const first = await asMobile(url, owner);
    const second = await asWeb(url, owner);
    await until(async () =>
      expect(await ask(buyerSocket, 'presence:get', { conversationId: threadId })).toMatchObject({
        online: true,
      }),
    );
    first.close();
    await quiet();
    expect(await ask(buyerSocket, 'presence:get', { conversationId: threadId })).toMatchObject({
      online: true,
    });
    second.close();
    await until(async () =>
      expect(await ask(buyerSocket, 'presence:get', { conversationId: threadId })).toMatchObject({
        online: false,
      }),
    );
  });

  it('keeps presence in Valkey under a 60 s TTL', async () => {
    await asMobile(url, owner);
    await until(async () =>
      expect(await ctx.app.valkey.zcard(`presence:${owner.user.id}`)).toBe(1),
    );
    const ttl = await ctx.app.valkey.ttl(`presence:${owner.user.id}`);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(120);
  });

  it('pushes a presence event to the other end of a thread, not to strangers', async () => {
    const buyerSocket = await asMobile(url, buyer);
    const strangerSocket = await asMobile(url, stranger);
    const pushed = collect<{ userId: string; businessId: string | null; online: boolean }>(
      buyerSocket,
      'presence',
    );
    const toStranger = collect(strangerSocket, 'presence');
    const ownerSocket = await asMobile(url, owner);
    await until(() => expect(pushed).toHaveLength(1));
    expect(pushed[0]).toEqual({ userId: owner.user.id, businessId, online: true });
    ownerSocket.close();
    await until(() => expect(pushed).toHaveLength(2));
    expect(pushed[1]).toMatchObject({ online: false });
    expect(toStranger).toEqual([]);
  });
});

describe('flood control', () => {
  it('limits non-send events per user', async () => {
    const socket = await asMobile(url, buyer);
    const { max } = RATE_LIMITS.socketEvents;
    const acks = await Promise.all(
      Array.from({ length: max + 10 }, () =>
        ask<{ ok: boolean; code?: string }>(socket, 'presence:get', { conversationId: threadId }),
      ),
    );
    expect(acks.filter((a) => a.ok)).toHaveLength(max);
    expect(acks.filter((a) => a.code === 'RATE_LIMITED')).toHaveLength(10);
  });

  it('refuses an oversized packet', async () => {
    const socket = await asMobile(url, buyer);
    const closed = new Promise((resolve) => socket.once('disconnect', resolve));
    socket.emit('message:send', { ...send('x'), body: 'x'.repeat(70 * 1024) });
    await closed;
    expect(socket.connected).toBe(false);
  });
});

describe('two API instances', () => {
  it('fans message:new out across servers through the Valkey adapter', async () => {
    const second = await createTestApp({ JWT_PRIVATE_KEY: ctx.env.JWT_PRIVATE_KEY.privatePem });
    const secondUrl = await listen(second.app);
    try {
      const buyerSocket = await asMobile(url, buyer);
      const ownerSocket = await asMobile(secondUrl, owner);
      const received = collect<{ body: string }>(ownerSocket, 'message:new');
      await ask(buyerSocket, 'message:send', send('across servers'));
      await until(() =>
        expect(received).toEqual([expect.objectContaining({ body: 'across servers' })]),
      );

      // A REST send handled by the other instance still reaches a socket on the first.
      const buyerReceived = collect<{ body: string }>(buyerSocket, 'message:new');
      const viaOther = await second.app.inject({
        method: 'POST',
        url: `/v1/conversations/${threadId}/messages`,
        headers: { authorization: `Bearer ${owner.accessToken}`, 'idempotency-key': randomUUID() },
        payload: { type: 'text', body: 'from instance two' },
      });
      expect(viaOther.statusCode).toBe(201);
      await until(() => expect(buyerReceived.map((m) => m.body)).toContain('from instance two'));

      // Revocation on one instance disconnects a socket held by the other.
      const ended = collect(ownerSocket, 'auth:expired');
      await ctx.app.services.sessions.revoke(sidOf(owner));
      await until(() => expect(ended).toHaveLength(1));
    } finally {
      closeSockets();
      await second.app.close();
    }
  }, 30_000);
});
