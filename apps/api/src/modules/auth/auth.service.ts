import {
  type AdminLoginInput,
  CURRENT_POLICY_VERSION,
  type LoginInput,
  type Me,
  RATE_LIMITS,
  type RegisterInput,
  type ResetPasswordInput,
  type SendOtpInput,
  emailSchema,
  phoneSchema,
} from '@supporters/shared';
import type { PrismaClient, User } from '../../generated/prisma/client';
import {
  AppError,
  ErrorCode,
  invalidField,
  isUniqueViolation,
  rateLimited,
} from '../../lib/errors';
import type { SlidingWindowLimiter } from '../../lib/sliding-window';
import type { Redis } from 'ioredis';
import { openSecret } from '../../lib/secret-box';
import { TOTP, matchTotp } from '../../lib/totp';
import { writeAudit } from '../admin/audit.service';
import { usedTotpKey } from './auth.constants';
import { toMe } from '../users/users.service';
import { recordEvent } from '../notifications/outbox';
import type { ReferralsService } from '../referrals/referrals.service';
import { NO_SIGNALS, type SignupSignals } from '../referrals/referrals.signals';
import type { OtpService } from './otp.service';
import {
  type BreachedPasswordChecker,
  assertNotBreached,
  hashPassword,
  verifyPassword,
} from './passwords';
import type { ClientMeta, IssuedSession, SessionService } from './session.service';

export interface SignedIn {
  user: Me;
  session: IssuedSession;
}

const invalidCredentials = () =>
  new AppError(401, ErrorCode.InvalidCredentials, 'Incorrect mobile number, email or password');
/** One answer for every admin sign-in failure, so none can be told apart. */
const invalidAdminCredentials = () =>
  new AppError(401, ErrorCode.InvalidCredentials, 'Incorrect sign-in details');

