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
