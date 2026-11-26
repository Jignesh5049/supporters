import { randomUUID } from 'node:crypto';
import { REFERRAL, ReferralReason, ReferralStatus } from '@supporters/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { call } from '../../test/catalog';
import {
  type TestContext,
  createTestApp,
  nextPhone,
  prisma,
  problemCode,
  registerMobile,
  resetState,
} from '../../test/helpers';
import { drainOutbox, inboxOf } from '../../test/notifications';
import {
  DAY,
  TestClock,
  codeOf,
  emitPremium,
  ledgerOf,
  referralsWith,
  referrerWithReferred,
  registerWithCode,
} from '../../test/wallet';

let ctx: TestContext;
let clock: TestClock;

beforeAll(async () => {
  ctx = await createTestApp();
});
afterAll(async () => {
  await ctx.app.close();
});
beforeEach(async () => {
  await resetState();
  clock = new TestClock();
});

const referralOf = (referredUserId: string) =>
  prisma.referral.findUniqueOrThrow({ where: { referredUserId } });

/** Delivers the Premium event through the fan-out, as the worker does. */
const deliver = (referrals = referralsWith(ctx, clock)) => drainOutbox(clock.now, referrals);

describe('referral codes', () => {
  it('gives every user one short unguessable code, the same on every call', async () => {
    const user = await registerMobile(ctx);
    const first = await codeOf(ctx, user);
    expect(first).toMatch(/^[2-9A-HJKMNP-Z]{8}$/);
    expect(await codeOf(ctx, user)).toBe(first);
    const other = await registerMobile(ctx);
    expect(await codeOf(ctx, other)).not.toBe(first);
  });

  it('accepts the code in any case and records a pending referral', async () => {
    const referrer = await registerMobile(ctx);
    const code = await codeOf(ctx, referrer);
    const { response, userId } = await registerWithCode(ctx, code.toLowerCase());
    expect(response.statusCode).toBe(201);
    const referral = await referralOf(userId ?? '');
    expect(referral).toMatchObject({
      referrerUserId: referrer.user.id,
      status: 'pending',
      reason: ReferralReason.AwaitingPremium,
    });
  });

  it('refuses an unknown code before the OTP is spent, so the user can fix the typo', async () => {
    const bad = await registerWithCode(ctx, 'ZZZZZZZZ');
    expect(bad.response.statusCode).toBe(400);
    expect(problemCode(bad.response)).toBe('VALIDATION_FAILED');
    expect(await prisma.user.count({ where: { phone: bad.phone } })).toBe(0);
    expect(await prisma.otpCode.count({ where: { consumedAt: { not: null } } })).toBe(0);
  });

  it('rejects a malformed code at the schema', async () => {
    const { response } = await registerWithCode(ctx, 'abc');
    expect(response.statusCode).toBe(400);
  });

  it('signs up fine without a code, and a code cannot be added to an existing account', async () => {
    const { response } = await registerWithCode(ctx, undefined);
    expect(response.statusCode).toBe(201);
    expect(await prisma.referral.count()).toBe(0);
    const user = await registerMobile(ctx);
    const patch = await call(ctx, 'PATCH', '/v1/me', {
      as: user,
      body: { referralCode: 'ABCDEFGH' },
    });
    expect(patch.statusCode).toBeGreaterThanOrEqual(400);
    expect(await prisma.referral.count()).toBe(0);
  });
});

