import { randomUUID } from 'node:crypto';
import { RATE_LIMITS } from '@supporters/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { type ReferenceData, call, referenceData } from '../../test/catalog';
import { chatUpload, openThread, ownerAndBuyer, sendText } from '../../test/chat';
import {
  type MobileSession,
  type TestContext,
  createTestApp,
  prisma,
  problemCode,
  registerMobile,
  resetState,
} from '../../test/helpers';

let ctx: TestContext;
let refs: ReferenceData;

beforeAll(async () => {
  ctx = await createTestApp();
  refs = await referenceData();
});
afterAll(async () => {
  await ctx.app.close();
});
beforeEach(resetState);

let owner: MobileSession;
let buyer: MobileSession;
let stranger: MobileSession;
let businessId: string;
let productId: string;
let threadId: string;

beforeEach(async () => {
  ({
    owner,
    buyer,
    productId,
    business: { id: businessId },
  } = await ownerAndBuyer(ctx, refs));
  stranger = await registerMobile(ctx);
  threadId = await openThread(ctx, buyer, businessId);
});

const messages = (as: MobileSession, id = threadId, query = '') =>
  call(ctx, 'GET', `/v1/conversations/${id}/messages${query}`, { as });
const inbox = (as: MobileSession, query = '') =>
  call(ctx, 'GET', `/v1/conversations${query}`, { as });

describe('authorization matrix', () => {
  const missing = randomUUID();
  const routes = [
    ['GET', '/v1/conversations'],
    ['POST', '/v1/conversations'],
    ['PATCH', `/v1/conversations/${missing}`],
    ['GET', `/v1/conversations/${missing}/messages`],
    ['POST', `/v1/conversations/${missing}/messages`],
    ['POST', `/v1/conversations/${missing}/read`],
    ['DELETE', `/v1/messages/${missing}`],
    ['GET', `/v1/attachments/${missing}`],
  ] as const;

  it.each(routes)('%s %s rejects guests', async (method, url) => {
    expect((await call(ctx, method, url)).statusCode).toBe(401);
  });

  it('answers 404 to anyone outside the thread, on every thread route', async () => {
    const sent = await sendText(ctx, buyer, threadId);
    const messageId = sent.json().id;
    const upload = await chatUpload(buyer.user.id);
    await sendText(ctx, buyer, threadId, '', randomUUID(), {
      type: 'image',
      attachmentIds: [upload],
    });

    expect((await messages(stranger)).statusCode).toBe(404);
    expect((await sendText(ctx, stranger, threadId)).statusCode).toBe(404);
    const read = await call(ctx, 'POST', `/v1/conversations/${threadId}/read`, {
      as: stranger,
      body: {},
    });
    expect(read.statusCode).toBe(404);
    const patch = await call(ctx, 'PATCH', `/v1/conversations/${threadId}`, {
      as: stranger,
      body: { muted: true },
    });
    expect(patch.statusCode).toBe(404);
    expect(
      (await call(ctx, 'DELETE', `/v1/messages/${messageId}`, { as: stranger })).statusCode,
    ).toBe(404);
    expect((await call(ctx, 'GET', `/v1/attachments/${upload}`, { as: stranger })).statusCode).toBe(
      404,
    );
    expect((await inbox(stranger)).json().data).toEqual([]);
  });

  it('lets both ends in', async () => {
    expect((await messages(buyer)).statusCode).toBe(200);
    expect((await messages(owner)).statusCode).toBe(200);
  });

  it('does not let a user read the thread of another buyer with the same business', async () => {
    const other = await registerMobile(ctx);
    expect((await messages(other)).statusCode).toBe(404);
  });
});

