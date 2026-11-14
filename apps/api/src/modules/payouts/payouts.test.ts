import { randomUUID } from 'node:crypto';
import { Writable } from 'node:stream';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { REDACT_PATHS } from '../../app';
import {
  type TestContext,
  createTestApp,
  prisma,
  problemCode,
  registerMobile,
  resetState,
  testEnv,
} from '../../test/helpers';
import { drainOutbox, inboxOf } from '../../test/notifications';
import {
  BANK,
  PAYOUT_TEST_KEY,
  UPI,
  ageAccount,
  api,
  balanceOfUser,
  fund,
  payoutEnv,
  putAccount,
  readyUser,
} from '../../test/wallet';
import { FakePayouts } from './payouts.fake';
import { PayoutVault } from './payouts.vault';

let ctx: TestContext;
let off: TestContext;
let fake: FakePayouts;
const logLines: string[] = [];

beforeAll(async () => {
  fake = new FakePayouts();
  const sink = new Writable({
    write(chunk: Buffer, _encoding, done) {
      logLines.push(chunk.toString('utf8'));
      done();
    },
  });
  ctx = await createTestApp(payoutEnv, undefined, {
    payouts: fake,
    logger: { level: 'trace', redact: { paths: REDACT_PATHS, censor: '[REDACTED]' }, stream: sink },
  });
  off = await createTestApp();
});
afterAll(async () => {
  await ctx.app.close();
  await off.app.close();
});
beforeEach(async () => {
  await resetState();
  logLines.length = 0;
  fake.validation = (destination) => ({
    status: 'validated',
    registeredName: destination.holderName,
  });
});

describe('configuration', () => {
  it('boots without payout settings and answers 503 PAYOUTS_NOT_CONFIGURED on the write routes', async () => {
    const user = await registerMobile(off);
    for (const [method, url, body] of [
      ['PUT', '/v1/me/payout-account', { ...BANK, holderName: 'Ravi Kumar' }],
      ['POST', '/v1/me/withdrawals', { amountPaise: 10_000 }],
    ] as const) {
      const response = await api(off, method, url, user, { body, key: randomUUID() });
      expect(response.statusCode, url).toBe(503);
      expect(problemCode(response)).toBe('PAYOUTS_NOT_CONFIGURED');
    }
    // Reads still work.
    expect((await api(off, 'GET', '/v1/me/wallet', user)).statusCode).toBe(200);
    expect((await api(off, 'GET', '/v1/me/payout-account', user)).json()).toEqual({
      account: null,
    });
    expect((await api(off, 'GET', '/v1/me/withdrawals', user)).statusCode).toBe(200);
  });

  it('refuses the fake provider in staging and production, and half-set RazorpayX settings', () => {
    const message = (extra: Record<string, string>) => {
      try {
        testEnv({ NODE_ENV: 'production', ...payoutEnv, ...extra });
        return '';
      } catch (error) {
        return String(error);
      }
    };
    // Other production-only settings are missing too; the payout rules must be named in the list.
    expect(message({})).toMatch(/PAYOUTS_PROVIDER: fake is dev-only/);
    expect(message({ NODE_ENV: 'staging' })).toMatch(/PAYOUTS_PROVIDER: fake is dev-only/);
    expect(message({ PAYOUTS_PROVIDER: 'razorpayx' })).toMatch(/RAZORPAYX_KEY_ID: set/);
    expect(message({ PAYOUTS_PROVIDER: 'fake', RAZORPAYX_KEY_ID: 'rzp_x' })).toMatch(
      /RazorpayX credentials are set but PAYOUTS_PROVIDER is not razorpayx/,
    );
    expect(message({ PAYOUT_ENCRYPTION_KEY: '' })).toMatch(/PAYOUT_ENCRYPTION_KEY/);
  });

  it('accepts a complete RazorpayX configuration', () => {
    const env = testEnv({
      PAYOUTS_PROVIDER: 'razorpayx',
      PAYOUT_ENCRYPTION_KEY: payoutEnv.PAYOUT_ENCRYPTION_KEY,
      RAZORPAYX_KEY_ID: 'rzp_test_x',
      RAZORPAYX_KEY_SECRET: 'secret-value',
      RAZORPAYX_ACCOUNT_NUMBER: '2323230000000000',
      RAZORPAYX_WEBHOOK_SECRET: 'webhook-secret-value',
    });
    expect(env.PAYOUTS_PROVIDER).toBe('razorpayx');
  });
});

