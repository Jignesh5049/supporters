/**
 * Errors clients can branch on. Each maps to an RFC 9457 problem type at
 * `<APP_ORIGIN>/errors/<code in kebab-case>` (backend spec, API design).
 */
export const ErrorCode = {
  ValidationFailed: 'VALIDATION_FAILED',
  MalformedRequest: 'MALFORMED_REQUEST',
  PayloadTooLarge: 'PAYLOAD_TOO_LARGE',
  UnsupportedMediaType: 'UNSUPPORTED_MEDIA_TYPE',
  Unauthenticated: 'UNAUTHENTICATED',
  Forbidden: 'FORBIDDEN',
  CsrfFailed: 'CSRF_FAILED',
  NotFound: 'NOT_FOUND',
  RateLimited: 'RATE_LIMITED',
  InvalidCredentials: 'INVALID_CREDENTIALS',
  AccountSuspended: 'ACCOUNT_SUSPENDED',
  MfaRequired: 'MFA_REQUIRED',
  OtpInvalid: 'OTP_INVALID',
  OtpAttemptsExceeded: 'OTP_ATTEMPTS_EXCEEDED',
  PhoneTaken: 'PHONE_TAKEN',
  PasswordBreached: 'PASSWORD_BREACHED',
  PolicyVersionOutdated: 'POLICY_VERSION_OUTDATED',
  InvalidRefreshToken: 'INVALID_REFRESH_TOKEN',
  ServiceUnavailable: 'SERVICE_UNAVAILABLE',
  InternalError: 'INTERNAL_ERROR',
} as const;
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export interface FieldError {
  path: string;
  message: string;
}

interface AppErrorOptions {
  detail?: string;
  errors?: FieldError[];
  /** Seconds, sent as `Retry-After`. */
  retryAfter?: number;
  cause?: unknown;
}

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: ErrorCode;
  readonly title: string;
  readonly detail: string | undefined;
  readonly errors: FieldError[] | undefined;
  readonly retryAfter: number | undefined;

  constructor(statusCode: number, code: ErrorCode, title: string, options: AppErrorOptions = {}) {
    super(title, { cause: options.cause });
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.title = title;
    this.detail = options.detail;
    this.errors = options.errors;
    this.retryAfter = options.retryAfter;
  }
}

export const unauthenticated = () =>
  new AppError(401, ErrorCode.Unauthenticated, 'Sign in to continue');

export const rateLimited = (retryAfter: number) =>
  new AppError(429, ErrorCode.RateLimited, 'Too many requests', {
    detail: 'Wait before trying again.',
    retryAfter,
  });

export const isUniqueViolation = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
