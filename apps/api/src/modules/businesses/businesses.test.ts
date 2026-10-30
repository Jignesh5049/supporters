import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  type ReferenceData,
  businessBody,
  call,
  referenceData,
  signUpOwner,
} from '../../test/catalog';
import {
  type TestContext,
  createTestApp,
  prisma,
  problemCode,
  registerBrowser,
  registerMobile,
  resetState,
} from '../../test/helpers';
import { slugify } from './businesses.service';

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

describe('reference data', () => {
  it('lists the two-level category tree, cached for an hour', async () => {
    const response = await call(ctx, 'GET', '/v1/categories');
    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('public, max-age=3600');
    const first = response.json().data[0];
    expect(first).toMatchObject({ id: refs.category.id, slug: refs.category.slug });
    expect(first.subcategories.length).toBeGreaterThan(0);
  });

  it('lists every state and union territory, and the cities of one', async () => {
    const states = await call(ctx, 'GET', '/v1/places/states');
    expect(states.json().data).toHaveLength(36);

    const cities = await call(ctx, 'GET', '/v1/places/cities?state=mh');
    expect(cities.statusCode).toBe(200);
    expect(cities.json().data).toContainEqual({
      id: refs.mumbai.id,
      name: 'Mumbai',
      stateCode: 'MH',
    });
  });

  it('rejects unknown or malformed state codes', async () => {
    expect(problemCode(await call(ctx, 'GET', '/v1/places/cities?state=ZZ'))).toBe(
      'VALIDATION_FAILED',
    );
    expect((await call(ctx, 'GET', '/v1/places/cities?state=MAH')).statusCode).toBe(400);
    expect((await call(ctx, 'GET', '/v1/places/cities')).statusCode).toBe(400);
  });
});

describe('POST /v1/me/business', () => {
  it('rejects guests', async () => {
    const response = await call(ctx, 'POST', '/v1/me/business', { body: businessBody(refs) });
    expect(response.statusCode).toBe(401);
  });

  it('creates the business with a slug from its name and the state from its city', async () => {
    const session = await registerMobile(ctx);
    const response = await call(ctx, 'POST', '/v1/me/business', {
      as: session,
      body: businessBody(refs, { subcategoryId: refs.subcategory.id, gstin: '27aapfu0939f1zv' }),
    });
    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      slug: 'asha-traders',
      name: 'Asha Traders',
      category: { id: refs.category.id },
      subcategory: { id: refs.subcategory.id },
      city: { id: refs.mumbai.id, stateCode: 'MH' },
      state: { code: 'MH' },
      gstin: '27AAPFU0939F1ZV',
      verificationStatus: 'none',
      isVerified: false,
      isPremium: false,
      publishedListings: 0,
      publishedListingsLimit: 25,
    });
    expect(response.json().profileCompletion).toBeGreaterThan(0);
  });

  it('allows one business per account', async () => {
    const { session } = await signUpOwner(ctx, refs);
    const response = await call(ctx, 'POST', '/v1/me/business', {
      as: session,
      body: businessBody(refs, { name: 'Second Shop' }),
    });
    expect(response.statusCode).toBe(409);
    expect(problemCode(response)).toBe('BUSINESS_EXISTS');
  });

  it('keeps slugs unique: generated ones get a suffix, chosen ones must be free', async () => {
    const first = await signUpOwner(ctx, refs);
    const second = await signUpOwner(ctx, refs);
    expect(first.business.slug).toBe('asha-traders');
    expect(second.business.slug).toMatch(/^asha-traders-[a-z0-9]+$/);

    const third = await registerMobile(ctx);
    const taken = await call(ctx, 'POST', '/v1/me/business', {
      as: third,
      body: businessBody(refs, { slug: 'asha-traders' }),
    });
    expect(taken.statusCode).toBe(409);
    expect(problemCode(taken)).toBe('SLUG_TAKEN');
  });

  it('rejects unknown references and a subcategory from another category', async () => {
    const session = await registerMobile(ctx);
    const cases = [
      { cityId: crypto.randomUUID() },
      { categoryId: refs.subcategory.id },
      { categoryId: refs.otherCategory.id, subcategoryId: refs.subcategory.id },
      { gstin: '27AAPFU0939F1ZA' },
      { verificationStatus: 'verified' },
      { premiumUntil: '2099-01-01T00:00:00.000Z' },
    ];
    for (const overrides of cases) {
      const response = await call(ctx, 'POST', '/v1/me/business', {
        as: session,
        body: businessBody(refs, overrides),
      });
      expect(response.statusCode, JSON.stringify(overrides)).toBe(400);
      expect(problemCode(response)).toBe('VALIDATION_FAILED');
    }
  });

  it('needs the CSRF token for cookie sessions', async () => {
    const { browser } = await registerBrowser(ctx);
    const body = businessBody(refs);
    const blocked = await browser.request({
      method: 'POST',
      url: '/v1/me/business',
      body,
      csrf: false,
    });
    expect(blocked.statusCode).toBe(403);
    const allowed = await browser.request({ method: 'POST', url: '/v1/me/business', body });
    expect(allowed.statusCode).toBe(201);
  });
});