describe('payout account', () => {
  it('stores the account sealed, returns it masked, and never echoes the number', async () => {
    const user = await registerMobile(ctx);
    const response = await putAccount(ctx, user, BANK, 'Asha Traders');
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      account: {
        method: 'bank',
        holderName: 'Asha Traders',
        maskedDestination: '••••9012',
        validationStatus: 'validated',
        isNameMatch: true,
      },
    });
    expect(response.body).not.toContain(BANK.accountNumber);
    expect(response.body).not.toContain(BANK.ifsc);

    const got = await api(ctx, 'GET', '/v1/me/payout-account', user);
    expect(got.body).not.toContain(BANK.accountNumber);
    expect(got.json<{ account: { maskedDestination: string } }>().account.maskedDestination).toBe(
      '••••9012',
    );
  });

  it('keeps plaintext out of the database, the audit log, the outbox and the logs', async () => {
    const user = await registerMobile(ctx);
    await putAccount(ctx, user, BANK, 'Asha Traders');
    await putAccount(ctx, user, UPI, 'Asha Traders');
    // A rejected request with the secrets in its body is logged too.
    await api(ctx, 'PUT', '/v1/me/payout-account', user, {
      body: { ...BANK, holderName: 'x', extra: 'rejected' },
    });

    const dump = JSON.stringify(
      await Promise.all([
        prisma.$queryRaw`SELECT * FROM payout_accounts`,
        prisma.$queryRaw`SELECT * FROM audit_logs`,
        prisma.$queryRaw`SELECT * FROM outbox_events`,
        prisma.$queryRaw`SELECT * FROM notifications`,
        prisma.$queryRaw`SELECT * FROM wallet_ledger`,
        prisma.$queryRaw`SELECT * FROM withdrawals`,
      ]),
    );
    for (const secret of [BANK.accountNumber, BANK.ifsc, UPI.upiId, 'ravi.kumar']) {
      expect(dump, `database holds ${secret}`).not.toContain(secret);
      expect(logLines.join(''), `log holds ${secret}`).not.toContain(secret);
    }
    // The ciphertext column really holds bytes, not a readable value.
    const [row] = await prisma.$queryRaw<{ destination_enc: Buffer }[]>`
      SELECT destination_enc FROM payout_accounts WHERE superseded_at IS NULL`;
    expect(row?.destination_enc.length).toBeGreaterThan(40);
    expect(row?.destination_enc.toString('latin1')).not.toContain('okaxis');
  });

  it('round-trips through the vault, bound to the owner and the key', () => {
    const vault = new PayoutVault(PAYOUT_TEST_KEY);
    const destination = { ...BANK, holderName: 'Ravi Kumar' };
    const sealed = vault.seal('user-a', destination);
    expect(vault.open('user-a', sealed)).toEqual(destination);
    // Same value twice: different bytes (random IV).
    expect(Buffer.from(vault.seal('user-a', destination)).equals(Buffer.from(sealed))).toBe(false);
    // Copied to another user's row, or opened with another key, or tampered with: nothing.
    expect(vault.open('user-b', sealed)).toBeNull();
    expect(new PayoutVault(Buffer.alloc(32, 7)).open('user-a', sealed)).toBeNull();
    const tampered = Uint8Array.from(sealed);
    tampered[tampered.length - 1] = (tampered[tampered.length - 1] ?? 0) ^ 1;
    expect(vault.open('user-a', tampered)).toBeNull();
  });

  it('is stored encrypted for the right owner: the stored bytes open for them only', async () => {
    const user = await registerMobile(ctx);
    await putAccount(ctx, user, UPI);
    const row = await prisma.payoutAccount.findFirstOrThrow({ where: { userId: user.user.id } });
    const vault = new PayoutVault(PAYOUT_TEST_KEY);
    expect(vault.open(user.user.id, row.destinationEnc)).toMatchObject({ upiId: UPI.upiId });
    expect(vault.open(randomUUID(), row.destinationEnc)).toBeNull();
    expect(row.maskedDestination).toBe('ra••••@okaxis');
  });

  it('refuses to edit a destination in place, at the database', async () => {
    const user = await registerMobile(ctx);
    await putAccount(ctx, user);
    await expect(
      prisma.$executeRaw`UPDATE payout_accounts SET destination_enc = '\\x00'::bytea`,
    ).rejects.toThrow(/immutable/);
    // The validation outcome may change: webhooks need to.
    await expect(
      prisma.payoutAccount.updateMany({ data: { validationStatus: 'validated' } }),
    ).resolves.toBeDefined();
  });

  it('sends the always-on security alert, and not for the same details again', async () => {
    const user = await registerMobile(ctx);
    await putAccount(ctx, user);
    const deliveries = await drainOutbox();
    const urgent = deliveries.filter((d) => d.userId === user.user.id && d.isUrgent);
    expect(urgent.some((d) => d.push === 'now')).toBe(true);
    const notes = (await inboxOf(user.user.id)).filter(
      (n) => n.type === 'security.payout_details_changed',
    );
    expect(notes).toHaveLength(1);
    expect(notes[0]?.category).toBe('account');

    const again = await putAccount(ctx, user);
    expect(again.statusCode).toBe(200);
    expect(await prisma.payoutAccount.count()).toBe(1);
    expect(
      await prisma.outboxEvent.count({
        where: { type: 'security.payout_details_changed', processedAt: null },
      }),
    ).toBe(0);

    await putAccount(ctx, user, UPI);
    expect(await prisma.payoutAccount.count()).toBe(2);
    expect(await prisma.payoutAccount.count({ where: { supersededAt: null } })).toBe(1);
    await drainOutbox();
    expect(
      (await inboxOf(user.user.id)).filter((n) => n.type === 'security.payout_details_changed'),
    ).toHaveLength(2);
  });

  it('cannot be switched off in notification preferences', async () => {
    const user = await registerMobile(ctx);
    await prisma.notificationPref.createMany({
      data: [
        { userId: user.user.id, category: 'account', channel: 'push', enabled: false },
        { userId: user.user.id, category: 'account', channel: 'email', enabled: false },
      ],
    });
    await putAccount(ctx, user);
    const deliveries = await drainOutbox();
    expect(deliveries.find((d) => d.userId === user.user.id && d.isUrgent)?.push).toBe('now');
  });

  it('rejects an account the bank cannot verify, and keeps the old one', async () => {
    const user = await registerMobile(ctx);
    await putAccount(ctx, user);
    fake.validation = () => ({ status: 'failed', registeredName: null });
    const response = await putAccount(ctx, user, UPI);
    expect(response.statusCode).toBe(422);
    expect(problemCode(response)).toBe('PAYOUT_ACCOUNT_INVALID');
    expect(await prisma.payoutAccount.count()).toBe(1);
  });

  it('validates the shape of UPI ids, account numbers and IFSC codes', async () => {
    const user = await registerMobile(ctx);
    for (const body of [
      { method: 'upi', upiId: 'not a upi id', holderName: 'Ravi Kumar' },
      { method: 'bank', accountNumber: '12', ifsc: 'HDFC0001234', holderName: 'Ravi Kumar' },
      { method: 'bank', accountNumber: '123456789012', ifsc: 'BAD', holderName: 'Ravi Kumar' },
      {
        method: 'bank',
        upiId: 'a@b',
        accountNumber: '123456789012',
        ifsc: 'HDFC0001234',
        holderName: 'R K',
      },
    ]) {
      const response = await api(ctx, 'PUT', '/v1/me/payout-account', user, { body });
      expect(response.statusCode, JSON.stringify(body)).toBe(400);
    }
  });

  it('flags a holder name that does not match the profile name, and lets a close one through', async () => {
    const mismatch = await registerMobile(ctx);
    const response = await putAccount(ctx, mismatch, BANK, 'Suresh Patel');
    expect(response.json<{ account: { isNameMatch: boolean } }>().account.isNameMatch).toBe(false);
    // The bank's registered name decides, not what the user typed.
    const user = await registerMobile(ctx);
    fake.validation = () => ({ status: 'validated', registeredName: 'ASHA TRADERS PVT LTD' });
    const ok = await putAccount(ctx, user, BANK, 'Whatever I typed');
    expect(ok.json<{ account: { isNameMatch: boolean } }>().account.isNameMatch).toBe(true);
  });

  it('limits how often details can be changed', async () => {
    const user = await registerMobile(ctx);
    let last = 0;
    for (let i = 0; i < 6; i += 1) {
      last = (await putAccount(ctx, user, { ...BANK, accountNumber: `12345678901${i}` }))
        .statusCode;
    }
    expect(last).toBe(429);
  });
});