export class AuthService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly valkey: Redis,
    private readonly limiter: SlidingWindowLimiter,
    private readonly otp: OtpService,
    private readonly sessions: SessionService,
    private readonly breachChecker: BreachedPasswordChecker,
    /** Opens admin TOTP secrets; admin sign-in is off without it. */
    private readonly totpKey?: Buffer,
    /** Records the referral at signup; without it a referral code is ignored. */
    private readonly referrals?: ReferralsService,
  ) {}

  /**
   * Always answers the same way. A signup code goes only to numbers without an
   * account, a reset code only to active accounts, so the response never
   * reveals whether a number is registered.
   */
  async sendOtp(input: SendOtpInput, meta: ClientMeta) {
    await this.otp.checkSendLimits(input.phone, meta.ip);
    const user = await this.prisma.user.findUnique({
      where: { phone: input.phone },
      select: { status: true },
    });
    if (input.purpose === 'signup' && !user) await this.otp.issue('signup', input.phone);
    if (input.purpose === 'reset' && user?.status === 'active') {
      await this.otp.issue('login_reset', input.phone);
    }
  }

  async register(
    input: RegisterInput,
    meta: ClientMeta,
    signals: SignupSignals = NO_SIGNALS,
  ): Promise<SignedIn> {
    if (input.policyVersion !== CURRENT_POLICY_VERSION) {
      throw new AppError(400, ErrorCode.PolicyVersionOutdated, 'Accept the latest terms', {
        detail: 'The terms and privacy policy have changed. Reload and accept them again.',
      });
    }
    // Before the OTP is consumed, so a rejected password doesn't burn the code.
    await assertNotBreached(this.breachChecker, input.password);
    // Also before the OTP: a mistyped code is fixed without asking for a new one.
    const referrer =
      input.referralCode && this.referrals
        ? await this.referrals.resolveCode(input.referralCode)
        : null;
    if (input.referralCode && this.referrals && !referrer) {
      throw invalidField('referralCode', 'This referral code is not valid');
    }
    await this.otp.verify('signup', input.phone, input.otp);

    const passwordHash = await hashPassword(input.password);
    let user: User;
    try {
      user = await this.prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            name: input.name,
            phone: input.phone,
            passwordHash,
            consents: { create: { policyVersion: input.policyVersion, ip: meta.ip } },
          },
        });
        if (referrer && this.referrals) {
          await this.referrals.recordSignup(tx, {
            referrerUserId: referrer.userId,
            referredUserId: created.id,
            phone: input.phone,
            ip: meta.ip,
            signals,
          });
        }
        return created;
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new AppError(409, ErrorCode.PhoneTaken, 'This number already has an account', {
          detail: 'Sign in instead.',
        });
      }
      throw error;
    }

    const session = await this.sessions.create(user, meta);
    return { user: toMe(user), session };
  }

  /**
   * 5 attempts per minute per IP; 10 failures per hour per account, then a 15
   * minute lockout. Unknown accounts get the same error, the same argon2 work
   * and the same lockout as real ones.
   */
  async login(input: LoginInput, meta: ClientMeta): Promise<SignedIn> {
    const { user } = await this.checkPassword(input, meta);
    if (user.status === 'suspended') {
      throw new AppError(403, ErrorCode.AccountSuspended, 'This account is suspended');
    }
    if (user.role === 'admin') {
      // Admins sign in only at /v1/admin/auth/login, with TOTP (backend spec, Security: Admin).
      throw new AppError(403, ErrorCode.MfaRequired, 'Use the admin sign-in');
    }

    // The new-login security alert commits with the session (product spec, Notifications).
    const session = await this.prisma.$transaction(async (tx) => {
      const issued = await this.sessions.create(user, meta, tx);
      await recordEvent(tx, 'security.login', { userId: user.id, sessionId: issued.sessionId });
      return issued;
    });
    return { user: toMe(user), session };
  }

  /**
   * Admin sign-in (backend spec, Security: Admin): password plus a TOTP code
   * at every login, with the same per-IP limit and account lockout as `login`.
   * A non-admin account, a wrong code and a reused code all get the same 401
   * and count as a failure. The session lasts 8 hours and has no refresh.
   */
  async loginAdmin(
    input: AdminLoginInput,
    meta: ClientMeta,
  ): Promise<{ user: Me; session: { sessionId: string; expiresAt: Date } }> {
    if (!this.totpKey) {
      throw new AppError(503, ErrorCode.ServiceUnavailable, 'Admin sign-in is not configured');
    }
    const { user, recordFailure } = await this.checkPassword(input, meta).catch(
      (error: unknown) => {
        throw error instanceof AppError && error.code === ErrorCode.InvalidCredentials
          ? invalidAdminCredentials()
          : error;
      },
    );
    const secret =
      user.role === 'admin' && user.totpSecret
        ? openSecret(this.totpKey, user.totpSecret, user.id)
        : null;
    const step = secret ? matchTotp(secret, input.code) : null;
    // A code works once: the step is claimed for longer than the ±1 step it stays valid.
    const isFresh =
      step !== null &&
      (await this.valkey.set(usedTotpKey(user.id, step), '1', 'EX', TOTP.stepSec * 4, 'NX')) ===
        'OK';
    if (user.role !== 'admin' || !isFresh) {
      await recordFailure();
      throw invalidAdminCredentials();
    }
    if (user.status !== 'active') {
      throw new AppError(403, ErrorCode.AccountSuspended, 'This account is suspended');
    }

    const session = await this.prisma.$transaction(async (tx) => {
      const issued = await this.sessions.createAdmin(user, meta, tx);
      await recordEvent(tx, 'security.login', { userId: user.id, sessionId: issued.sessionId });
      await writeAudit(
        tx,
        { userId: user.id, ip: meta.ip, userAgent: meta.userAgent?.slice(0, 512) ?? null },
        { action: 'admin.login', targetType: 'session', targetId: issued.sessionId },
      );
      return issued;
    });
    return { user: toMe(user), session };
  }

  /**
   * 5 attempts per minute per IP; 10 failures per hour per account, then a 15
   * minute lockout. Unknown accounts get the same error, the same argon2 work
   * and the same lockout as real ones. Returns the user and a way to count a
   * later failure (a wrong TOTP code) against the same account.
   */
  private async checkPassword(input: { identifier: string; password: string }, meta: ClientMeta) {
    const perIp = await this.limiter.hit(
      `login:ip:${meta.ip}`,
      RATE_LIMITS.loginPerIp.max,
      RATE_LIMITS.loginPerIp.windowSec,
    );
    if (!perIp.allowed) throw rateLimited(perIp.resetMs / 1000);

    const user = await this.findByIdentifier(input.identifier);
    const accountKey = user ? `user:${user.id}` : `identifier:${input.identifier.toLowerCase()}`;
    const lockKey = `login:lock:${accountKey}`;

    const lockedFor = await this.valkey.ttl(lockKey);
    if (lockedFor > 0) throw rateLimited(lockedFor);

    const { max, windowSec } = RATE_LIMITS.loginPerAccount;
    const failures = await this.limiter.peek(`login:fail:${accountKey}`, max, windowSec);
    if (!failures.allowed) {
      await this.valkey.set(lockKey, '1', 'EX', RATE_LIMITS.loginLockoutSec);
      throw rateLimited(RATE_LIMITS.loginLockoutSec);
    }

    const recordFailure = async () => {
      await this.limiter.hit(`login:fail:${accountKey}`, max, windowSec);
    };
    if (!(await verifyPassword(user?.passwordHash, input.password)) || !user) {
      await recordFailure();
      throw invalidCredentials();
    }
    return { user, recordFailure };
  }

  /** Sets a new password after a reset OTP, then signs out every session. */
  async resetPassword(input: ResetPasswordInput) {
    await assertNotBreached(this.breachChecker, input.newPassword);
    await this.otp.verify('login_reset', input.phone, input.otp);

    const user = await this.prisma.user.findUnique({ where: { phone: input.phone } });
    if (!user || user.status !== 'active') {
      throw new AppError(400, ErrorCode.OtpInvalid, 'Incorrect or expired code');
    }
    const passwordHash = await hashPassword(input.newPassword);
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: user.id }, data: { passwordHash } });
      await recordEvent(tx, 'security.password_changed', { userId: user.id });
    });
    await this.sessions.revokeAllForUser(user.id);
  }

  /** Phone, or a verified email. Deleted accounts are treated as unknown. */
  private async findByIdentifier(identifier: string): Promise<User | null> {
    const phone = phoneSchema.safeParse(identifier);
    if (phone.success) {
      const user = await this.prisma.user.findUnique({ where: { phone: phone.data } });
      return user?.status === 'deleted' ? null : user;
    }
    const email = emailSchema.safeParse(identifier);
    if (email.success) {
      const user = await this.prisma.user.findFirst({
        where: { email: email.data, emailVerifiedAt: { not: null } },
      });
      return user?.status === 'deleted' ? null : user;
    }
    return null;
  }
}
