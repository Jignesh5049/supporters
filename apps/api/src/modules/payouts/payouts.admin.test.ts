import { createHmac, randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { relayOutbox } from '../../jobs/outbox-relay';
import { adminBrowser, enrolAdmin } from '../../test/admin';
import {
  type Browser,
  type MobileSession,
  type TestContext,
  createTestApp,
  prisma,
  problemCode,
  registerMobile,
  resetState,
} from '../../test/helpers';
import { drainOutbox, inboxOf } from '../../test/notifications';
import {
  BANK,
  PAYOUT_TEST_KEY,
  api,
  balanceOfUser,
  fund,
  payoutEnv,
  putAccount,
  readyUser,
} from '../../test/wallet';
import { PayoutProcessor } from './payout-processor';
import { FakePayouts } from './payouts.fake';
import { PayoutVault } from './payouts.vault';

const WEBHOOK_SECRET = 'whsec-test-secret-value-1234';

let ctx: TestContext;
let noSecret: TestContext;
let fake: FakePayouts;
let processor: PayoutProcessor;
let admin: Browser;
let clockMs = Date.now();

beforeAll(async () => {
  fake = new FakePayouts();
  ctx = await createTestApp({ ...payoutEnv, RAZORPAYX_WEBHOOK_SECRET: WEBHOOK_SECRET }, undefined, {
    payouts: fake,
  });
  noSecret = await createTestApp(payoutEnv, undefined, { payouts: fake });
  processor = new PayoutProcessor(
    prisma,
    { provider: fake, vault: new PayoutVault(PAYOUT_TEST_KEY) },
    () => new Date(clockMs),
  );
});
afterAll(async () => {
  await ctx.app.close();
  await noSecret.app.close();
});
beforeEach(async () => {
  await resetState();
  fake.payouts.clear();
  fake.createCalls.length = 0;
  fake.initialStatus = 'processing';
  fake.validation = (destination) => ({
    status: 'validated',
    registeredName: destination.holderName,
  });
  clockMs = Date.now();
  admin = await adminBrowser(ctx, await enrolAdmin());
});

const adminCall = (
  method: 'GET' | 'POST',
  url: string,
  body?: object,
  headers: Record<string, string> = {},
) => admin.request({ method, url, ...(body ? { body } : {}), headers });

const request = async (user: MobileSession, amountPaise = 20_000) => {
  const response = await api(ctx, 'POST', '/v1/me/withdrawals', user, {
    body: { amountPaise },
    key: randomUUID(),
  });
  expect(response.statusCode, response.body).toBe(201);
  return response.json<{ id: string }>().id;
};
const statusOf = async (id: string) =>
  (await prisma.withdrawal.findUniqueOrThrow({ where: { id } })).status;
const approve = (id: string) => adminCall('POST', `/v1/admin/withdrawals/${id}/approve`);

/** Runs every queued payout job, the way the worker's `payouts` queue would. */
async function runPayouts() {
  const events = await prisma.outboxEvent.findMany({
    where: { type: 'payout.requested', processedAt: null },
    orderBy: { id: 'asc' },
  });
  for (const event of events) await processor.process(event.id);
  return events.length;
}

const sign = (raw: string, secret = WEBHOOK_SECRET) =>
  createHmac('sha256', secret).update(raw).digest('hex');
function webhook(
  event: string,
  entity: object,
  options: {
    eventId?: string;
    secret?: string;
    createdAt?: number;
    app?: TestContext;
    entityKey?: string;
  } = {},
) {
  const raw = JSON.stringify({
    entity: 'event',
    event,
    created_at: options.createdAt ?? Math.floor(Date.now() / 1000),
    payload: { [options.entityKey ?? 'payout']: { entity } },
  });
  return (options.app ?? ctx).app.inject({
    method: 'POST',
    url: '/v1/webhooks/razorpayx',
    headers: {
      'content-type': 'application/json',
      'x-razorpay-signature': sign(raw, options.secret),
      'x-razorpay-event-id': options.eventId ?? `evt_${randomUUID()}`,
    },
    payload: raw,
  });
}

/** A ready user with an approved withdrawal whose payout exists at the (fake) provider. */
async function inFlight(paise = 50_000, amount = 20_000) {
  const user = await readyUser(ctx, paise);
  const id = await request(user, amount);
  expect((await approve(id)).statusCode).toBe(200);
  await runPayouts();
  const row = await prisma.withdrawal.findUniqueOrThrow({ where: { id } });
  return { user, id, payoutId: row.providerPayoutId ?? '' };
}

describe('the admin queue', () => {
  it('lists pending requests oldest first, with the name-match flag and a masked destination', async () => {
    const first = await readyUser(ctx);
    const mismatch = await registerMobile(ctx);
    await putAccount(ctx, mismatch, BANK, 'Suresh Patel');
    await prisma.$executeRaw`UPDATE payout_accounts SET created_at = created_at - interval '25 hours'`;
    await fund(mismatch.user.id, 30_000);
    const a = await request(first);
    const b = await request(mismatch, 10_000);

    const response = await adminCall('GET', '/v1/admin/withdrawals');
    expect(response.statusCode).toBe(200);
    const data = response.json<{
      data: {
        id: string;
        isNameMismatch: boolean;
        maskedDestination: string;
        holderName: string;
      }[];
    }>().data;
    expect(data.map((row) => row.id)).toEqual([a, b]);
    expect(data.map((row) => row.isNameMismatch)).toEqual([false, true]);
    expect(data[1]?.holderName).toBe('Suresh Patel');
    expect(response.body).not.toContain(BANK.accountNumber);
    expect(response.headers['cache-control']).toBe('no-store');
    // Reading the queue is itself audited.
    expect(await prisma.auditLog.count({ where: { action: 'admin.read' } })).toBeGreaterThan(0);
  });

  it('shows other statuses newest first', async () => {
    const user = await readyUser(ctx, 100_000);
    const id = await request(user);
    await adminCall('POST', `/v1/admin/withdrawals/${id}/reject`, { reason: 'Looks wrong to me' });
    const response = await adminCall('GET', '/v1/admin/withdrawals?status=rejected');
    expect(
      response.json<{ data: { id: string; rejectionReason: string }[] }>().data[0],
    ).toMatchObject({
      id,
      rejectionReason: 'Looks wrong to me',
    });
  });

  it('is a 404 for guests and signed-in users, on every withdrawal route', async () => {
    const user = await readyUser(ctx);
    const id = await request(user);
    const routes: [string, string, object?][] = [
      ['GET', '/v1/admin/withdrawals'],
      ['POST', `/v1/admin/withdrawals/${id}/approve`],
      ['POST', `/v1/admin/withdrawals/${id}/reject`, { reason: 'no reason at all' }],
      ['POST', `/v1/admin/withdrawals/${id}/retry`],
      [
        'POST',
        '/v1/admin/wallet/bonus',
        { userId: user.user.id, amountPaise: 10_000, reason: 'a fine reason' },
      ],
    ];
    for (const [method, url, body] of routes) {
      const guest = await ctx.app.inject({
        method: method as 'GET',
        url,
        ...(body ? { payload: body } : {}),
      });
      expect(guest.statusCode, `guest ${url}`).toBe(404);
      const asUser = await ctx.app.inject({
        method: method as 'GET',
        url,
        headers: { authorization: `Bearer ${user.accessToken}`, 'idempotency-key': randomUUID() },
        ...(body ? { payload: body } : {}),
      });
      expect(asUser.statusCode, `user ${url}`).toBe(404);
    }
    expect(await statusOf(id)).toBe('pending');
    expect(await balanceOfUser(user.user.id)).toBe(30_000n);
  });
});

describe('approve and reject', () => {
  it('approving queues the payout with a fixed idempotency key, and audits who approved', async () => {
    const user = await readyUser(ctx);
    const id = await request(user);
    const response = await approve(id);
    expect(response.json()).toMatchObject({ id, status: 'processing' });
    const row = await prisma.withdrawal.findUniqueOrThrow({ where: { id } });
    expect(row.payoutIdempotencyKey).toBe(`supporters-wd-${id}`);
    expect(row.reviewedByUserId).not.toBeNull();
    expect(await prisma.outboxEvent.count({ where: { type: 'payout.requested' } })).toBe(1);
    const audit = await prisma.auditLog.findFirstOrThrow({
      where: { action: 'wallet.withdrawal_approve' },
    });
    expect(audit).toMatchObject({ targetId: id, actorUserId: row.reviewedByUserId });
    // The user hears about it.
    await drainOutbox();
    expect((await inboxOf(user.user.id)).map((n) => n.type)).toContain('withdrawal.approved');
  });

  it('refuses to decide twice, and 404s for an unknown id', async () => {
    const user = await readyUser(ctx);
    const id = await request(user);
    expect((await approve(id)).statusCode).toBe(200);
    for (const response of [
      await approve(id),
      await adminCall('POST', `/v1/admin/withdrawals/${id}/reject`, { reason: 'too late now' }),
    ]) {
      expect(response.statusCode).toBe(409);
      expect(problemCode(response)).toBe('INVALID_STATE');
    }
    expect((await approve(randomUUID())).statusCode).toBe(404);
    expect(await prisma.outboxEvent.count({ where: { type: 'payout.requested' } })).toBe(1);
  });

  it('rejecting returns the funds with a reversal, tells the user why, and frees the slot', async () => {
    const user = await readyUser(ctx);
    const id = await request(user);
    expect(await balanceOfUser(user.user.id)).toBe(30_000n);
    const response = await adminCall('POST', `/v1/admin/withdrawals/${id}/reject`, {
      reason: 'Name does not match',
    });
    expect(response.json()).toMatchObject({
      status: 'rejected',
      rejectionReason: 'Name does not match',
    });
    expect(await balanceOfUser(user.user.id)).toBe(50_000n);
    const reversal = await prisma.walletLedger.findFirstOrThrow({ where: { type: 'reversal' } });
    expect(reversal).toMatchObject({ amountPaise: 20_000n, withdrawalId: id });

    const mine = await api(ctx, 'GET', '/v1/me/withdrawals', user);
    expect(mine.json<{ data: { status: string; reason: string }[] }>().data[0]).toMatchObject({
      status: 'rejected',
      reason: 'Name does not match',
    });
    await drainOutbox();
    expect((await inboxOf(user.user.id)).map((n) => n.type)).toContain('withdrawal.rejected');
    // They can ask again.
    expect(
      (
        await api(ctx, 'POST', '/v1/me/withdrawals', user, {
          body: { amountPaise: 10_000 },
          key: randomUUID(),
        })
      ).statusCode,
    ).toBe(201);
  });

  it('needs a reason to reject', async () => {
    const user = await readyUser(ctx);
    const id = await request(user);
    for (const body of [
      {},
      { reason: '' },
      { reason: 'no' },
      { reason: 'fine reason', extra: 1 },
    ]) {
      expect((await adminCall('POST', `/v1/admin/withdrawals/${id}/reject`, body)).statusCode).toBe(
        400,
      );
    }
    expect(await statusOf(id)).toBe('pending');
  });

  it('lets exactly one of two simultaneous decisions win, and never returns funds twice', async () => {
    const user = await readyUser(ctx);
    const id = await request(user);
    const results = await Promise.all([
      approve(id),
      adminCall('POST', `/v1/admin/withdrawals/${id}/reject`, { reason: 'Rejected at once' }),
      approve(id),
      adminCall('POST', `/v1/admin/withdrawals/${id}/reject`, { reason: 'Rejected twice' }),
    ]);
    expect(results.filter((r) => r.statusCode === 200)).toHaveLength(1);
    expect(results.filter((r) => r.statusCode === 409)).toHaveLength(3);
    const final = await statusOf(id);
    const reversals = await prisma.walletLedger.count({ where: { type: 'reversal' } });
    expect(reversals).toBe(final === 'rejected' ? 1 : 0);
    expect(await prisma.outboxEvent.count({ where: { type: 'payout.requested' } })).toBe(
      final === 'processing' ? 1 : 0,
    );
  });

  it('refuses to approve for a suspended user, or an unvalidated account', async () => {
    const user = await readyUser(ctx);
    const id = await request(user);
    await prisma.user.update({ where: { id: user.user.id }, data: { status: 'suspended' } });
    expect((await approve(id)).statusCode).toBe(409);
    await prisma.user.update({ where: { id: user.user.id }, data: { status: 'active' } });
    await prisma.payoutAccount.updateMany({ data: { validationStatus: 'failed' } });
    expect((await approve(id)).statusCode).toBe(409);
    expect(await statusOf(id)).toBe('pending');
  });
});

describe('the payout job', () => {
  it('sends one payout with the fixed key and the decrypted destination, once however often it runs', async () => {
    const { id, payoutId } = await inFlight();
    expect(fake.createCalls).toHaveLength(1);
    expect(fake.createCalls[0]).toMatchObject({
      idempotencyKey: `supporters-wd-${id}`,
      amountPaise: 20_000,
      referenceId: id,
      destination: { method: 'bank', accountNumber: BANK.accountNumber, ifsc: BANK.ifsc },
    });
    expect(payoutId).toMatch(/^pout_/);
    const row = await prisma.withdrawal.findUniqueOrThrow({ where: { id } });
    expect(row).toMatchObject({ status: 'processing', providerPayoutId: payoutId });
    expect(row.payoutAttemptedAt).not.toBeNull();

    // The same event delivered again, and a second event for the same withdrawal.
    await prisma.outboxEvent.updateMany({
      where: { type: 'payout.requested' },
      data: { processedAt: null },
    });
    await runPayouts();
    await prisma.$transaction(async (tx) => {
      const { recordEvent } = await import('../notifications/outbox');
      await recordEvent(tx, 'payout.requested', { withdrawalId: id });
    });
    await runPayouts();
    expect(fake.createCalls).toHaveLength(1);
    expect(fake.payouts.size).toBe(1);
  });

  it('settles at once when the provider answers "processed"', async () => {
    fake.initialStatus = 'processed';
    const { id } = await inFlight();
    expect(await statusOf(id)).toBe('completed');
  });

  it('leaves a failed attempt for an admin: no automatic retry, and a retry cannot pay twice', async () => {
    const user = await readyUser(ctx);
    const id = await request(user);
    await approve(id);
    fake.failNextCreate = new Error('socket hang up');
    await expect(runPayouts()).rejects.toThrow('socket hang up');
    let row = await prisma.withdrawal.findUniqueOrThrow({ where: { id } });
    expect(row).toMatchObject({ status: 'processing', providerPayoutId: null });
    expect(row.payoutAttemptedAt).not.toBeNull();
    expect(fake.payouts.size).toBe(0);

    const retry = await adminCall('POST', `/v1/admin/withdrawals/${id}/retry`);
    expect(retry.statusCode).toBe(200);
    // Two events are now waiting; running both still creates one payout.
    await runPayouts();
    row = await prisma.withdrawal.findUniqueOrThrow({ where: { id } });
    expect(row.providerPayoutId).toMatch(/^pout_/);
    expect(fake.payouts.size).toBe(1);
    expect(await prisma.auditLog.count({ where: { action: 'wallet.payout_retry' } })).toBe(1);

    // With a payout in place, retry is refused.
    expect((await adminCall('POST', `/v1/admin/withdrawals/${id}/retry`)).statusCode).toBe(409);
  });

  it('refuses to retry a withdrawal that is not being processed', async () => {
    const user = await readyUser(ctx);
    const id = await request(user);
    expect((await adminCall('POST', `/v1/admin/withdrawals/${id}/retry`)).statusCode).toBe(409);
  });

  it('is relayed to the payouts queue by the outbox relay, and held back without one', async () => {
    const user = await readyUser(ctx);
    const id = await request(user);
    await approve(id);
    await prisma.outboxEvent.updateMany({
      where: { type: { not: 'payout.requested' } },
      data: { publishedAt: new Date() },
    });
    const added: unknown[] = [];
    const sink = { addBulk: async (jobs: unknown[]) => void added.push(...jobs) };
    const none = { addBulk: async () => undefined };
    expect(await relayOutbox(prisma, { notifications: none, searchIndex: none })).toBe(0);
    expect(
      await relayOutbox(prisma, { notifications: none, searchIndex: none, payouts: sink }),
    ).toBe(1);
    expect(added).toHaveLength(1);
    expect(added[0]).toMatchObject({
      name: 'payout',
      opts: { jobId: expect.stringMatching(/^payout-/) as string },
    });
  });
});

describe('RazorpayX webhooks', () => {
  it('completes the withdrawal on payout.processed, tells the user, and ignores a replay', async () => {
    const { user, id, payoutId } = await inFlight();
    const eventId = `evt_${randomUUID()}`;
    const first = await webhook(
      'payout.processed',
      { id: payoutId, status: 'processed', reference_id: id },
      { eventId },
    );
    expect(first.statusCode).toBe(200);
    expect(first.json()).toEqual({ status: 'ok' });
    expect(await statusOf(id)).toBe('completed');
    expect(
      (await prisma.withdrawal.findUniqueOrThrow({ where: { id } })).completedAt,
    ).not.toBeNull();

    const replay = await webhook(
      'payout.processed',
      { id: payoutId, status: 'processed', reference_id: id },
      { eventId },
    );
    expect(replay.json()).toEqual({ status: 'duplicate' });
    expect(await prisma.razorpayxWebhookEvent.count()).toBe(1);

    await drainOutbox();
    const types = (await inboxOf(user.user.id)).map((n) => n.type);
    expect(types.filter((t) => t === 'withdrawal.paid')).toHaveLength(1);
    expect(await balanceOfUser(user.user.id)).toBe(30_000n);
  });

  it('returns the funds exactly once when the payout fails, however many events say so', async () => {
    const { user, id, payoutId } = await inFlight();
    for (const [event, status] of [
      ['payout.failed', 'failed'],
      ['payout.failed', 'failed'],
      ['payout.reversed', 'reversed'],
    ] as const) {
      const response = await webhook(event, { id: payoutId, status, reference_id: id });
      expect(response.statusCode).toBe(200);
    }
    expect(await statusOf(id)).toBe('failed');
    expect(await balanceOfUser(user.user.id)).toBe(50_000n);
    expect(await prisma.walletLedger.count({ where: { type: 'reversal' } })).toBe(1);
    const row = await prisma.withdrawal.findUniqueOrThrow({ where: { id } });
    expect(row.failureReason).toBe('The bank could not complete the payout');
    await drainOutbox();
    expect((await inboxOf(user.user.id)).map((n) => n.type)).toContain('withdrawal.failed');
    // The slot is free again, and the failure is the user's to retry (manual).
    expect(
      (
        await api(ctx, 'POST', '/v1/me/withdrawals', user, {
          body: { amountPaise: 20_000 },
          key: randomUUID(),
        })
      ).statusCode,
    ).toBe(201);
  });

  it('returns the funds when the bank reverses a payout that had been processed', async () => {
    const { user, id, payoutId } = await inFlight();
    await webhook('payout.processed', { id: payoutId, status: 'processed', reference_id: id });
    expect(await balanceOfUser(user.user.id)).toBe(30_000n);
    await webhook('payout.reversed', { id: payoutId, status: 'reversed', reference_id: id });
    expect(await statusOf(id)).toBe('failed');
    expect(await balanceOfUser(user.user.id)).toBe(50_000n);
    await webhook('payout.reversed', { id: payoutId, status: 'reversed', reference_id: id });
    expect(await prisma.walletLedger.count({ where: { type: 'reversal' } })).toBe(1);
  });

  it('does not let a stale or unrelated event change a finished or unknown withdrawal', async () => {
    const { id, payoutId } = await inFlight();
    await webhook('payout.processed', { id: payoutId, status: 'processed', reference_id: id });
    // A "failed" for the same withdrawal after it completed is stale.
    await webhook('payout.failed', { id: payoutId, status: 'failed', reference_id: id });
    expect(await statusOf(id)).toBe('completed');
    // A payout nobody here asked for: acknowledged, no effect.
    const stranger = await webhook('payout.processed', {
      id: 'pout_other',
      status: 'processed',
      reference_id: randomUUID(),
    });
    expect(stranger.statusCode).toBe(200);
    // A payout id that does not match the stored one is ignored too.
    const second = await inFlight();
    await webhook('payout.processed', {
      id: 'pout_wrong',
      status: 'processed',
      reference_id: second.id,
    });
    expect(await statusOf(second.id)).toBe('processing');
  });

  it('settles from the payout id alone, before the job has stored it', async () => {
    const user = await readyUser(ctx);
    const id = await request(user);
    await approve(id);
    const response = await webhook('payout.processed', {
      id: 'pout_early',
      status: 'processed',
      reference_id: id,
    });
    expect(response.statusCode).toBe(200);
    expect(await statusOf(id)).toBe('completed');
    // The job then runs and finds nothing left to send.
    await runPayouts();
    expect(fake.createCalls).toHaveLength(0);
  });

  it('completes payout-account validation', async () => {
    const user = await readyUser(ctx, 0);
    fake.validation = () => ({ status: 'pending', registeredName: null });
    await putAccount(ctx, user, { ...BANK, accountNumber: '999988887777' });
    const account = await prisma.payoutAccount.findFirstOrThrow({
      where: { userId: user.user.id, supersededAt: null },
    });
    expect(account.validationStatus).toBe('pending');
    const response = await webhook(
      'fund_account.validation.completed',
      {
        id: account.providerValidationId,
        status: 'completed',
        results: { account_status: 'active', registered_name: 'RAVI KUMAR' },
      },
      { entityKey: 'fund_account.validation' },
    );
    expect(response.statusCode).toBe(200);
    const after = await prisma.payoutAccount.findUniqueOrThrow({ where: { id: account.id } });
    expect(after).toMatchObject({
      validationStatus: 'validated',
      registeredName: 'RAVI KUMAR',
      isNameMatch: true,
    });
  });

  it('refuses a bad, missing or foreign signature, and a changed body, without touching anything', async () => {
    const { id, payoutId } = await inFlight();
    const entity = { id: payoutId, status: 'processed', reference_id: id };
    const wrongSecret = await webhook('payout.processed', entity, {
      secret: 'another-secret-value-9999',
    });
    expect(wrongSecret.statusCode).toBe(400);
    expect(problemCode(wrongSecret)).toBe('WEBHOOK_SIGNATURE_INVALID');

    const raw = JSON.stringify({
      event: 'payout.processed',
      created_at: Math.floor(Date.now() / 1000),
      payload: { payout: { entity } },
    });
    const base = { 'content-type': 'application/json', 'x-razorpay-event-id': 'evt_x' };
    const tampered = await ctx.app.inject({
      method: 'POST',
      url: '/v1/webhooks/razorpayx',
      headers: { ...base, 'x-razorpay-signature': sign(raw) },
      payload: raw.replace('"processed"', '"failed"'),
    });
    expect(tampered.statusCode).toBe(400);
    for (const headers of [
      { ...base },
      { ...base, 'x-razorpay-signature': '' },
      { ...base, 'x-razorpay-signature': 'zz'.repeat(32) },
      { ...base, 'x-razorpay-signature': sign(raw).toUpperCase().slice(0, 62) },
      { 'content-type': 'application/json', 'x-razorpay-signature': sign(raw) },
    ]) {
      const response = await ctx.app.inject({
        method: 'POST',
        url: '/v1/webhooks/razorpayx',
        headers,
        payload: raw,
      });
      expect(response.statusCode, JSON.stringify(headers)).toBeGreaterThanOrEqual(400);
      expect(response.statusCode).toBeLessThan(500);
    }
    expect(await statusOf(id)).toBe('processing');
    expect(await prisma.razorpayxWebhookEvent.count()).toBe(0);
  });

  it('refuses everything while no webhook secret is configured', async () => {
    const response = await webhook(
      'payout.processed',
      { id: 'p', status: 'processed' },
      { app: noSecret },
    );
    expect(response.statusCode).toBe(503);
    expect(problemCode(response)).toBe('PAYOUTS_NOT_CONFIGURED');
  });

  it('does not apply a signed event that is days old (a replay)', async () => {
    const { id, payoutId } = await inFlight();
    const old = Math.floor(Date.now() / 1000) - 3 * 24 * 3600;
    const response = await webhook(
      'payout.processed',
      { id: payoutId, status: 'processed', reference_id: id },
      { createdAt: old },
    );
    expect(response.json()).toEqual({ status: 'ignored' });
    expect(await statusOf(id)).toBe('processing');
  });

  it('treats the same event id delivered at once as one event', async () => {
    const { id, payoutId } = await inFlight();
    const eventId = `evt_${randomUUID()}`;
    const entity = { id: payoutId, status: 'failed', reference_id: id };
    const results = await Promise.all(
      Array.from({ length: 4 }, () => webhook('payout.failed', entity, { eventId })),
    );
    expect(results.every((r) => r.statusCode === 200)).toBe(true);
    expect(await prisma.walletLedger.count({ where: { type: 'reversal' } })).toBe(1);
  });
});

describe('reconciliation by polling', () => {
  it('settles a payout whose webhook never came', async () => {
    const { user, id, payoutId } = await inFlight();
    fake.settle(payoutId, 'processed');
    // Not yet stale: left alone.
    expect(await processor.reconcileStale()).toBe(0);
    await prisma.$executeRaw`UPDATE withdrawals SET updated_at = now() - interval '10 minutes'`;
    clockMs = Date.now();
    expect(await processor.reconcileStale()).toBe(1);
    expect(await statusOf(id)).toBe('completed');
    expect(await balanceOfUser(user.user.id)).toBe(30_000n);
    expect(await processor.reconcileStale()).toBe(0);
  });

  it('returns the funds of a payout that failed while nobody was listening', async () => {
    const { user, id, payoutId } = await inFlight();
    fake.settle(payoutId, 'failed', 'bank said no');
    await prisma.$executeRaw`UPDATE withdrawals SET updated_at = now() - interval '10 minutes'`;
    clockMs = Date.now();
    await processor.reconcileStale();
    expect(await statusOf(id)).toBe('failed');
    expect(await balanceOfUser(user.user.id)).toBe(50_000n);
    // The provider's own words never reach the user.
    expect(
      (await prisma.withdrawal.findUniqueOrThrow({ where: { id } })).failureReason,
    ).not.toContain('bank said no');
  });
});

describe('bonuses', () => {
  const bonus = (body: object, key: string | null = randomUUID()) =>
    adminCall('POST', '/v1/admin/wallet/bonus', body, key ? { 'idempotency-key': key } : {});

  it('credits the wallet with the reason shown to the user and kept in the audit log', async () => {
    const user = await registerMobile(ctx);
    const response = await bonus({
      userId: user.user.id,
      amountPaise: 25_000,
      reason: 'Event giveaway winner',
    });
    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      type: 'bonus',
      amount: { amountPaise: 25_000 },
      description: 'Event giveaway winner',
    });
    expect(await balanceOfUser(user.user.id)).toBe(25_000n);
    const ledger = await api(ctx, 'GET', '/v1/me/wallet/ledger', user);
    expect(ledger.json<{ data: { description: string }[] }>().data[0]?.description).toBe(
      'Event giveaway winner',
    );
    const audit = await prisma.auditLog.findFirstOrThrow({ where: { action: 'wallet.bonus' } });
    expect(audit).toMatchObject({ targetId: user.user.id });
    expect(audit.metadata).toMatchObject({ amountPaise: 25_000, reason: 'Event giveaway winner' });
  });

  it('is idempotent, and refuses the key for a different request', async () => {
    const user = await registerMobile(ctx);
    const key = randomUUID();
    const body = { userId: user.user.id, amountPaise: 10_000, reason: 'Goodwill credit' };
    const results = await Promise.all([bonus(body, key), bonus(body, key), bonus(body, key)]);
    expect(results.map((r) => r.statusCode).sort()).toEqual([200, 200, 201]);
    expect(await balanceOfUser(user.user.id)).toBe(10_000n);
    const other = await bonus({ ...body, amountPaise: 20_000 }, key);
    expect(other.statusCode).toBe(422);
    expect(await balanceOfUser(user.user.id)).toBe(10_000n);
  });

  it('needs a reason, a sane amount and an Idempotency-Key', async () => {
    const user = await registerMobile(ctx);
    const base = { userId: user.user.id, amountPaise: 10_000, reason: 'A valid reason' };
    for (const body of [
      { ...base, reason: '' },
      { ...base, reason: 'abc' },
      { userId: base.userId, amountPaise: 10_000 },
      { ...base, amountPaise: 0 },
      { ...base, amountPaise: -500 },
      { ...base, amountPaise: 10.5 },
      { ...base, amountPaise: 10_000_01 },
      { ...base, extra: true },
    ]) {
      expect((await bonus(body)).statusCode, JSON.stringify(body)).toBe(400);
    }
    expect((await bonus(base, null)).statusCode).toBe(400);
    expect(await balanceOfUser(user.user.id)).toBe(0n);
  });

  it('only credits active, ordinary accounts', async () => {
    const user = await registerMobile(ctx);
    const body = { amountPaise: 10_000, reason: 'A valid reason' };
    expect((await bonus({ ...body, userId: randomUUID() })).statusCode).toBe(404);
    const adminUser = await prisma.user.findFirstOrThrow({ where: { role: 'admin' } });
    expect((await bonus({ ...body, userId: adminUser.id })).statusCode).toBe(404);
    await prisma.user.update({ where: { id: user.user.id }, data: { status: 'suspended' } });
    expect((await bonus({ ...body, userId: user.user.id })).statusCode).toBe(409);
  });

  it('lets the user withdraw a bonus like any other balance', async () => {
    const user = await readyUser(ctx, 0);
    await bonus({ userId: user.user.id, amountPaise: 15_000, reason: 'Goodwill credit' });
    expect(
      (
        await api(ctx, 'POST', '/v1/me/withdrawals', user, {
          body: { amountPaise: 15_000 },
          key: randomUUID(),
        })
      ).statusCode,
    ).toBe(201);
  });
});