describe('withdrawals', () => {
  const withdraw = (
    user: Parameters<typeof api>[3],
    amountPaise: number,
    key: string | null = randomUUID(),
  ) => api(ctx, 'POST', '/v1/me/withdrawals', user, { body: { amountPaise }, key });

  it('reserves the amount from the balance, with a ledger debit and an audit row', async () => {
    const user = await readyUser(ctx, 50_000);
    const response = await withdraw(user, 20_000);
    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      amount: { amountPaise: 20_000, currency: 'INR' },
      status: 'pending',
      method: 'bank',
      maskedDestination: '••••9012',
    });
    expect(await balanceOfUser(user.user.id)).toBe(30_000n);
    const wallet = await api(ctx, 'GET', '/v1/me/wallet', user);
    expect(wallet.json()).toMatchObject({
      balance: { amountPaise: 30_000 },
      reserved: { amountPaise: 20_000 },
    });
    const entry = await prisma.walletLedger.findFirstOrThrow({ where: { type: 'withdrawal' } });
    expect(entry.amountPaise).toBe(-20_000n);
    expect(entry.withdrawalId).toBe(response.json<{ id: string }>().id);
    const audit = await prisma.auditLog.findFirstOrThrow({
      where: { action: 'wallet.withdrawal_request' },
    });
    expect(audit.metadata).toMatchObject({ amountPaise: 20_000, isNameMismatch: false });
  });

  it('replays a retried key, and refuses the key for a different amount', async () => {
    const user = await readyUser(ctx);
    const key = randomUUID();
    const first = await withdraw(user, 10_000, key);
    const retry = await withdraw(user, 10_000, key);
    expect(first.statusCode).toBe(201);
    expect(retry.statusCode).toBe(200);
    expect(retry.json<{ id: string }>().id).toBe(first.json<{ id: string }>().id);
    expect(await prisma.withdrawal.count()).toBe(1);
    expect(await balanceOfUser(user.user.id)).toBe(40_000n);

    const other = await withdraw(user, 12_000, key);
    expect(other.statusCode).toBe(422);
    expect(problemCode(other)).toBe('IDEMPOTENCY_KEY_REUSED');
  });

  it('needs an Idempotency-Key', async () => {
    const user = await readyUser(ctx);
    expect((await withdraw(user, 10_000, null)).statusCode).toBe(400);
  });

  it('allows one withdrawal in progress at a time', async () => {
    const user = await readyUser(ctx);
    expect((await withdraw(user, 10_000)).statusCode).toBe(201);
    const second = await withdraw(user, 10_000);
    expect(second.statusCode).toBe(409);
    expect(problemCode(second)).toBe('WITHDRAWAL_PENDING');
    // A finished one frees the slot.
    await prisma.withdrawal.updateMany({ data: { status: 'completed' } });
    expect((await withdraw(user, 10_000)).statusCode).toBe(201);
  });

  it('enforces the minimum of ₹100 and the balance', async () => {
    const user = await readyUser(ctx, 15_000);
    const low = await withdraw(user, 9_999);
    expect(low.statusCode).toBe(422);
    expect(problemCode(low)).toBe('WITHDRAWAL_BELOW_MINIMUM');
    const high = await withdraw(user, 15_001);
    expect(high.statusCode).toBe(409);
    expect(problemCode(high)).toBe('INSUFFICIENT_BALANCE');
    expect((await withdraw(user, 10_000)).statusCode).toBe(201);
    expect(await balanceOfUser(user.user.id)).toBe(5_000n);
  });

  it('rejects fractions and negative amounts', async () => {
    const user = await readyUser(ctx);
    for (const amountPaise of [100.5, -10_000, 0, '10000']) {
      const response = await api(ctx, 'POST', '/v1/me/withdrawals', user, {
        body: { amountPaise },
        key: randomUUID(),
      });
      expect(response.statusCode, String(amountPaise)).toBe(400);
    }
  });

  it('needs a validated payout account', async () => {
    const none = await registerMobile(ctx);
    await fund(none.user.id, 50_000);
    const noAccount = await withdraw(none, 10_000);
    expect(noAccount.statusCode).toBe(409);
    expect(problemCode(noAccount)).toBe('PAYOUT_ACCOUNT_REQUIRED');

    fake.validation = () => ({ status: 'pending', registeredName: null });
    await putAccount(ctx, none);
    await ageAccount(none.user.id);
    const pending = await withdraw(none, 10_000);
    expect(pending.statusCode).toBe(409);
    expect(problemCode(pending)).toBe('PAYOUT_ACCOUNT_NOT_VALIDATED');
  });

  it('blocks withdrawals for 24 hours after the payout details change', async () => {
    const user = await readyUser(ctx);
    await putAccount(ctx, user, UPI);
    const blocked = await withdraw(user, 10_000);
    expect(blocked.statusCode).toBe(409);
    expect(problemCode(blocked)).toBe('PAYOUT_DETAILS_RECENTLY_CHANGED');
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(23 * 3_600);

    await ageAccount(user.user.id, 23);
    expect((await withdraw(user, 10_000)).statusCode).toBe(409);
    await ageAccount(user.user.id, 2);
    expect((await withdraw(user, 10_000)).statusCode).toBe(201);
  });

  it('flags a name mismatch for the admin on the withdrawal', async () => {
    const user = await registerMobile(ctx);
    await putAccount(ctx, user, BANK, 'Suresh Patel');
    await ageAccount(user.user.id);
    await fund(user.user.id, 20_000);
    const response = await withdraw(user, 10_000);
    expect(response.statusCode).toBe(201);
    const row = await prisma.withdrawal.findFirstOrThrow();
    expect(row.isNameMismatch).toBe(true);
  });

  it('refuses a suspended account', async () => {
    const user = await readyUser(ctx);
    await prisma.user.update({ where: { id: user.user.id }, data: { status: 'suspended' } });
    // The token still decodes until the session is revoked; the service decides.
    const response = await withdraw(user, 10_000);
    expect([401, 403]).toContain(response.statusCode);
    expect(await prisma.withdrawal.count()).toBe(0);
  });

  it('cannot be overdrawn by simultaneous requests', async () => {
    const user = await readyUser(ctx, 15_000);
    const results = await Promise.all(Array.from({ length: 6 }, () => withdraw(user, 10_000)));
    const codes = results.map((r) => r.statusCode).sort();
    expect(codes.filter((c) => c === 201)).toHaveLength(1);
    expect(codes.filter((c) => c === 409)).toHaveLength(5);
    expect(await prisma.withdrawal.count()).toBe(1);
    expect(await balanceOfUser(user.user.id)).toBe(5_000n);
  });

  it('cannot take two withdrawals even when each fits the balance', async () => {
    const user = await readyUser(ctx, 100_000);
    const results = await Promise.all([withdraw(user, 10_000), withdraw(user, 10_000)]);
    expect(results.map((r) => r.statusCode).sort()).toEqual([201, 409]);
    expect(await prisma.withdrawal.count()).toBe(1);
  });

  it('treats a simultaneous retry of the same key as one request', async () => {
    const user = await readyUser(ctx);
    const key = randomUUID();
    const results = await Promise.all([withdraw(user, 10_000, key), withdraw(user, 10_000, key)]);
    expect(results.map((r) => r.statusCode).sort()).toEqual([200, 201]);
    expect(await prisma.withdrawal.count()).toBe(1);
    expect(await balanceOfUser(user.user.id)).toBe(40_000n);
  });

  it('keeps the database rule even if the service were bypassed', async () => {
    const user = await readyUser(ctx);
    await withdraw(user, 10_000);
    const row = await prisma.withdrawal.findFirstOrThrow();
    await expect(
      prisma.withdrawal.create({
        data: {
          userId: row.userId,
          payoutAccountId: row.payoutAccountId,
          amountPaise: 10_000n,
          idempotencyKey: randomUUID(),
        },
      }),
    ).rejects.toThrow();
  });

  it('lists a user’s own withdrawals, newest first, with a cursor', async () => {
    const user = await readyUser(ctx, 100_000);
    for (let i = 0; i < 3; i += 1) {
      await withdraw(user, 10_000);
      await prisma.withdrawal.updateMany({ data: { status: 'completed' } });
    }
    const page = await api(ctx, 'GET', '/v1/me/withdrawals?limit=2', user);
    const body = page.json<{ data: { id: string }[]; nextCursor: string }>();
    expect(body.data).toHaveLength(2);
    const rest = await api(
      ctx,
      'GET',
      `/v1/me/withdrawals?limit=2&cursor=${body.nextCursor}`,
      user,
    );
    expect(rest.json<{ data: unknown[] }>().data).toHaveLength(1);
  });
});