describe('lifecycle', () => {
  it('stays pending until Premium, holds 7 days, then credits ₹300', async () => {
    const { referrer, referred } = await referrerWithReferred(ctx, 1);
    const referredId = referred[0] ?? '';
    const service = referralsWith(ctx, clock);

    // No Premium yet: nothing to finalize, even much later.
    clock.advance(30 * DAY);
    expect(await service.finalizeDue()).toEqual({ credited: 0, ineligible: 0 });

    const activatedAt = new Date(clock.current);
    await emitPremium('premium.activated', referredId, activatedAt);
    await deliver(service);
    let referral = await referralOf(referredId);
    expect(referral.status).toBe('pending');
    expect(referral.reason).toBe(ReferralReason.RefundWindow);
    expect(referral.eligibleAt?.toISOString()).toBe(
      new Date(activatedAt.getTime() + REFERRAL.pendingDays * DAY).toISOString(),
    );

    // One millisecond short of 7 days: still pending.
    clock.advance(REFERRAL.pendingDays * DAY - 1);
    expect(await service.finalizeDue()).toEqual({ credited: 0, ineligible: 0 });
    expect(await ledgerOf(referrer.user.id)).toHaveLength(0);

    clock.advance(1);
    expect(await service.finalizeDue()).toEqual({ credited: 1, ineligible: 0 });
    referral = await referralOf(referredId);
    expect(referral).toMatchObject({ status: 'successful', reason: ReferralReason.Credited });
    const ledger = await ledgerOf(referrer.user.id);
    expect(ledger).toHaveLength(1);
    expect(ledger[0]).toMatchObject({ type: 'referral_reward', amountPaise: 30_000n });

    const wallet = await call(ctx, 'GET', '/v1/me/wallet', { as: referrer });
    expect(wallet.json()).toMatchObject({
      balance: { amountPaise: 30_000, currency: 'INR' },
      lifetimeEarned: { amountPaise: 30_000 },
    });

    // The referrer hears about it twice: pending, then credited.
    await deliver(service);
    const types = (await inboxOf(referrer.user.id))
      .map((n) => n.type)
      .filter((t) => t.startsWith('referral.'))
      .sort();
    expect(types).toEqual(['referral.credited', 'referral.pending']);
  });

  it('pays ₹300, then ₹200, then ₹0, and never more than ₹500', async () => {
    const { referrer, referred } = await referrerWithReferred(ctx, 4);
    const service = referralsWith(ctx, clock);
    for (const id of referred) {
      await emitPremium('premium.activated', id, clock.current);
      clock.advance(1_000);
    }
    await deliver(service);
    clock.advance(REFERRAL.pendingDays * DAY);
    await service.finalizeDue();

    const rewards = (await ledgerOf(referrer.user.id)).map((e) => Number(e.amountPaise));
    expect(rewards).toEqual([30_000, 20_000]);
    const rows = await prisma.referral.findMany({
      where: { referrerUserId: referrer.user.id },
      orderBy: { eligibleAt: 'asc' },
    });
    expect(rows.map((r) => [r.status, r.reason, Number(r.rewardPaise)])).toEqual([
      ['successful', 'credited', 30_000],
      ['successful', 'credited', 20_000],
      ['successful', 'cap_reached', 0],
      ['successful', 'cap_reached', 0],
    ]);

    const overview = await call(ctx, 'GET', '/v1/me/referrals', { as: referrer });
    expect(overview.json()).toMatchObject({
      stats: {
        successful: 4,
        pending: 0,
        totalEarned: { amountPaise: 50_000 },
        remainingToCap: { amountPaise: 0 },
      },
    });
  });

  it('never goes above the cap even if the ledger already holds rewards (bonus-free, integer paise)', async () => {
    const { referrer, referred } = await referrerWithReferred(ctx, 1);
    // A hand-made ₹400 reward leaves room for only ₹100 of the scheduled ₹300.
    await prisma.walletLedger.create({
      data: {
        userId: referrer.user.id,
        type: 'referral_reward',
        amountPaise: 40_000n,
        entryKey: `seed:${randomUUID()}`,
        description: 'seed',
      },
    });
    const service = referralsWith(ctx, clock);
    await emitPremium('premium.activated', referred[0] ?? '', clock.current);
    await deliver(service);
    clock.advance(REFERRAL.pendingDays * DAY);
    await service.finalizeDue();
    const total = (await ledgerOf(referrer.user.id)).reduce((s, e) => s + e.amountPaise, 0n);
    expect(total).toBe(50_000n);
  });

  it('credits once however often the event or the job is delivered, even concurrently', async () => {
    const { referrer, referred } = await referrerWithReferred(ctx, 1);
    const service = referralsWith(ctx, clock);
    const referredId = referred[0] ?? '';
    await emitPremium('premium.activated', referredId, clock.current);
    await deliver(service);
    // A second delivery of the same event, as a retried job would do.
    const event = await prisma.outboxEvent.findFirstOrThrow({
      where: { type: 'premium.activated' },
    });
    await prisma.outboxEvent.update({ where: { id: event.id }, data: { processedAt: null } });
    await deliver(service);
    // And a duplicate event from the Premium side (a webhook retried): still one window.
    await emitPremium('premium.activated', referredId, new Date(clock.current.getTime() + DAY));
    await deliver(service);
    const referral = await referralOf(referredId);
    expect(referral.premiumActivatedAt?.toISOString()).toBe(clock.current.toISOString());

    clock.advance(REFERRAL.pendingDays * DAY);
    await Promise.all([
      referralsWith(ctx, clock).finalizeDue(),
      referralsWith(ctx, clock).finalizeDue(),
      referralsWith(ctx, clock).finalizeDue(),
    ]);
    expect(await ledgerOf(referrer.user.id)).toHaveLength(1);
    await referralsWith(ctx, clock).finalizeDue();
    expect(await ledgerOf(referrer.user.id)).toHaveLength(1);
  });

  it('turns Ineligible when the payment is refunded inside the window, and keeps the reward after it', async () => {
    const { referrer, referred } = await referrerWithReferred(ctx, 2);
    const service = referralsWith(ctx, clock);
    const [first = '', second = ''] = referred;
    const firstPayment = await emitPremium('premium.activated', first, clock.current);
    const secondPayment = await emitPremium('premium.activated', second, clock.current);
    await deliver(service);

    clock.advance(3 * DAY);
    await emitPremium('premium.refunded', first, clock.current, firstPayment);
    await deliver(service);
    expect(await referralOf(first)).toMatchObject({
      status: 'ineligible',
      reason: ReferralReason.PaymentRefunded,
    });

    clock.advance(4 * DAY);
    await service.finalizeDue();
    expect(await referralOf(second)).toMatchObject({ status: 'successful' });
    expect((await ledgerOf(referrer.user.id)).map((e) => Number(e.amountPaise))).toEqual([30_000]);

    // A refund after the window does not claw the reward back.
    await emitPremium('premium.refunded', second, clock.current, secondPayment);
    await deliver(service);
    expect(await referralOf(second)).toMatchObject({ status: 'successful' });
    expect(await ledgerOf(referrer.user.id)).toHaveLength(1);

    // A refund of some other payment does not touch a pending referral either.
    const { referred: third } = await referrerWithReferred(ctx, 1);
    await emitPremium('premium.activated', third[0] ?? '', clock.current);
    await deliver(service);
    await emitPremium('premium.refunded', third[0] ?? '', clock.current, randomUUID());
    await deliver(service);
    expect((await referralOf(third[0] ?? '')).status).toBe('pending');
  });

  it('is Ineligible when either account is suspended at the end of the window', async () => {
    const { referrer, referred } = await referrerWithReferred(ctx, 1);
    const service = referralsWith(ctx, clock);
    await emitPremium('premium.activated', referred[0] ?? '', clock.current);
    await deliver(service);
    await prisma.user.update({ where: { id: referred[0] ?? '' }, data: { status: 'suspended' } });
    clock.advance(REFERRAL.pendingDays * DAY);
    expect(await service.finalizeDue()).toEqual({ credited: 0, ineligible: 1 });
    expect(await referralOf(referred[0] ?? '')).toMatchObject({
      status: 'ineligible',
      reason: ReferralReason.AccountSuspended,
    });
    expect(await ledgerOf(referrer.user.id)).toHaveLength(0);
  });

  it('fails a referral whose business never buys Premium', async () => {
    const { referred } = await referrerWithReferred(ctx, 1);
    const service = referralsWith(ctx, clock);
    // Rows are stamped by the database clock; line it up with the test clock.
    await prisma.referral.updateMany({ data: { createdAt: clock.current } });
    clock.advance((REFERRAL.awaitingPremiumDays - 1) * DAY);
    expect(await service.failStale()).toBe(0);
    clock.advance(2 * DAY);
    expect(await service.failStale()).toBe(1);
    expect(await referralOf(referred[0] ?? '')).toMatchObject({
      status: ReferralStatus.Failed,
      reason: ReferralReason.NeverPurchased,
    });
  });

  it('ignores Premium events for users nobody referred', async () => {
    const stranger = await registerMobile(ctx);
    await emitPremium('premium.activated', stranger.user.id, clock.current);
    await expect(deliver()).resolves.toBeDefined();
    expect(await prisma.referral.count()).toBe(0);
  });
});

