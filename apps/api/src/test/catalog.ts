import type { LightMyRequestResponse } from 'fastify';
import { type MobileSession, type TestContext, nextIp, prisma, registerMobile } from './helpers';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** Calls the API as a guest (no token) or as a mobile session. */
export function call(
  ctx: TestContext,
  method: Method,
  url: string,
  options: { as?: MobileSession; body?: object } = {},
): Promise<LightMyRequestResponse> {
  return ctx.app.inject({
    method,
    url,
    headers: options.as ? { authorization: `Bearer ${options.as.accessToken}` } : {},
    remoteAddress: nextIp(),
    ...(options.body !== undefined ? { payload: options.body } : {}),
  });
}

/** Seeded reference rows: a category with a subcategory, a second category, and cities. */
export async function referenceData() {
  const [category, otherCategory] = await prisma.category.findMany({
    where: { parentId: null },
    orderBy: { position: 'asc' },
    take: 2,
    include: { children: { take: 1 } },
  });
  const [mumbai, pune] = await prisma.city.findMany({
    where: { name: { in: ['Mumbai', 'Pune'] } },
    orderBy: { name: 'asc' },
  });
  const gujarat = await prisma.state.findUniqueOrThrow({ where: { code: 'GJ' } });
  const subcategory = category?.children[0];
  if (!category || !otherCategory || !subcategory || !mumbai || !pune) {
    throw new Error('reference data missing; check prisma/reference-data.ts');
  }
  return { category, subcategory, otherCategory, mumbai, pune, gujarat };
}

export type ReferenceData = Awaited<ReturnType<typeof referenceData>>;

export const businessBody = (refs: ReferenceData, overrides: object = {}) => ({
  name: 'Asha Traders',
  type: 'wholesaler',
  categoryId: refs.category.id,
  cityId: refs.mumbai.id,
  ...overrides,
});

/** A signed-in mobile user who owns a business. */
export async function signUpOwner(ctx: TestContext, refs: ReferenceData, overrides: object = {}) {
  const session = await registerMobile(ctx);
  const response = await call(ctx, 'POST', '/v1/me/business', {
    as: session,
    body: businessBody(refs, overrides),
  });
  if (response.statusCode !== 201) throw new Error(`create business failed: ${response.body}`);
  return { session, business: response.json<{ id: string; slug: string }>() };
}

export const productBody = (refs: ReferenceData, overrides: object = {}) => ({
  title: 'M8 steel bolts',
  categoryId: refs.subcategory.id,
  description: 'Zinc-plated, grade 8.8.',
  ...overrides,
});

export const serviceBody = (refs: ReferenceData, overrides: object = {}) => ({
  title: 'CNC machining',
  categoryId: refs.otherCategory.id,
  description: 'Short runs, 3-axis.',
  ...overrides,
});

/** A ready upload row, inserted directly, for tests that only need something to attach. */
export async function readyUpload(
  userId: string,
  purpose: 'listing' | 'avatar' | 'cover' = 'listing',
) {
  const upload = await prisma.upload.create({
    data: {
      userId,
      purpose,
      key: `public/${purpose}/${crypto.randomUUID()}`,
      contentType: 'image/jpeg',
      sizeBytes: 1_024,
      status: 'ready',
    },
  });
  return upload.id;
}