describe('one thread per pair', () => {
  it('creates once, then returns the same thread', async () => {
    const again = await call(ctx, 'POST', '/v1/conversations', {
      as: buyer,
      body: { businessId },
    });
    expect(again.statusCode).toBe(200);
    expect(again.json()).toMatchObject({ id: threadId, side: 'user', unreadCount: 0 });
    expect(await prisma.conversation.count()).toBe(1);
  });

  it('survives concurrent opens', async () => {
    const fresh = await registerMobile(ctx);
    const results = await Promise.all(
      Array.from({ length: 6 }, () =>
        call(ctx, 'POST', '/v1/conversations', { as: fresh, body: { businessId } }),
      ),
    );
    expect(results.every((r) => r.statusCode === 200 || r.statusCode === 201)).toBe(true);
    expect(new Set(results.map((r) => r.json().id)).size).toBe(1);
    expect(await prisma.conversation.count({ where: { userId: fresh.user.id } })).toBe(1);
  });

  it('refuses your own business, and unknown or suspended ones', async () => {
    const own = await call(ctx, 'POST', '/v1/conversations', { as: owner, body: { businessId } });
    expect(own.statusCode).toBe(400);
    const unknown = await call(ctx, 'POST', '/v1/conversations', {
      as: buyer,
      body: { businessId: randomUUID() },
    });
    expect(unknown.statusCode).toBe(404);
    await prisma.user.update({ where: { id: owner.user.id }, data: { status: 'suspended' } });
    const suspended = await call(ctx, 'POST', '/v1/conversations', {
      as: stranger,
      body: { businessId },
    });
    expect(suspended.statusCode).toBe(404);
  });

  it('lets an owner message another business as a user, in a separate thread', async () => {
    const { business: other } = await ownerAndBuyer(ctx, refs);
    const asUser = await openThread(ctx, owner, other.id);
    expect(asUser).not.toBe(threadId);
    const sides = (await inbox(owner)).json().data.map((c: { side: string }) => c.side);
    expect(sides.sort()).toEqual(['business', 'user']);
    const asBusiness = await sendText(ctx, owner, threadId, 'hi as the business');
    expect(asBusiness.json().senderSide).toBe('business');
    const asUserMsg = await sendText(ctx, owner, asUser, 'hi as a user');
    expect(asUserMsg.json().senderSide).toBe('user');
  });

  it('rejects unknown body fields', async () => {
    const response = await call(ctx, 'POST', '/v1/conversations', {
      as: buyer,
      body: { businessId, userId: stranger.user.id },
    });
    expect(response.statusCode).toBe(400);
  });
});