describe('fraud checks', () => {
  const makeUser = (phone = nextPhone()) =>
    prisma.user.create({ data: { name: 'Test User', phone, passwordHash: 'x' } });

  const signup = async (
    referrerId: string,
    referredId: string,
    phone: string,
    signals: { deviceKey: string | null; attestationPassed: boolean | null } = {
      deviceKey: null,
      attestationPassed: null,
    },
  ) => {
    await prisma.$transaction((tx) =>
      referralsWith(ctx, clock).recordSignup(tx, {
        referrerUserId: referrerId,
        referredUserId: referredId,
        phone,
        ip: '10.9.9.9',
        signals,
      }),
    );
    return referralOf(referredId);
  };

  it('marks a self-referral Ineligible', async () => {
    const user = await makeUser();
    expect(await signup(user.id, user.id, user.phone)).toMatchObject({
      status: 'ineligible',
      reason: ReferralReason.SelfReferral,
    });
  });

  it('marks a phone number that was already referred Ineligible', async () => {
    const referrer = await makeUser();
    const phone = nextPhone();
    const earlier = await makeUser(nextPhone());
    expect((await signup(referrer.id, earlier.id, phone)).status).toBe('pending');
    // The same number signs up again as a new account.
    const again = await makeUser(nextPhone());
    expect(await signup(referrer.id, again.id, phone)).toMatchObject({
      status: 'ineligible',
      reason: ReferralReason.PhoneReused,
    });
  });

  it('marks a reused device, and the referrer’s own device, Ineligible', async () => {
    const referrer = await makeUser();
    const a = await makeUser();
    const b = await makeUser();
    const c = await makeUser();
    const signals = (deviceKey: string) => ({ deviceKey, attestationPassed: true });
    expect((await signup(referrer.id, a.id, nextPhone(), signals('device-1'))).status).toBe(
      'pending',
    );
    expect(await signup(referrer.id, b.id, nextPhone(), signals('device-1'))).toMatchObject({
      status: 'ineligible',
      reason: ReferralReason.DeviceReused,
    });
    // The referrer was themselves referred from device-9; a new account from device-9 is theirs.
    const root = await makeUser();
    await signup(root.id, referrer.id, nextPhone(), signals('device-9'));
    expect(await signup(referrer.id, c.id, nextPhone(), signals('device-9'))).toMatchObject({
      status: 'ineligible',
      reason: ReferralReason.SelfReferral,
    });
  });

  it('blocks the reward when device attestation failed', async () => {
    const referrer = await makeUser();
    const referred = await makeUser();
    expect(
      await signup(referrer.id, referred.id, nextPhone(), {
        deviceKey: null,
        attestationPassed: false,
      }),
    ).toMatchObject({ status: 'ineligible', reason: ReferralReason.AttestationFailed });
    // Ineligible referrals never reach the finalizer.
    clock.advance(30 * DAY);
    expect(await referralsWith(ctx, clock).finalizeDue()).toEqual({ credited: 0, ineligible: 0 });
  });

  it('tells the referrer, in generic words, that a referral did not qualify', async () => {
    const referrer = await registerMobile(ctx);
    const referred = await makeUser();
    await signup(referrer.user.id, referred.id, nextPhone(), {
      deviceKey: null,
      attestationPassed: false,
    });
    await deliver();
    const [note] = await inboxOf(referrer.user.id);
    expect(note?.type).toBe('referral.ineligible');
  });
});

