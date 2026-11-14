import { ADMIN_LIMITS } from '@supporters/shared';

/** Token lifetimes from the backend spec (Security, Authentication and sessions). */
export const ACCESS_TOKEN_TTL_SEC = 15 * 60;
export const REFRESH_TOKEN_TTL_SEC = 30 * 24 * 60 * 60;
export const REFRESH_TOKEN_ABSOLUTE_TTL_SEC = 90 * 24 * 60 * 60;
/** A just-rotated refresh token still returns the same new pair for this long. */
export const REFRESH_GRACE_SEC = 10;

/** argon2id parameters (OWASP minimum: 19 MiB, t=2, p=1). */
export const ARGON2_OPTIONS = { memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

/** Valkey key marking a session revoked. It only has to outlive the last access token. */
export const revokedSessionKey = (sessionId: string) => `revoked:sid:${sessionId}`;

/**
 * How long a revocation marker lives: past the longest access token, which is
 * an admin's (8 h, no refresh), plus clock-skew margin.
 */
export const REVOKED_MARKER_TTL_SEC = ADMIN_LIMITS.sessionTtlSec + 60;

/** Valkey key recording a used admin TOTP step, so a code works once (replay). */
export const usedTotpKey = (userId: string, step: number) => `totp:used:${userId}:${step}`;

/** Pub/sub channel that tells every API instance to drop the sockets of a revoked session. */
export const SESSION_REVOKED_CHANNEL = 'session:revoked';
