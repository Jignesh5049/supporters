import { z } from 'zod';

/** RFC 9457 problem details as the API sends them (backend spec, API design). */
const problemSchema = z.object({
  title: z.string().optional(),
  status: z.number().optional(),
  detail: z.string().optional(),
  code: z.string().optional(),
  errors: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
});

export interface FieldError {
  path: string;
  message: string;
}

export class ApiError extends Error {
  readonly status: number;
  /** The API's UPPER_SNAKE_CASE code, or NETWORK_ERROR / UNKNOWN from the client. */
  readonly code: string;
  readonly detail: string | undefined;
  readonly fieldErrors: FieldError[];
  /** Seconds from `Retry-After`, when the API sent it. */
  readonly retryAfter: number | undefined;

  constructor(init: {
    status: number;
    code: string;
    title: string;
    detail?: string;
    fieldErrors?: FieldError[];
    retryAfter?: number;
  }) {
    super(init.title);
    this.name = 'ApiError';
    this.status = init.status;
    this.code = init.code;
    this.detail = init.detail;
    this.fieldErrors = init.fieldErrors ?? [];
    this.retryAfter = init.retryAfter;
  }
}

export async function toApiError(response: Response): Promise<ApiError> {
  const retryAfterHeader = Number(response.headers.get('retry-after'));
  const retryAfter =
    Number.isFinite(retryAfterHeader) && retryAfterHeader > 0 ? retryAfterHeader : undefined;
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // Not JSON (a proxy error page, say): fall back to the status alone.
  }
  const problem = problemSchema.safeParse(body);
  const data = problem.success ? problem.data : {};
  return new ApiError({
    status: response.status,
    code: data.code ?? 'UNKNOWN',
    title: data.title ?? response.statusText,
    detail: data.detail,
    fieldErrors: data.errors,
    retryAfter,
  });
}

/** User-facing copy per error code. The API's own titles are generic on purpose. */
const MESSAGES: Record<string, string> = {
  NETWORK_ERROR: 'Could not reach Supporters. Check your connection and try again.',
  VALIDATION_FAILED: 'Some details look wrong. Check the highlighted fields.',
  UNAUTHENTICATED: 'Your session has ended. Sign in again.',
  INVALID_REFRESH_TOKEN: 'Your session has ended. Sign in again.',
  CSRF_FAILED: 'This page is out of date. Reload it and try again.',
  INVALID_CREDENTIALS: 'That number, email or password is wrong.',
  ACCOUNT_SUSPENDED: 'This account is suspended. Contact support for help.',
  OTP_INVALID: 'That code is wrong or has expired.',
  OTP_ATTEMPTS_EXCEEDED: 'Too many wrong codes. Request a new one.',
  PHONE_TAKEN: 'This number already has an account. Sign in instead.',
  PASSWORD_BREACHED: 'This password has appeared in a data breach. Choose another.',
  POLICY_VERSION_OUTDATED: 'Our terms have changed. Reload the page to see the latest version.',
  SERVICE_UNAVAILABLE: 'Supporters is busy right now. Try again shortly.',
  NOT_FOUND: 'We could not find that. It may have been removed.',
  BUSINESS_EXISTS: 'You already have a business page. Each account can have one.',
  BUSINESS_REQUIRED: 'Create your business page first.',
  SLUG_TAKEN: 'That page link is taken. Try another.',
  SLUG_LOCKED: 'Your page link is locked while your business is verified.',
  LISTING_LIMIT_REACHED:
    'You have reached the free plan limit for published listings. Save this as a draft, unpublish another listing, or upgrade to Premium.',
  UPLOAD_INCOMPLETE: 'The image did not finish uploading. Try again.',
  UPLOAD_REJECTED: 'That file is not a supported image. Use a JPEG, PNG or WebP photo.',
  PAYLOAD_TOO_LARGE: 'That file is too large.',
};

/** API field paths (`body.price.amountPaise`) to form field names (`price.amountPaise`). */
export function formFieldErrors(error: unknown): { name: string; message: string }[] {
  if (!(error instanceof ApiError)) return [];
  return error.fieldErrors
    .filter((field) => field.path.startsWith('body.'))
    .map((field) => ({ name: field.path.slice('body.'.length), message: field.message }));
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'RATE_LIMITED') {
      return error.retryAfter
        ? `Too many attempts. Try again in ${Math.ceil(error.retryAfter / 60)} min.`
        : 'Too many attempts. Wait a moment and try again.';
    }
    return MESSAGES[error.code] ?? 'Something went wrong. Try again.';
  }
  return 'Something went wrong. Try again.';
}