describe('who can see what', () => {
  it('shows each user only their own referrals, and no contact details', async () => {
    const { referrer } = await referrerWithReferred(ctx, 2);
    const other = await registerMobile(ctx);
    const mine = await call(ctx, 'GET', '/v1/me/referrals', { as: referrer });
    const theirs = await call(ctx, 'GET', '/v1/me/referrals', { as: other });
    expect(mine.json<{ data: unknown[] }>().data).toHaveLength(2);
    expect(theirs.json<{ data: unknown[] }>().data).toHaveLength(0);
    expect(mine.body).not.toMatch(/\+91\d{10}/);
    expect(mine.json<{ data: { referredName: string }[] }>().data[0]?.referredName).toBe('Ravi K.');
    expect(mine.headers['cache-control']).toBe('no-store');
  });

  it('pages the history with a cursor', async () => {
    const { referrer } = await referrerWithReferred(ctx, 3);
    const first = await call(ctx, 'GET', '/v1/me/referrals?limit=2', { as: referrer });
    const page = first.json<{ data: { id: string }[]; nextCursor: string | null }>();
    expect(page.data).toHaveLength(2);
    const next = await call(ctx, 'GET', `/v1/me/referrals?limit=2&cursor=${page.nextCursor}`, {
      as: referrer,
    });
    const rest = next.json<{ data: { id: string }[]; nextCursor: string | null }>();
    expect(rest.data).toHaveLength(1);
    expect(rest.nextCursor).toBeNull();
  });

  it('answers guests with 401 on every referral and wallet route', async () => {
    for (const url of ['/v1/me/referrals', '/v1/me/wallet', '/v1/me/wallet/ledger']) {
      expect((await call(ctx, 'GET', url)).statusCode, url).toBe(401);
    }
  });
});