describe('sending over REST', () => {
  it('stores a text message that both ends see, with the right side', async () => {
    const fromBuyer = await sendText(ctx, buyer, threadId, 'Do you ship to Pune?');
    expect(fromBuyer.statusCode).toBe(201);
    expect(fromBuyer.json()).toMatchObject({
      type: 'text',
      body: 'Do you ship to Pune?',
      senderSide: 'user',
      senderId: buyer.user.id,
    });
    const fromOwner = await sendText(ctx, owner, threadId, 'Yes, in 3 days');
    expect(fromOwner.json()).toMatchObject({ senderSide: 'business', senderId: owner.user.id });

    for (const as of [buyer, owner]) {
      const page = (await messages(as)).json();
      expect(page.data.map((m: { body: string }) => m.body)).toEqual([
        'Yes, in 3 days',
        'Do you ship to Pune?',
      ]);
    }
  });

  it('requires an Idempotency-Key that is a UUID', async () => {
    const send = (headers: Record<string, string>) =>
      ctx.app.inject({
        method: 'POST',
        url: `/v1/conversations/${threadId}/messages`,
        headers: { authorization: `Bearer ${buyer.accessToken}`, ...headers },
        payload: { type: 'text', body: 'hi' },
      });
    expect((await send({})).statusCode).toBe(400);
    expect((await send({ 'idempotency-key': 'not-a-uuid' })).statusCode).toBe(400);
  });

  it('stores a retry once and replays the first response', async () => {
    const key = randomUUID();
    const first = await sendText(ctx, buyer, threadId, 'Quote please', key);
    const second = await sendText(ctx, buyer, threadId, 'Quote please', key);
    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(200);
    expect(second.json()).toEqual(first.json());
    expect(await prisma.message.count()).toBe(1);
  });

  it('rejects the same key with another body', async () => {
    const key = randomUUID();
    await sendText(ctx, buyer, threadId, 'Quote please', key);
    const reused = await sendText(ctx, buyer, threadId, 'Something else', key);
    expect(reused.statusCode).toBe(422);
    expect(problemCode(reused)).toBe('IDEMPOTENCY_KEY_REUSED');
    expect(await prisma.message.count()).toBe(1);
  });

  it('stores concurrent retries of one key once', async () => {
    const key = randomUUID();
    const results = await Promise.all(
      Array.from({ length: 5 }, () => sendText(ctx, buyer, threadId, 'Racing', key)),
    );
    expect(results.every((r) => r.statusCode === 200 || r.statusCode === 201)).toBe(true);
    expect(new Set(results.map((r) => r.json().id)).size).toBe(1);
    expect(await prisma.message.count()).toBe(1);
  });

  it('scopes keys to the sender', async () => {
    const key = randomUUID();
    expect((await sendText(ctx, buyer, threadId, 'a', key)).statusCode).toBe(201);
    expect((await sendText(ctx, owner, threadId, 'b', key)).statusCode).toBe(201);
    expect(await prisma.message.count()).toBe(2);
  });

  it('validates the payload', async () => {
    const bad = async (body: object) =>
      (
        await ctx.app.inject({
          method: 'POST',
          url: `/v1/conversations/${threadId}/messages`,
          headers: {
            authorization: `Bearer ${buyer.accessToken}`,
            'idempotency-key': randomUUID(),
          },
          payload: body,
        })
      ).statusCode;
    expect(await bad({ type: 'text', body: '   ' })).toBe(400);
    expect(await bad({ type: 'text', body: 'x'.repeat(4_001) })).toBe(400);
    expect(await bad({ type: 'enquiry', body: 'sneaky' })).toBe(400);
    expect(await bad({ type: 'image' })).toBe(400);
    expect(await bad({ type: 'text', body: 'hi', senderSide: 'business' })).toBe(400);
    expect(await bad({ type: 'text', body: 'x'.repeat(4_000) })).toBe(201);
  });

  it('lets a suspended sender through nothing', async () => {
    await prisma.user.update({ where: { id: buyer.user.id }, data: { status: 'suspended' } });
    const response = await sendText(ctx, buyer, threadId);
    expect(response.statusCode).toBe(403);
    expect(problemCode(response)).toBe('ACCOUNT_SUSPENDED');
  });

  it('hides the thread from a suspended peer', async () => {
    await prisma.user.update({ where: { id: owner.user.id }, data: { status: 'suspended' } });
    expect((await sendText(ctx, buyer, threadId)).statusCode).toBe(404);
  });
});

