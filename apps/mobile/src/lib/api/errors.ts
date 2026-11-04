import { PLAN_LIMITS } from '@supporters/shared';
import { z } from 'zod';

/**
 * Problem-details codes the app reacts to. Server codes mirror `apps/api/src/lib/errors.ts`;
 * the last three are raised by the client itself.
 */
export const ApiErrorCode = {
  ValidationFailed: 'VALIDATION_FAILED',
  Unauthenticated: 'UNAUTHENTICATED',
  Forbidden: 'FORBIDDEN',
  NotFound: 'NOT_FOUND',
  RateLimited: 'RATE_LIMITED',
  InvalidCredentials: 'INVALID_CREDENTIALS',
  AccountSuspended: 'ACCOUNT_SUSPENDED',
  OtpInvalid: 'OTP_INVALID',
  OtpAttemptsExceeded: 'OTP_ATTEMPTS_EXCEEDED',
  PhoneTaken: 'PHONE_TAKEN',
  PostLimitReached: 'POST_LIMIT_REACHED',
  PasswordBreached: 'PASSWORD_BREACHED',
  PolicyVersionOutdated: 'POLICY_VERSION_OUTDATED',
  InvalidRefreshToken: 'INVALID_REFRESH_TOKEN',
  ServiceUnavailable: 'SERVICE_UNAVAILABLE',
  NetworkError: 'NETWORK_ERROR',
  InvalidResponse: 'INVALID_RESPONSE',
  UpgradeRequired: 'UPGRADE_REQUIRED',
} as const;

/** RFC 9457 problem details as the API sends them (backend spec, Errors). */
export const problemSchema = z.object({
  status: z.number().int(),
  code: z.string(),
  requestId: z.string().optional(),
  errors: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
});

export interface FieldError {
  path: string;
  message: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors: FieldError[];
  readonly requestId: string | undefined;
  readonly retryAfterSec: number | undefined;

  constructor(
    status: number,
    code: string,
    options: { fieldErrors?: FieldError[]; requestId?: string; retryAfterSec?: number } = {},
  ) {
    super(code);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fieldErrors = options.fieldErrors ?? [];
    this.requestId = options.requestId;
    this.retryAfterSec = options.retryAfterSec;
  }
}

/** Builds an ApiError from a failed response. Raw server text is never kept. */
export async function toApiError(response: Response): Promise<ApiError> {
  const retryAfter = Number(response.headers.get('retry-after'));
  const retryAfterSec = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined;
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // Not JSON (a proxy error page, say): fall back to the status alone.
  }
  const problem = problemSchema.safeParse(body);
  if (!problem.success) {
    return new ApiError(response.status, fallbackCode(response.status), { retryAfterSec });
  }
  return new ApiError(response.status, problem.data.code, {
    fieldErrors: problem.data.errors,
    requestId: problem.data.requestId,
    retryAfterSec,
  });
}

function fallbackCode(status: number): string {
  if (status === 401) return ApiErrorCode.Unauthenticated;
  if (status === 403) return ApiErrorCode.Forbidden;
  if (status === 404) return ApiErrorCode.NotFound;
  if (status === 429) return ApiErrorCode.RateLimited;
  if (status === 503) return ApiErrorCode.ServiceUnavailable;
  return ApiErrorCode.InvalidResponse;
}

const MESSAGES: Record<string, string> = {
  [ApiErrorCode.ValidationFailed]: 'Some details look wrong. Check them and try again.',
  [ApiErrorCode.Unauthenticated]: 'Your session has ended. Sign in again.',
  [ApiErrorCode.InvalidRefreshToken]: 'Your session has ended. Sign in again.',
  [ApiErrorCode.Forbidden]: "You don't have access to this.",
  [ApiErrorCode.NotFound]: "We couldn't find that.",
  [ApiErrorCode.RateLimited]: 'Too many attempts. Wait a moment and try again.',
  [ApiErrorCode.InvalidCredentials]: "That mobile number or email and password don't match.",
  [ApiErrorCode.AccountSuspended]: 'This account is suspended. Contact support for help.',
  [ApiErrorCode.OtpInvalid]: 'That code is wrong or has expired.',
  [ApiErrorCode.OtpAttemptsExceeded]: 'Too many wrong codes. Request a new one.',
  [ApiErrorCode.PhoneTaken]: 'An account with this mobile number already exists. Sign in instead.',
  [ApiErrorCode.PostLimitReached]: `The free plan allows ${PLAN_LIMITS.free.postsPer7Days} published posts in any 7 days. Try again when an older post is more than 7 days old, or save this one as a draft.`,
  [ApiErrorCode.PasswordBreached]:
    'This password has appeared in a data breach. Choose a different one.',
  [ApiErrorCode.PolicyVersionOutdated]: 'Our terms have changed. Update the app to continue.',
  [ApiErrorCode.ServiceUnavailable]: 'Supporters is busy right now. Try again shortly.',
  [ApiErrorCode.NetworkError]: 'No connection. Check your internet and try again.',
  [ApiErrorCode.UpgradeRequired]: 'Update the app to keep using Supporters.',
};

const GENERIC_MESSAGE = 'Something went wrong. Try again.';

/** A user-facing message for any thrown value, keyed by the problem `code`. */
export function messageForError(error: unknown): string {
  if (!(error instanceof ApiError)) return GENERIC_MESSAGE;
  return MESSAGES[error.code] ?? GENERIC_MESSAGE;
}