describe('the ledger stays whole', () => {
  it('balances to what was paid out, after approvals, rejections, failures and reversals', async () => {
    const funded = 100_000;
    const paid = await inFlight(funded, 20_000);
    await webhook('payout.processed', {
      id: paid.payoutId,
      status: 'processed',
      reference_id: paid.id,
    });

    const failed = await inFlight(funded, 30_000);
    await webhook('payout.failed', {
      id: failed.payoutId,
      status: 'failed',
      reference_id: failed.id,
    });

    const rejectedUser = await readyUser(ctx, funded);
    const rejected = await request(rejectedUser, 40_000);
    await adminCall('POST', `/v1/admin/withdrawals/${rejected}/reject`, {
      reason: 'Not convinced',
    });

    expect(await balanceOfUser(paid.user.user.id)).toBe(BigInt(funded - 20_000));
    expect(await balanceOfUser(failed.user.user.id)).toBe(BigInt(funded));
    expect(await balanceOfUser(rejectedUser.user.id)).toBe(BigInt(funded));
    // Every ledger row is accounted for by a user, a type and a unique key.
    const rows = await prisma.walletLedger.findMany();
    expect(new Set(rows.map((r) => r.entryKey)).size).toBe(rows.length);
    // Every money movement left an audit row.
    for (const action of [
      'wallet.withdrawal_request',
      'wallet.withdrawal_approve',
      'wallet.withdrawal_reject',
      'wallet.payout_completed',
      'wallet.payout_failed',
    ]) {
      expect(await prisma.auditLog.count({ where: { action } }), action).toBeGreaterThan(0);
    }
  });
});