describe('attachments and listing cards', () => {
  const send = (as: MobileSession, body: object) =>
    ctx.app.inject({
      method: 'POST',
      url: `/v1/conversations/${threadId}/messages`,
      headers: { authorization: `Bearer ${as.accessToken}`, 'idempotency-key': randomUUID() },
      payload: body,
    });

  it('sends 1 to 5 images with a caption', async () => {
    const ids = await Promise.all(Array.from({ length: 5 }, () => chatUpload(buyer.user.id)));
    const ok = await send(buyer, { type: 'image', body: 'Samples', attachmentIds: ids });
    expect(ok.statusCode).toBe(201);
    expect(ok.json().attachments.map((a: { id: string }) => a.id)).toEqual(ids);
    expect(ok.json().attachments[0].url).toBe(`/v1/attachments/${ids[0]}`);

    const six = await Promise.all(Array.from({ length: 6 }, () => chatUpload(buyer.user.id)));
    expect((await send(buyer, { type: 'image', attachmentIds: six })).statusCode).toBe(400);
  });

  it('sends one PDF and nothing else as a file', async () => {
    const pdf = await chatUpload(buyer.user.id, 'pdf');
    const pdf2 = await chatUpload(buyer.user.id, 'pdf');
    expect((await send(buyer, { type: 'file', attachmentIds: [pdf, pdf2] })).statusCode).toBe(400);
    expect((await send(buyer, { type: 'file', attachmentIds: [pdf] })).statusCode).toBe(201);
    const image = await chatUpload(buyer.user.id);
    expect((await send(buyer, { type: 'file', attachmentIds: [image] })).statusCode).toBe(400);
    const pdf3 = await chatUpload(buyer.user.id, 'pdf');
    expect((await send(buyer, { type: 'image', attachmentIds: [pdf3] })).statusCode).toBe(400);
  });

  it("refuses uploads that are not the sender's own ready chat uploads, or already used", async () => {
    const theirs = await chatUpload(owner.user.id);
    expect((await send(buyer, { type: 'image', attachmentIds: [theirs] })).statusCode).toBe(400);

    const post = await prisma.upload.create({
      data: {
        userId: buyer.user.id,
        purpose: 'post',
        key: `public/post/${randomUUID()}`,
        contentType: 'image/jpeg',
        sizeBytes: 10,
        status: 'ready',
      },
    });
    expect((await send(buyer, { type: 'image', attachmentIds: [post.id] })).statusCode).toBe(400);

    const pending = await prisma.upload.create({
      data: {
        userId: buyer.user.id,
        purpose: 'chat',
        key: `chat/${randomUUID()}`,
        contentType: 'image/jpeg',
        sizeBytes: 10,
      },
    });
    expect((await send(buyer, { type: 'image', attachmentIds: [pending.id] })).statusCode).toBe(
      400,
    );

    const once = await chatUpload(buyer.user.id);
    expect((await send(buyer, { type: 'image', attachmentIds: [once] })).statusCode).toBe(201);
    expect((await send(buyer, { type: 'image', attachmentIds: [once] })).statusCode).toBe(400);
  });

  it('sends a card for any public product, and refuses drafts and unknown ids', async () => {
    const ok = await send(buyer, {
      type: 'listing_card',
      listing: { type: 'product', id: productId },
    });
    expect(ok.statusCode).toBe(201);
    expect(ok.json().listing).toMatchObject({ type: 'product', id: productId, title: 'Bolts' });

    const draft = await prisma.product.create({
      data: { businessId, categoryId: refs.category.id, title: 'Draft', description: 'x' },
    });
    const bad = [
      { type: 'product', id: draft.id },
      { type: 'service', id: productId },
      { type: 'product', id: randomUUID() },
    ];
    for (const listing of bad) {
      expect((await send(buyer, { type: 'listing_card', listing })).statusCode).toBe(400);
    }
    expect((await send(buyer, { type: 'listing_card' })).statusCode).toBe(400);
  });

  it('turns the card into null once the listing is unpublished', async () => {
    await send(buyer, { type: 'listing_card', listing: { type: 'product', id: productId } });
    await prisma.product.update({ where: { id: productId }, data: { status: 'archived' } });
    expect((await messages(buyer)).json().data[0].listing).toBeNull();
  });

  it('serves a private file to both ends only, as a short-lived signed redirect', async () => {
    const id = await chatUpload(buyer.user.id);
    await send(buyer, { type: 'image', attachmentIds: [id] });

    for (const as of [buyer, owner]) {
      const response = await call(ctx, 'GET', `/v1/attachments/${id}`, { as });
      expect(response.statusCode).toBe(302);
      const location = new URL(response.headers.location as string);
      expect(location.searchParams.get('X-Amz-Expires')).toBe('300');
      expect(location.href).not.toContain(ctx.env.MEDIA_PUBLIC_URL);
      expect(response.headers['cache-control']).toBe('private, no-store');
    }
    expect((await call(ctx, 'GET', `/v1/attachments/${id}`, { as: stranger })).statusCode).toBe(
      404,
    );
    expect((await call(ctx, 'GET', `/v1/attachments/${id}`)).statusCode).toBe(401);
  });

  it('does not serve a file whose message the viewer deleted for themself', async () => {
    const id = await chatUpload(buyer.user.id);
    const sent = await send(buyer, { type: 'image', attachmentIds: [id] });
    await call(ctx, 'DELETE', `/v1/messages/${sent.json().id}`, { as: owner });
    expect((await call(ctx, 'GET', `/v1/attachments/${id}`, { as: owner })).statusCode).toBe(404);
    expect((await call(ctx, 'GET', `/v1/attachments/${id}`, { as: buyer })).statusCode).toBe(302);
  });

  it('never gives a chat file a public URL', async () => {
    const id = await chatUpload(buyer.user.id);
    const sent = await send(buyer, { type: 'image', attachmentIds: [id] });
    expect(JSON.stringify(sent.json())).not.toContain(ctx.env.MEDIA_PUBLIC_URL);
  });
});

