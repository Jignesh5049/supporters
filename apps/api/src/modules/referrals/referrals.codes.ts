import { randomInt } from 'node:crypto';
import { REFERRAL_CODE_ALPHABET, REFERRAL_CODE_LENGTH } from '@supporters/shared';
import type { PrismaClient } from '../../generated/prisma/client';
import { isUniqueViolation } from '../../lib/errors';

/** 8 characters from 31 symbols: about 8.5e11 codes, drawn from a CSPRNG. */
export function generateReferralCode(): string {
  let code = '';
  for (let i = 0; i < REFERRAL_CODE_LENGTH; i += 1) {
    code += REFERRAL_CODE_ALPHABET.charAt(randomInt(REFERRAL_CODE_ALPHABET.length));
  }
  return code;
}

/** The user's code, created on first use. A collision (or a racing request) retries. */
export async function ensureReferralCode(prisma: PrismaClient, userId: string): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const existing = await prisma.referralCode.findUnique({ where: { userId } });
    if (existing) return existing.code;
    try {
      return (await prisma.referralCode.create({ data: { userId, code: generateReferralCode() } }))
        .code;
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }
  }
  throw new Error('could not allocate a referral code');
}
