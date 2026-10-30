import { OTP, RATE_LIMITS } from '@supporters/shared';
import type { FastifyBaseLogger } from 'fastify';
import type { Redis } from 'ioredis';
import type { OtpPurpose, PrismaClient } from '../../generated/prisma/client';
import { hmacSha256, randomDigits, safeEqual } from '../../lib/crypto';
import { AppError, ErrorCode, rateLimited } from '../../lib/errors';
import type { SlidingWindowLimiter } from '../../lib/sliding-window';
import type { SmsSender } from './sms';

const otpInvalid = () =>
  new AppError(400, ErrorCode.OtpInvalid, 'Incorrect or expired code', {
    detail: 'Check the code, or request a new one.',
  });

export class OtpService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly valkey: Redis,
    private readonly limiter: SlidingWindowLimiter,
    private readonly sms: SmsSender,
    private readonly hmacKey: Buffer,
    private readonly log: FastifyBaseLogger,
  ) {}

  private hash(purpose: OtpPurpose, target: string, code: string) {
    return hmacSha256(this.hmacKey, `${purpose}:${target}:${code}`);
  }

  /**
   * Applies the send limits (1 per 30 s and 5 per hour per target, 20 per hour
   * per IP). Called for every request, before the caller decides whether to
   * actually send, so the limits reveal nothing about which numbers exist.
   */
  async checkSendLimits(target: string, ip: string) {
    const perIp = await this.limiter.hit(
      `otp:ip:${ip}`,
      RATE_LIMITS.otpSendPerIp.max,
      RATE_LIMITS.otpSendPerIp.windowSec,
    );
    if (!perIp.allowed) throw rateLimited(perIp.resetMs / 1000);

    const cooldownKey = `otp:cooldown:${target}`;
    const cooled = await this.valkey.set(
      cooldownKey,
      '1',
      'EX',
      RATE_LIMITS.otpSendCooldownSec,
      'NX',
    );
    if (cooled !== 'OK') throw rateLimited(Math.max(1, await this.valkey.ttl(cooldownKey)));

    const perTarget = await this.limiter.hit(
      `otp:target:${target}`,
      RATE_LIMITS.otpSendPerTarget.max,
      RATE_LIMITS.otpSendPerTarget.windowSec,
    );
    if (!perTarget.allowed) throw rateLimited(perTarget.resetMs / 1000);
  }

  /** Issues a fresh code (older unused codes for the same target and purpose stop working). */
  async issue(purpose: OtpPurpose, phone: string) {
    const code = randomDigits(OTP.digits);
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.otpCode.updateMany({
        where: { target: phone, purpose, consumedAt: null },
        data: { consumedAt: now },
      }),
      this.prisma.otpCode.create({
        data: {
          purpose,
          target: phone,
          codeHash: this.hash(purpose, phone, code),
          expiresAt: new Date(now.getTime() + OTP.ttlSec * 1000),
        },
      }),
    ]);
    // Not awaited: response time must not depend on the SMS provider, or it
    // would reveal whether a code was sent. Production moves this to a queue.
    this.sms.sendOtp(phone, code).catch((error: unknown) => {
      this.log.error({ err: error, purpose }, 'otp sms failed');
    });
  }

  /** Consumes a code, or throws. Each check counts as an attempt; the fifth wrong one kills the code. */
  async verify(purpose: OtpPurpose, target: string, code: string) {
    const now = new Date();
    const otp = await this.prisma.otpCode.findFirst({
      where: { target, purpose, consumedAt: null, expiresAt: { gt: now } },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp) throw otpInvalid();

    const counted = await this.prisma.otpCode.updateMany({
      where: { id: otp.id, consumedAt: null, attempts: { lt: RATE_LIMITS.otpVerifyAttempts } },
      data: { attempts: { increment: 1 } },
    });
    if (counted.count === 0) {
      throw new AppError(400, ErrorCode.OtpAttemptsExceeded, 'Too many incorrect codes', {
        detail: 'Request a new code.',
      });
    }

    if (!safeEqual(this.hash(purpose, target, code), otp.codeHash)) throw otpInvalid();

    const consumed = await this.prisma.otpCode.updateMany({
      where: { id: otp.id, consumedAt: null },
      data: { consumedAt: now },
    });
    if (consumed.count === 0) throw otpInvalid();
  }
}