describe('reading', () => {
  it('counts unread messages per side and moves the pointer on read', async () => {
    await sendText(ctx, buyer, threadId, 'one');
    const second = (await sendText(ctx, buyer, threadId, 'two')).json();

    let ownerView = (await inbox(owner)).json().data[0];
    expect(ownerView).toMatchObject({ side: 'business', unreadCount: 2, lastReadMessageId: null });
    expect(ownerView.lastMessage.body).toBe('two');
    // The sender has read what they sent.
    expect((await inbox(buyer)).json().data[0]).toMatchObject({ unreadCount: 0 });

    const read = await call(ctx, 'POST', `/v1/conversations/${threadId}/read`, {
      as: owner,
      body: { messageId: second.id },
    });
    expect(read.json()).toEqual({ lastReadMessageId: second.id });

    ownerView = (await inbox(owner)).json().data[0];
    expect(ownerView.unreadCount).toBe(0);
    // The buyer sees the owner's pointer, for the "read" tick.
    expect((await inbox(buyer)).json().data[0].peerLastReadMessageId).toBe(second.id);
  });

  it('defaults to the newest message and never moves the pointer back', async () => {
    const first = (await sendText(ctx, buyer, threadId, 'one')).json();
    const second = (await sendText(ctx, buyer, threadId, 'two')).json();
    const readAll = await call(ctx, 'POST', `/v1/conversations/${threadId}/read`, {
      as: owner,
      body: {},
    });
    expect(readAll.json().lastReadMessageId).toBe(second.id);
    const back = await call(ctx, 'POST', `/v1/conversations/${threadId}/read`, {
      as: owner,
      body: { messageId: first.id },
    });
    expect(back.json().lastReadMessageId).toBe(second.id);
  });

  it('refuses a message of another thread', async () => {
    const { business: other } = await ownerAndBuyer(ctx, refs);
    const otherThread = await openThread(ctx, buyer, other.id);
    const foreign = (await sendText(ctx, buyer, otherThread, 'elsewhere')).json();
    const response = await call(ctx, 'POST', `/v1/conversations/${threadId}/read`, {
      as: buyer,
      body: { messageId: foreign.id },
    });
    expect(response.statusCode).toBe(400);
  });

  it('answers a read on an empty thread', async () => {
    const response = await call(ctx, 'POST', `/v1/conversations/${threadId}/read`, {
      as: buyer,
      body: {},
    });
    expect(response.json()).toEqual({ lastReadMessageId: null });
  });

  it("keeps each side's read state apart", async () => {
    await sendText(ctx, owner, threadId, 'from owner');
    await call(ctx, 'POST', `/v1/conversations/${threadId}/read`, { as: buyer, body: {} });
    expect((await inbox(owner)).json().data[0].unreadCount).toBe(0);
    await sendText(ctx, buyer, threadId, 'reply');
    expect((await inbox(owner)).json().data[0].unreadCount).toBe(1);
    expect((await inbox(buyer)).json().data[0].unreadCount).toBe(0);
  });
});