describe('GET and PATCH /v1/me/business', () => {
  it('rejects guests', async () => {
    expect((await call(ctx, 'GET', '/v1/me/business')).statusCode).toBe(401);
    expect((await call(ctx, 'PATCH', '/v1/me/business', { body: {} })).statusCode).toBe(401);
  });

  it("returns 404 for a user without a business, and never another user's", async () => {
    await signUpOwner(ctx, refs);
    const stranger = await registerMobile(ctx);
    expect((await call(ctx, 'GET', '/v1/me/business', { as: stranger })).statusCode).toBe(404);
    const patch = await call(ctx, 'PATCH', '/v1/me/business', {
      as: stranger,
      body: { name: 'Hijacked' },
    });
    expect(patch.statusCode).toBe(404);
  });

  it('updates fields, clears optional ones and recomputes profile completion', async () => {
    const { session } = await signUpOwner(ctx, refs, { about: 'Bolts and nuts.' });
    const before = (await call(ctx, 'GET', '/v1/me/business', { as: session })).json();

    const response = await call(ctx, 'PATCH', '/v1/me/business', {
      as: session,
      body: {
        about: null,
        cityId: refs.pune.id,
        contactPerson: 'Asha Rao',
        contactPhone: '+912212345678',
        mapUrl: 'https://maps.app.goo.gl/abc',
        openingHours: [{ day: 'mon', opens: '09:30', closes: '18:00' }],
        socials: { instagram: 'https://instagram.com/asha' },
      },
    });
    expect(response.statusCode).toBe(200);
    const after = response.json();
    expect(after).toMatchObject({ about: null, city: { name: 'Pune' }, contactPerson: 'Asha Rao' });
    expect(after.profileCompletion).toBeGreaterThan(before.profileCompletion);
  });

  it('rejects a taken slug, and any slug change once verified', async () => {
    await signUpOwner(ctx, refs, { slug: 'taken-slug' });
    const { session, business } = await signUpOwner(ctx, refs);

    const taken = await call(ctx, 'PATCH', '/v1/me/business', {
      as: session,
      body: { slug: 'taken-slug' },
    });
    expect(problemCode(taken)).toBe('SLUG_TAKEN');

    const renamed = await call(ctx, 'PATCH', '/v1/me/business', {
      as: session,
      body: { slug: 'my-new-slug' },
    });
    expect(renamed.json().slug).toBe('my-new-slug');

    await prisma.business.update({
      where: { id: business.id },
      data: { verificationStatus: 'verified', verifiedAt: new Date() },
    });
    const locked = await call(ctx, 'PATCH', '/v1/me/business', {
      as: session,
      body: { slug: 'another-slug' },
    });
    expect(locked.statusCode).toBe(409);
    expect(problemCode(locked)).toBe('SLUG_LOCKED');
  });

  it('drops the verified badge when the name or GSTIN changes', async () => {
    const { session, business } = await signUpOwner(ctx, refs);
    await prisma.business.update({
      where: { id: business.id },
      data: { verificationStatus: 'verified', verifiedAt: new Date() },
    });
    const unchanged = await call(ctx, 'PATCH', '/v1/me/business', {
      as: session,
      body: { about: 'Still the same business.' },
    });
    expect(unchanged.json().verificationStatus).toBe('verified');

    const renamed = await call(ctx, 'PATCH', '/v1/me/business', {
      as: session,
      body: { name: 'Asha Traders Pvt Ltd' },
    });
    expect(renamed.json()).toMatchObject({ verificationStatus: 'none', isVerified: false });
  });
});

describe('GET /v1/businesses/:slug', () => {
  it('shows the public page, with contact details only when the owner shows them', async () => {
    const { session, business } = await signUpOwner(ctx, refs, {
      contactPhone: '+919876543210',
      contactEmail: 'sales@asha.example',
    });
    const hidden = await call(ctx, 'GET', `/v1/businesses/${business.slug}`);
    expect(hidden.statusCode).toBe(200);
    expect(hidden.json()).toMatchObject({ contactPhone: null, contactEmail: null });
    expect(hidden.json()).not.toHaveProperty('premiumUntil');
    expect(hidden.json()).not.toHaveProperty('verificationStatus');

    await call(ctx, 'PATCH', '/v1/me/business', { as: session, body: { isContactPublic: true } });
    const shown = await call(ctx, 'GET', `/v1/businesses/${business.slug}`);
    expect(shown.json()).toMatchObject({ contactPhone: '+919876543210' });
  });

  it('hides businesses of suspended accounts, and unknown slugs', async () => {
    const { session, business } = await signUpOwner(ctx, refs);
    await prisma.user.update({ where: { id: session.user.id }, data: { status: 'suspended' } });
    expect((await call(ctx, 'GET', `/v1/businesses/${business.slug}`)).statusCode).toBe(404);
    expect((await call(ctx, 'GET', '/v1/businesses/no-such-business')).statusCode).toBe(404);
  });
});

describe('slugify', () => {
  it('makes URL-safe slugs and falls back for non-Latin names', () => {
    expect(slugify('  Shrée Gaṇesh & Sons  ')).toBe('shree-ganesh-and-sons');
    expect(slugify('श्री गणेश')).toBe('business');
  });
});
