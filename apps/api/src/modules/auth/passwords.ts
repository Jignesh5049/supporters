import { createHash } from 'node:crypto';
import argon2 from 'argon2';
import type { FastifyBaseLogger } from 'fastify';
import { randomToken } from '../../lib/crypto';
import { AppError, ErrorCode } from '../../lib/errors';
import { ARGON2_OPTIONS } from './auth.constants';

export const hashPassword = (password: string) =>
  argon2.hash(password, { type: argon2.argon2id, ...ARGON2_OPTIONS });

/** A real argon2id hash of a random value, verified when the account doesn't exist so timing matches. */
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= hashPassword(randomToken()));

/** Constant work whether or not the account exists (backend spec, Login abuse). */
export async function verifyPassword(hash: string | undefined, password: string): Promise<boolean> {
  try {
    const matches = await argon2.verify(hash ?? (await getDummyHash()), password);
    return hash !== undefined && matches;
  } catch {
    return false;
  }
}

export interface BreachedPasswordChecker {
  isBreached(password: string): Promise<boolean>;
}

/**
 * Have I Been Pwned range API: only the first 5 hex characters of the SHA-1
 * leave the server (k-anonymity), with padding so response size leaks nothing.
 * Fails open with a warning, so an HIBP outage doesn't block signups.
 */
export class HibpPasswordChecker implements BreachedPasswordChecker {
  constructor(private readonly log: FastifyBaseLogger) {}

  async isBreached(password: string): Promise<boolean> {
    const digest = createHash('sha1').update(password).digest('hex').toUpperCase();
    const prefix = digest.slice(0, 5);
    const suffix = digest.slice(5);
    try {
      const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
        headers: { 'Add-Padding': 'true', 'User-Agent': 'supporters-api' },
        signal: AbortSignal.timeout(2_000),
      });
      if (!response.ok) throw new Error(`HIBP responded ${response.status}`);
      const body = await response.text();
      return body.split('\n').some((line) => {
        const [hashSuffix, count] = line.trim().split(':');
        return hashSuffix === suffix && Number(count) > 0;
      });
    } catch (error) {
      this.log.warn({ err: error }, 'breached-password check unavailable; allowing password');
      return false;
    }
  }
}

export class DisabledPasswordChecker implements BreachedPasswordChecker {
  async isBreached() {
    return false;
  }
}

export async function assertNotBreached(checker: BreachedPasswordChecker, password: string) {
  if (await checker.isBreached(password)) {
    throw new AppError(400, ErrorCode.PasswordBreached, 'Choose a different password', {
      detail: 'This password has appeared in a data breach.',
    });
  }
}