describe('inbox controls', () => {
  it('mutes and hides per side', async () => {
    await sendText(ctx, buyer, threadId);
    const muted = await call(ctx, 'PATCH', `/v1/conversations/${threadId}`, {
      as: owner,
      body: { muted: true },
    });
    expect(muted.json()).toMatchObject({ muted: true, hidden: false });
    expect((await inbox(buyer)).json().data[0].muted).toBe(false);

    await call(ctx, 'PATCH', `/v1/conversations/${threadId}`, {
      as: owner,
      body: { hidden: true },
    });
    expect((await inbox(owner)).json().data).toEqual([]);
    expect((await inbox(owner, '?hidden=true')).json().data).toHaveLength(1);
    expect((await inbox(buyer)).json().data).toHaveLength(1);
  });

  it('brings a hidden thread back when the other end writes', async () => {
    await call(ctx, 'PATCH', `/v1/conversations/${threadId}`, {
      as: owner,
      body: { hidden: true },
    });
    await sendText(ctx, buyer, threadId);
    expect((await inbox(owner)).json().data).toHaveLength(1);
  });

  it('needs muted or hidden, and nothing else', async () => {
    for (const body of [{}, { side: 'user' }, { muted: 'yes' }]) {
      const response = await call(ctx, 'PATCH', `/v1/conversations/${threadId}`, {
        as: buyer,
        body,
      });
      expect(response.statusCode).toBe(400);
    }
  });

  it('searches the name of the other end', async () => {
    await prisma.business.update({ where: { id: businessId }, data: { name: 'Zenith Fasteners' } });
    await sendText(ctx, buyer, threadId);
    expect((await inbox(buyer, '?q=zeni')).json().data).toHaveLength(1);
    expect((await inbox(buyer, '?q=nomatch')).json().data).toHaveLength(0);
    await prisma.user.update({ where: { id: buyer.user.id }, data: { name: 'Ravi Kumar' } });
    expect((await inbox(owner, '?q=ravi')).json().data).toHaveLength(1);
    // The owner searches for the buyer, not for the name of their own business.
    expect((await inbox(owner, '?q=zeni')).json().data).toHaveLength(0);
  });

  it('orders by latest activity and pages with a cursor', async () => {
    const threads = [threadId];
    for (let i = 0; i < 2; i += 1) {
      const { business } = await ownerAndBuyer(ctx, refs);
      threads.push(await openThread(ctx, buyer, business.id));
    }
    await sendText(ctx, buyer, threads[0] as string, 'bump');
    const first = (await inbox(buyer, '?limit=2')).json();
    expect(first.data.map((c: { id: string }) => c.id)).toEqual([threads[0], threads[2]]);
    const second = (await inbox(buyer, `?limit=2&cursor=${first.nextCursor}`)).json();
    expect(second.data.map((c: { id: string }) => c.id)).toEqual([threads[1]]);
    expect(second.nextCursor).toBeNull();
    expect((await inbox(buyer, '?cursor=garbage')).statusCode).toBe(400);
  });
});

describe('history', () => {
  it('pages back with a cursor and catches up with after', async () => {
    const ids: string[] = [];
    for (let i = 0; i < 5; i += 1) {
      ids.push((await sendText(ctx, buyer, threadId, `m${i}`)).json().id);
    }
    const newest = (await messages(owner, threadId, '?limit=2')).json();
    expect(newest.data.map((m: { id: string }) => m.id)).toEqual([ids[4], ids[3]]);
    const older = (await messages(owner, threadId, `?limit=2&cursor=${newest.nextCursor}`)).json();
    expect(older.data.map((m: { id: string }) => m.id)).toEqual([ids[2], ids[1]]);

    const caughtUp = (await messages(owner, threadId, `?after=${ids[1]}&limit=2`)).json();
    expect(caughtUp.data.map((m: { id: string }) => m.id)).toEqual([ids[2], ids[3]]);
    expect(caughtUp.nextCursor).toBe(ids[3]);
    const rest = (await messages(owner, threadId, `?after=${caughtUp.nextCursor}&limit=2`)).json();
    expect(rest.data.map((m: { id: string }) => m.id)).toEqual([ids[4]]);
    expect(rest.nextCursor).toBeNull();
  });

  it('refuses cursor and after together, and a bad cursor', async () => {
    expect((await messages(owner, threadId, `?cursor=abc&after=${randomUUID()}`)).statusCode).toBe(
      400,
    );
    expect((await messages(owner, threadId, '?cursor=garbage')).statusCode).toBe(400);
  });

  it('deletes a message for one user only, and idempotently', async () => {
    const sent = (await sendText(ctx, buyer, threadId, 'oops')).json();
    expect((await call(ctx, 'DELETE', `/v1/messages/${sent.id}`, { as: buyer })).statusCode).toBe(
      204,
    );
    expect((await call(ctx, 'DELETE', `/v1/messages/${sent.id}`, { as: buyer })).statusCode).toBe(
      204,
    );
    expect((await messages(buyer)).json().data).toEqual([]);
    expect((await inbox(buyer)).json().data[0].lastMessage).toBeNull();
    expect((await messages(owner)).json().data).toHaveLength(1);
    expect(
      (await call(ctx, 'DELETE', `/v1/messages/${randomUUID()}`, { as: buyer })).statusCode,
    ).toBe(404);
  });

  it('does not count a deleted message as unread', async () => {
    const sent = (await sendText(ctx, buyer, threadId, 'unread')).json();
    await call(ctx, 'DELETE', `/v1/messages/${sent.id}`, { as: owner });
    expect((await inbox(owner)).json().data[0].unreadCount).toBe(0);
  });
});

