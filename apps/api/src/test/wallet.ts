import { randomBytes, randomUUID } from 'node:crypto';
import { CURRENT_POLICY_VERSION } from '@supporters/shared';
import { recordEvent } from '../modules/notifications/outbox';
import { ReferralsService } from '../modules/referrals/referrals.service';
import {
  type MobileSession,
  PASSWORD,
  type TestContext,
  nextIp,
  nextPhone,
  prisma,
  registerMobile,
  sendOtp,
} from './helpers';

/** A clock the test moves by hand (the 7-day refund window is tested without waiting). */
export class TestClock {
  constructor(public current = new Date('2027-01-10T10:00:00.000Z')) {}
  readonly now = () => new Date(this.current);
  advance(ms: number) {
    this.current = new Date(this.current.getTime() + ms);
  }
}
export const DAY = 24 * 3_600_000;

export const referralsWith = (ctx: TestContext, clock: TestClock) =>
  new ReferralsService(prisma, ctx.env.OTP_HMAC_KEY, clock.now);

/** Asks for the user's code through the real endpoint. */
export async function codeOf(ctx: TestContext, user: MobileSession): Promise<string> {
  const response = await ctx.app.inject({
    method: 'GET',
    url: '/v1/me/referrals',
    headers: { authorization: `Bearer ${user.accessToken}` },
    remoteAddress: nextIp(),
  });
  return response.json<{ code: string }>().code;
}

/** Signs up through the real flow with a referral code; returns the response too. */
export async function registerWithCode(ctx: TestContext, referralCode: string | undefined) {
  const phone = nextPhone();
  await sendOtp(ctx.app, phone);
  const response = await ctx.app.inject({
    method: 'POST',
    url: '/v1/auth/register',
    headers: { 'x-client': 'mobile' },
    remoteAddress: nextIp(),
    payload: {
      name: 'Ravi Kumar',
      phone,
      password: PASSWORD,
      otp: ctx.sms.lastCode(phone),
      policyVersion: CURRENT_POLICY_VERSION,
      ...(referralCode ? { referralCode } : {}),
    },
  });
  return { response, phone, userId: response.json<{ user?: { id: string } }>().user?.id };
}

/** What the Premium module will write when a payment is captured. */
export async function emitPremium(
  type: 'premium.activated' | 'premium.refunded',
  userId: string,
  occurredAt: Date,
  paymentId = randomUUID(),
) {
  const base = {
    businessId: randomUUID(),
    userId,
    paymentId,
    amountPaise: 99_900,
    occurredAt: occurredAt.toISOString(),
  };
  await prisma.$transaction(async (tx) => {
    if (type === 'premium.activated') await recordEvent(tx, type, base);
    else await recordEvent(tx, type, { ...base, refundId: randomUUID() });
  });
  return paymentId;
}

export const ledgerOf = (userId: string) =>
  prisma.walletLedger.findMany({ where: { userId }, orderBy: { id: 'asc' } });

/** A referrer plus `count` referred signups through the real endpoints. */
export async function referrerWithReferred(ctx: TestContext, count: number) {
  const referrer = await registerMobile(ctx);
  const code = await codeOf(ctx, referrer);
  const referred: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const { response, userId } = await registerWithCode(ctx, code);
    if (response.statusCode !== 201 || !userId) throw new Error(response.body);
    referred.push(userId);
  }
  return { referrer, code, referred };
}

/** Env for an app with payouts on and the fake provider. */
export const PAYOUT_TEST_KEY = randomBytes(32);
export const payoutEnv = {
  PAYOUTS_PROVIDER: 'fake',
  PAYOUT_ENCRYPTION_KEY: PAYOUT_TEST_KEY.toString('base64'),
};

export const BANK = { method: 'bank', accountNumber: '123456789012', ifsc: 'HDFC0001234' } as const;
export const UPI = { method: 'upi', upiId: 'ravi.kumar@okaxis' } as const;

type Method = 'GET' | 'POST' | 'PUT';
export function api(
  ctx: TestContext,
  method: Method,
  url: string,
  user?: MobileSession,
  options: { body?: object; key?: string | null } = {},
) {
  return ctx.app.inject({
    method,
    url,
    headers: {
      ...(user ? { authorization: `Bearer ${user.accessToken}` } : {}),
      ...(options.key === null ? {} : options.key ? { 'idempotency-key': options.key } : {}),
    },
    remoteAddress: nextIp(),
    ...(options.body ? { payload: options.body } : {}),
  });
}

/** Sets a payout account through the endpoint; the holder name defaults to the profile name. */
export function putAccount(
  ctx: TestContext,
  user: MobileSession,
  details: object = BANK,
  holderName = 'Ravi Kumar',
) {
  return api(ctx, 'PUT', '/v1/me/payout-account', user, { body: { ...details, holderName } });
}

/** Moves the live payout account's creation back, past the 24-hour withdrawal cooldown. */
export const ageAccount = (userId: string, hours = 25) =>
  prisma.$executeRaw`UPDATE payout_accounts SET created_at = created_at - make_interval(hours => ${hours}) WHERE user_id = ${userId}::uuid`;

/** Credits the wallet the way an admin bonus will (a ledger entry, nothing else). */
export const fund = (userId: string, paise: number) =>
  prisma.walletLedger.create({
    data: {
      userId,
      type: 'bonus',
      amountPaise: BigInt(paise),
      entryKey: `fund:${randomUUID()}`,
      description: 'test funds',
    },
  });

export const balanceOfUser = async (userId: string) =>
  (await prisma.walletLedger.aggregate({ where: { userId }, _sum: { amountPaise: true } }))._sum
    .amountPaise ?? 0n;

/** A user named "Ravi Kumar" who is ready to withdraw: account set and aged, wallet funded. */
export async function readyUser(ctx: TestContext, paise = 50_000) {
  const { response, phone } = await registerWithCode(ctx, undefined);
  const body = response.json<{ accessToken: string; refreshToken: string; user: { id: string } }>();
  const user: MobileSession = {
    phone,
    user: body.user,
    accessToken: body.accessToken,
    refreshToken: body.refreshToken,
    expiresIn: 900,
  };
  const set = await putAccount(ctx, user);
  if (set.statusCode !== 200) throw new Error(set.body);
  await ageAccount(user.user.id);
  if (paise > 0) await fund(user.user.id, paise);
  return user;
}
