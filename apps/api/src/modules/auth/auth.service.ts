import {
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
import { AppError, ErrorCode, isUniqueViolation, rateLimited } from '../../lib/errors';
import type { SlidingWindowLimiter } from '../../lib/sliding-window';
import type { Redis } from 'ioredis';
import { toMe } from '../users/users.service';
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

export class AuthService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly valkey: Redis,
    private readonly limiter: SlidingWindowLimiter,
    private readonly otp: OtpService,
    private readonly sessions: SessionService,
    private readonly breachChecker: BreachedPasswordChecker,
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

  async register(input: RegisterInput, meta: ClientMeta): Promise<SignedIn> {
    if (input.policyVersion !== CURRENT_POLICY_VERSION) {
      throw new AppError(400, ErrorCode.PolicyVersionOutdated, 'Accept the latest terms', {
        detail: 'The terms and privacy policy have changed. Reload and accept them again.',
      });
    }
    // Before the OTP is consumed, so a rejected password doesn't burn the code.
    await assertNotBreached(this.breachChecker, input.password);
    await this.otp.verify('signup', input.phone, input.otp);

    const passwordHash = await hashPassword(input.password);
    let user: User;
    try {
      user = await this.prisma.user.create({
        data: {
          name: input.name,
          phone: input.phone,
          passwordHash,
          consents: { create: { policyVersion: input.policyVersion, ip: meta.ip } },
        },
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

    if (!(await verifyPassword(user?.passwordHash, input.password)) || !user) {
      await this.limiter.hit(`login:fail:${accountKey}`, max, windowSec);
      throw invalidCredentials();
    }
    if (user.status === 'suspended') {
      throw new AppError(403, ErrorCode.AccountSuspended, 'This account is suspended');
    }
    if (user.role === 'admin') {
      // Admin sign-in needs TOTP and 8-hour sessions without refresh; that flow ships separately.
      throw new AppError(403, ErrorCode.MfaRequired, 'Use the admin sign-in');
    }

    const session = await this.sessions.create(user, meta);
    return { user: toMe(user), session };
  }

  /** Sets a new password after a reset OTP, then signs out every session. */
  async resetPassword(input: ResetPasswordInput) {
    await assertNotBreached(this.breachChecker, input.newPassword);
    await this.otp.verify('login_reset', input.phone, input.otp);

    const user = await this.prisma.user.findUnique({ where: { phone: input.phone } });
    if (!user || user.status !== 'active') {
      throw new AppError(400, ErrorCode.OtpInvalid, 'Incorrect or expired code');
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(input.newPassword) },
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