describe('blocks', () => {
  const block = (as: MobileSession, userId: string) =>
    call(ctx, 'PUT', `/v1/blocks/${userId}`, { as });
  const unblock = (as: MobileSession, userId: string) =>
    call(ctx, 'DELETE', `/v1/blocks/${userId}`, { as });

  it('rejects guests and self-blocks, and 404s on unknown users', async () => {
    expect((await call(ctx, 'PUT', `/v1/blocks/${owner.user.id}`)).statusCode).toBe(401);
    expect((await call(ctx, 'DELETE', `/v1/blocks/${owner.user.id}`)).statusCode).toBe(401);
    expect((await block(buyer, buyer.user.id)).statusCode).toBe(400);
    expect((await block(buyer, randomUUID())).statusCode).toBe(404);
  });

  it('is idempotent both ways', async () => {
    expect((await block(buyer, owner.user.id)).json()).toEqual({ isBlocked: true });
    expect((await block(buyer, owner.user.id)).json()).toEqual({ isBlocked: true });
    expect(await prisma.block.count()).toBe(1);
    expect((await unblock(buyer, owner.user.id)).json()).toEqual({ isBlocked: false });
    expect((await unblock(buyer, owner.user.id)).json()).toEqual({ isBlocked: false });
  });

  it('stops messages both ways when the buyer blocks the owner', async () => {
    await sendText(ctx, buyer, threadId, 'before');
    await block(buyer, owner.user.id);
    const fromBuyer = await sendText(ctx, buyer, threadId, 'after');
    const fromOwner = await sendText(ctx, owner, threadId, 'reply');
    expect(fromBuyer.statusCode).toBe(403);
    expect(problemCode(fromBuyer)).toBe('BLOCKED');
    expect(fromOwner.statusCode).toBe(403);
    expect(problemCode(fromOwner)).toBe('BLOCKED');
    expect(await prisma.message.count()).toBe(1);
  });

  it('stops messages both ways when the owner blocks the buyer', async () => {
    await block(owner, buyer.user.id);
    expect((await sendText(ctx, buyer, threadId)).statusCode).toBe(403);
    expect((await sendText(ctx, owner, threadId)).statusCode).toBe(403);
  });

  it('hides the thread from whoever blocked, not from the blocked', async () => {
    await sendText(ctx, buyer, threadId);
    await block(buyer, owner.user.id);
    expect((await inbox(buyer)).json().data).toEqual([]);
    expect((await inbox(owner)).json().data).toHaveLength(1);
    await unblock(buyer, owner.user.id);
    expect((await inbox(buyer)).json().data).toHaveLength(1);
    expect((await sendText(ctx, buyer, threadId)).statusCode).toBe(201);
  });

  it('stays blocked while either direction remains', async () => {
    await block(buyer, owner.user.id);
    await block(owner, buyer.user.id);
    await unblock(buyer, owner.user.id);
    expect((await sendText(ctx, buyer, threadId)).statusCode).toBe(403);
    await unblock(owner, buyer.user.id);
    expect((await sendText(ctx, buyer, threadId)).statusCode).toBe(201);
  });

  it('refuses to open a thread with a blocked account, in either direction', async () => {
    const fresh = await registerMobile(ctx);
    await block(fresh, owner.user.id);
    const openBlocked = await call(ctx, 'POST', '/v1/conversations', {
      as: fresh,
      body: { businessId },
    });
    expect(openBlocked.statusCode).toBe(403);
    await unblock(fresh, owner.user.id);
    await block(owner, fresh.user.id);
    const openByBlocked = await call(ctx, 'POST', '/v1/conversations', {
      as: fresh,
      body: { businessId },
    });
    expect(openByBlocked.statusCode).toBe(403);
  });

  it('still lets the blocked read old messages', async () => {
    await sendText(ctx, owner, threadId, 'history');
    await block(owner, buyer.user.id);
    expect((await messages(buyer)).json().data).toHaveLength(1);
  });

  it('lets a retry of an already stored message through', async () => {
    const key = randomUUID();
    await sendText(ctx, buyer, threadId, 'once', key);
    await block(owner, buyer.user.id);
    const replay = await sendText(ctx, buyer, threadId, 'once', key);
    expect(replay.statusCode).toBe(200);
  });
});