describe('who can do what', () => {
  it('answers guests with 401 on every route, before any work', async () => {
    for (const [method, url] of [
      ['GET', '/v1/me/payout-account'],
      ['PUT', '/v1/me/payout-account'],
      ['POST', '/v1/me/withdrawals'],
      ['GET', '/v1/me/withdrawals'],
    ] as const) {
      const response = await api(ctx, method, url, undefined, { body: {}, key: randomUUID() });
      expect(response.statusCode, url).toBe(401);
    }
  });

  it('never shows one user another’s account or withdrawals', async () => {
    const owner = await readyUser(ctx);
    await api(ctx, 'POST', '/v1/me/withdrawals', owner, {
      body: { amountPaise: 10_000 },
      key: randomUUID(),
    });
    const other = await registerMobile(ctx);
    expect((await api(ctx, 'GET', '/v1/me/payout-account', other)).json()).toEqual({
      account: null,
    });
    expect(
      (await api(ctx, 'GET', '/v1/me/withdrawals', other)).json<{ data: unknown[] }>().data,
    ).toEqual([]);
    expect((await api(ctx, 'GET', '/v1/me/wallet', other)).json()).toMatchObject({
      balance: { amountPaise: 0 },
    });
    // Another user's withdrawal is not reachable by id at all, and a body cannot name a user.
    const smuggle = await api(ctx, 'PUT', '/v1/me/payout-account', other, {
      body: { ...BANK, holderName: 'Ravi Kumar', userId: owner.user.id },
    });
    expect(smuggle.statusCode).toBe(400);
    const sneaky = await api(ctx, 'POST', '/v1/me/withdrawals', other, {
      body: { amountPaise: 10_000, userId: owner.user.id },
      key: randomUUID(),
    });
    expect(sneaky.statusCode).toBe(400);
  });
});
