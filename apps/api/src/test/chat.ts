import { randomUUID } from 'node:crypto';
import type { LightMyRequestResponse } from 'fastify';
import { type ReferenceData, call, signUpOwner } from './catalog';
import { type MobileSession, type TestContext, prisma, registerMobile } from './helpers';

/** A ready `chat` upload row, inserted directly: a JPEG image or a PDF. */
export async function chatUpload(userId: string, kind: 'image' | 'pdf' = 'image') {
  const upload = await prisma.upload.create({
    data: {
      userId,
      purpose: 'chat',
      key: `chat/${randomUUID()}`,
      contentType: kind === 'pdf' ? 'application/pdf' : 'image/jpeg',
      sizeBytes: 1_024,
      status: 'ready',
    },
  });
  return upload.id;
}

/** A published product, inserted directly. */
export async function publishedProduct(businessId: string, refs: ReferenceData, title = 'Bolts') {
  const product = await prisma.product.create({
    data: {
      businessId,
      categoryId: refs.category.id,
      title,
      description: 'Seeded',
      status: 'published',
      publishedAt: new Date(),
    },
  });
  return product.id;
}

/** A business owner with one published product, plus a buyer with no business. */
export async function ownerAndBuyer(ctx: TestContext, refs: ReferenceData) {
  const { session: owner, business } = await signUpOwner(ctx, refs);
  const buyer = await registerMobile(ctx);
  const productId = await publishedProduct(business.id, refs);
  return { owner, business, buyer, productId };
}

/** Opens the thread as `as` and returns its id. */
export async function openThread(ctx: TestContext, as: MobileSession, businessId: string) {
  const response = await call(ctx, 'POST', '/v1/conversations', { as, body: { businessId } });
  if (response.statusCode !== 201 && response.statusCode !== 200) {
    throw new Error(`open failed: ${response.body}`);
  }
  return response.json<{ id: string }>().id;
}

/** Sends a REST message with a fresh Idempotency-Key unless one is given. */
export function sendText(
  ctx: TestContext,
  as: MobileSession,
  conversationId: string,
  body = 'Hello there',
  key: string = randomUUID(),
  extra: object = {},
): Promise<LightMyRequestResponse> {
  return ctx.app.inject({
    method: 'POST',
    url: `/v1/conversations/${conversationId}/messages`,
    headers: { authorization: `Bearer ${as.accessToken}`, 'idempotency-key': key },
    payload: { type: 'text', body, ...extra },
    remoteAddress: `10.9.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250) + 1}`,
  });
}

/** POST with an Idempotency-Key header. */
export function postWithKey(
  ctx: TestContext,
  as: MobileSession,
  url: string,
  body: object,
  key: string = randomUUID(),
): Promise<LightMyRequestResponse> {
  return ctx.app.inject({
    method: 'POST',
    url,
    headers: { authorization: `Bearer ${as.accessToken}`, 'idempotency-key': key },
    payload: body,
    remoteAddress: `10.8.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250) + 1}`,
  });
}