describe('rate limits', () => {
  it('allows 30 messages per 10 s per user, then 429 with Retry-After', async () => {
    const { max } = RATE_LIMITS.messages;
    for (let i = 0; i < max; i += 1) {
      expect((await sendText(ctx, buyer, threadId, `m${i}`)).statusCode).toBe(201);
    }
    const over = await sendText(ctx, buyer, threadId, 'one too many');
    expect(over.statusCode).toBe(429);
    expect(problemCode(over)).toBe('RATE_LIMITED');
    expect(Number(over.headers['retry-after'])).toBeGreaterThanOrEqual(1);
    // The limit is per user: the other end is unaffected.
    expect((await sendText(ctx, owner, threadId, 'still fine')).statusCode).toBe(201);
  });

  it('does not count a replayed send', async () => {
    const key = randomUUID();
    await sendText(ctx, buyer, threadId, 'first', key);
    for (let i = 0; i < RATE_LIMITS.messages.max + 5; i += 1) {
      expect((await sendText(ctx, buyer, threadId, 'first', key)).statusCode).toBe(200);
    }
    expect((await sendText(ctx, buyer, threadId, 'new one')).statusCode).toBe(201);
  });

  it('caps new conversations per day', async () => {
    const fresh = await registerMobile(ctx);
    const { newConversationsPerDay } = RATE_LIMITS;
    const businesses = await Promise.all(
      Array.from({ length: newConversationsPerDay + 1 }, async (_, i) => {
        const user = await prisma.user.findUniqueOrThrow({ where: { id: owner.user.id } });
        const created = await prisma.user.create({
          data: {
            phone: `+9197${String(i).padStart(8, '0')}`,
            name: `Seller ${i}`,
            passwordHash: user.passwordHash,
          },
        });
        const business = await prisma.business.create({
          data: {
            ownerUserId: created.id,
            slug: `seller-${i}`,
            name: `Seller ${i}`,
            type: 'retailer',
            categoryId: refs.category.id,
            cityId: refs.mumbai.id,
            stateId: refs.mumbai.stateId,
          },
        });
        return business.id;
      }),
    );
    for (const id of businesses.slice(0, newConversationsPerDay)) {
      const response = await call(ctx, 'POST', '/v1/conversations', {
        as: fresh,
        body: { businessId: id },
      });
      expect(response.statusCode).toBe(201);
    }
    const over = await call(ctx, 'POST', '/v1/conversations', {
      as: fresh,
      body: { businessId: businesses.at(-1) },
    });
    expect(over.statusCode).toBe(429);
    // Opening an existing thread is free.
    const again = await call(ctx, 'POST', '/v1/conversations', {
      as: fresh,
      body: { businessId: businesses[0] },
    });
    expect(again.statusCode).toBe(200);
  }, 120_000);
});
