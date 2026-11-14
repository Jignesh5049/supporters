import { randomUUID } from 'node:crypto';
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
