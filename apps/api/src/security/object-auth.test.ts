import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  type ReferenceData,
  call,
  productBody,
  referenceData,
  serviceBody,
  signUpOwner,
} from '../test/catalog';
import { chatUpload, openThread, postWithKey, publishedProduct, sendText } from '../test/chat';
import {
  type MobileSession,
  type TestContext,
  createTestApp,
  prisma,
  registerMobile,
  resetState,
} from '../test/helpers';
import { ownerWithPost } from '../test/social';

/**
 * Broken object-level authorization (OWASP API1), route by route. Every route that takes the id of
 * somebody else's object is called as a guest, then as a signed-in stranger who owns a business of
 * their own (so a "you have no business" 4xx cannot hide a missing ownership check). Neither may
 * read or change it; the rows must be untouched afterwards. The owner then proves each case aimed
 * at a real object, so a pass is not just a 404 on a typo.
 */

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
interface Case {
  name: string;
  method: Method;
  url: () => string;
  body?: () => object;
  /** Sent as the Idempotency-Key header (the REST send route requires one). */
  key?: string;
  /** Reads that the owner may repeat; writes are only checked for the stranger's failure. */
  ownerOk?: number[];
}

let ctx: TestContext;
let refs: ReferenceData;
let owner: MobileSession;
let buyer: MobileSession;
let stranger: MobileSession;
type Fixture =
  | 'business'
  | 'post'
  | 'product'
  | 'service'
  | 'published'
  | 'comment'
  | 'thread'
  | 'message'
  | 'attachment'
  | 'upload'
  | 'enquiry'
  | 'requirement';
const store: Partial<Record<Fixture, string>> = {};
/** Fixture ids by name; reading one that was never set is a bug in the test. */
const ids = new Proxy(store, {
  get: (target, name: Fixture) => {
    const value = target[name];
    if (value === undefined) throw new Error(`no fixture ${name}`);
    return value;
  },
}) as Record<Fixture, string>;

beforeAll(async () => {
  ctx = await createTestApp();
  await resetState();
  refs = await referenceData();

  const withPost = await ownerWithPost(ctx, refs);
  owner = withPost.session;
  ids.business = withPost.business.id;
  ids.post = withPost.postId;
  buyer = await registerMobile(ctx);
  stranger = (await signUpOwner(ctx, refs, { name: 'Stranger Traders' })).session;

  const product = await call(ctx, 'POST', '/v1/me/business/products', {
    as: owner,
    body: productBody(refs),
  });
  ids.product = product.json<{ id: string }>().id;
  const service = await call(ctx, 'POST', '/v1/me/business/services', {
    as: owner,
    body: serviceBody(refs),
  });
  ids.service = service.json<{ id: string }>().id;
  ids.published = await publishedProduct(ids.business, refs);

  const comment = await call(ctx, 'POST', `/v1/posts/${ids.post}/comments`, {
    as: buyer,
    body: { body: 'Nice work' },
  });
  ids.comment = comment.json<{ id: string }>().id;

  ids.thread = await openThread(ctx, buyer, ids.business);
  const attachment = await chatUpload(buyer.user.id);
  const message = await sendText(ctx, buyer, ids.thread, 'Photo attached', randomUUID(), {
    type: 'image',
    attachmentIds: [attachment],
  });
  const sent = message.json<{ id: string; attachments?: { id: string }[] }>();
  ids.message = sent.id;
  ids.attachment = sent.attachments?.[0]?.id ?? attachment;

  const upload = await prisma.upload.create({
    data: {
      userId: buyer.user.id,
      purpose: 'listing',
      key: `public/listing/${randomUUID()}`,
      contentType: 'image/jpeg',
      sizeBytes: 100,
    },
  });
  ids.upload = upload.id;

  const enquiry = await postWithKey(ctx, buyer, '/v1/enquiries', {
    productId: ids.published,
    message: 'Need 500 pieces, price please?',
  });
  ids.enquiry = enquiry.json<{ id: string }>().id;

  const requirement = await call(ctx, 'POST', '/v1/buyer-requirements', {
    as: buyer,
    body: {
      description: 'Looking for 500 mild steel bolts, grade 8.8, delivered to Mumbai.',
      categoryId: refs.category.id,
      quantity: 500,
      unit: 'piece',
      deliveryCityId: refs.mumbai.id,
    },
  });
  ids.requirement = requirement.json<{ id: string }>().id;
});
afterAll(async () => {
  await ctx.app.close();
});