describe('the ledger', () => {
  const entry = (userId: string, over: object = {}) => ({
    userId,
    type: 'bonus' as const,
    amountPaise: 10_000n,
    entryKey: `t:${randomUUID()}`,
    description: 'test',
    ...over,
  });

  it('refuses UPDATE and DELETE at the database, even for the application role', async () => {
    const user = await registerMobile(ctx);
    const row = await prisma.walletLedger.create({ data: entry(user.user.id) });
    await expect(
      prisma.walletLedger.update({ where: { id: row.id }, data: { amountPaise: 1n } }),
    ).rejects.toThrow(/append-only/);
    await expect(prisma.walletLedger.delete({ where: { id: row.id } })).rejects.toThrow(
      /append-only/,
    );
    await expect(prisma.walletLedger.deleteMany()).rejects.toThrow(/append-only/);
    await expect(
      prisma.$executeRaw`UPDATE wallet_ledger SET description = 'x' WHERE id = ${row.id}::uuid`,
    ).rejects.toThrow(/append-only/);
    expect(await prisma.walletLedger.count()).toBe(1);
  });

  it('refuses a zero entry and a credit with the wrong sign', async () => {
    const user = await registerMobile(ctx);
    await expect(
      prisma.walletLedger.create({ data: entry(user.user.id, { amountPaise: 0n }) }),
    ).rejects.toThrow();
    await expect(
      prisma.walletLedger.create({ data: entry(user.user.id, { amountPaise: -5n }) }),
    ).rejects.toThrow();
    await expect(
      prisma.walletLedger.create({
        data: entry(user.user.id, { type: 'withdrawal', amountPaise: 5n }),
      }),
    ).rejects.toThrow();
  });

  it('refuses a second entry with the same key', async () => {
    const user = await registerMobile(ctx);
    const data = entry(user.user.id);
    await prisma.walletLedger.create({ data });
    await expect(prisma.walletLedger.create({ data })).rejects.toThrow();
  });

  it('lists a user’s entries newest first, and nobody else’s', async () => {
    const user = await registerMobile(ctx);
    const other = await registerMobile(ctx);
    await prisma.walletLedger.createMany({
      data: [entry(user.user.id), entry(user.user.id), entry(other.user.id)],
    });
    const response = await call(ctx, 'GET', '/v1/me/wallet/ledger', { as: user });
    const body = response.json<{ data: { id: string; amount: { amountPaise: number } }[] }>();
    expect(body.data).toHaveLength(2);
    expect((body.data[0]?.id ?? '') > (body.data[1]?.id ?? '')).toBe(true);
    const wallet = await call(ctx, 'GET', '/v1/me/wallet', { as: user });
    expect(wallet.json()).toMatchObject({ balance: { amountPaise: 20_000 } });
  });

  it('audits every credit with the amount and the referral', async () => {
    const { referrer, referred } = await referrerWithReferred(ctx, 1);
    const service = referralsWith(ctx, clock);
    await emitPremium('premium.activated', referred[0] ?? '', clock.current);
    await deliver(service);
    clock.advance(REFERRAL.pendingDays * DAY);
    await service.finalizeDue();
    const audit = await prisma.auditLog.findFirstOrThrow({
      where: { action: 'wallet.referral_credit' },
    });
    expect(audit).toMatchObject({ actorUserId: referrer.user.id, targetType: 'referral' });
    expect(audit.metadata).toMatchObject({ amountPaise: 30_000, actorKind: 'system' });
  });
});