const CASES: Case[] = [
  {
    name: 'edit a product',
    method: 'PATCH',
    url: () => `/v1/me/business/products/${ids.product}`,
    body: () => ({ title: 'Hijacked' }),
  },
  {
    name: 'delete a product',
    method: 'DELETE',
    url: () => `/v1/me/business/products/${ids.product}`,
  },
  {
    name: 'edit a service',
    method: 'PATCH',
    url: () => `/v1/me/business/services/${ids.service}`,
    body: () => ({ title: 'Hijacked' }),
  },
  {
    name: 'delete a service',
    method: 'DELETE',
    url: () => `/v1/me/business/services/${ids.service}`,
  },
  {
    name: 'edit a post',
    method: 'PATCH',
    url: () => `/v1/me/business/posts/${ids.post}`,
    body: () => ({ body: 'Hijacked' }),
  },
  { name: 'delete a post', method: 'DELETE', url: () => `/v1/me/business/posts/${ids.post}` },
  {
    name: "delete someone else's comment",
    method: 'DELETE',
    url: () => `/v1/comments/${ids.comment}`,
  },
  {
    name: 'read a thread',
    method: 'GET',
    url: () => `/v1/conversations/${ids.thread}/messages`,
    ownerOk: [200],
  },
  {
    name: 'write into a thread',
    method: 'POST',
    url: () => `/v1/conversations/${ids.thread}/messages`,
    body: () => ({ type: 'text', body: 'hi' }),
    key: randomUUID(),
  },
  {
    name: 'mark a thread read',
    method: 'POST',
    url: () => `/v1/conversations/${ids.thread}/read`,
    body: () => ({ messageId: ids.message }),
  },
  {
    name: 'mute a thread',
    method: 'PATCH',
    url: () => `/v1/conversations/${ids.thread}`,
    body: () => ({ muted: true }),
  },
  { name: 'delete a message', method: 'DELETE', url: () => `/v1/messages/${ids.message}` },
  {
    name: 'open a private chat attachment',
    method: 'GET',
    url: () => `/v1/attachments/${ids.attachment}`,
    ownerOk: [302],
  },
  {
    name: "complete someone else's upload",
    method: 'POST',
    url: () => `/v1/uploads/${ids.upload}/complete`,
  },
  {
    name: "close someone else's enquiry",
    method: 'PATCH',
    url: () => `/v1/me/business/enquiries/${ids.enquiry}`,
    body: () => ({ status: 'closed' }),
  },
  {
    name: 'read a requirement',
    method: 'GET',
    url: () => `/v1/buyer-requirements/${ids.requirement}`,
    ownerOk: [200],
  },
  {
    name: 'close a requirement',
    method: 'PATCH',
    url: () => `/v1/buyer-requirements/${ids.requirement}`,
    body: () => ({ status: 'closed' }),
  },
  {
    name: "read a requirement's quotes",
    method: 'GET',
    url: () => `/v1/buyer-requirements/${ids.requirement}/quotes`,
    ownerOk: [200],
  },
];

const as = (who: MobileSession | null, c: Case) =>
  ctx.app.inject({
    method: c.method,
    url: c.url(),
    headers: {
      ...(who ? { authorization: `Bearer ${who.accessToken}` } : {}),
      ...(c.key ? { 'idempotency-key': c.key } : {}),
    },
    remoteAddress: `10.7.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250) + 1}`,
    ...(c.body ? { payload: c.body() } : {}),
  });

describe('object-level authorization', () => {
  it.each(CASES)('guest cannot $name', async (c) => {
    expect((await as(null, c)).statusCode).toBe(401);
  });

  it.each(CASES)('a stranger cannot $name', async (c) => {
    const response = await as(stranger, c);
    expect(response.statusCode, response.body).toBeGreaterThanOrEqual(403);
    expect(response.statusCode, response.body).toBeLessThanOrEqual(404);
    // Never echoes the object, or even confirms it exists differently from a missing one.
    expect(response.body).not.toContain(ids.product);
  });

  it('left every object exactly as it was', async () => {
    expect(
      await prisma.product.count({
        where: { id: ids.product, title: { not: 'Hijacked' }, deletedAt: null },
      }),
    ).toBe(1);
    expect(
      await prisma.service.count({
        where: { id: ids.service, title: { not: 'Hijacked' }, deletedAt: null },
      }),
    ).toBe(1);
    expect(await prisma.post.count({ where: { id: ids.post, body: { not: 'Hijacked' } } })).toBe(1);
    expect(await prisma.comment.count({ where: { id: ids.comment, deletedAt: null } })).toBe(1);
    expect(await prisma.message.count({ where: { id: ids.message } })).toBe(1);
    expect(await prisma.upload.findUnique({ where: { id: ids.upload } })).toMatchObject({
      status: 'pending',
    });
    expect(await prisma.enquiry.findUnique({ where: { id: ids.enquiry } })).not.toMatchObject({
      status: 'closed',
    });
    expect(
      await prisma.buyerRequirement.findUnique({ where: { id: ids.requirement } }),
    ).toMatchObject({ status: 'open' });
  });

  it.each(CASES.filter((c) => c.ownerOk))('the rightful party can $name', async (c) => {
    const who = c.url().includes('buyer-requirements')
      ? buyer
      : c.name.includes('thread')
        ? owner
        : buyer;
    const response = await as(who, c);
    expect(c.ownerOk, response.body).toContain(response.statusCode);
  });

  it('the stranger is also refused an enquiry or thread as someone else', async () => {
    // They may open their own thread with the business, but not read the buyer's.
    const own = await openThread(ctx, stranger, ids.business);
    expect(own).not.toBe(ids.thread);
    const read = await call(ctx, 'GET', `/v1/conversations/${ids.thread}/messages`, {
      as: stranger,
    });
    expect([403, 404]).toContain(read.statusCode);
  });
});
