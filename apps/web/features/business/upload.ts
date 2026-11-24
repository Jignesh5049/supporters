import {
  MEDIA_LIMITS,
  type Media,
  type PresignUploadInput,
  type Upload,
  type UploadPurpose,
  presignUploadSchema,
  isUploadSettled,
  presignedUploadSchema,
  uploadSchema,
} from '@supporters/shared';
import { api } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';

/** What a file can't be, checked before asking the API (which checks again). */
export class UploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UploadError';
  }
}

export interface UploadDeps {
  request: typeof api.request;
  /** The direct PUT to storage: plain fetch, never the API client (no cookies, no CSRF). */
  put: typeof fetch;
  /** Waits between status polls; tests pass an instant one. */
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const defaultDeps: UploadDeps = {
  request: (...args) => api.request(...args),
  put: (...args) => fetch(...args),
};

/**
 * Polls `GET /v1/uploads/:id` while the media job re-encodes the file, backing off from
 * `MEDIA_LIMITS.poll.initialMs` by 1.5x up to `maxMs`. Resolves with the ready upload, throws the
 * API's reason for a failed one, and gives up after `timeoutMs` (the upload may still finish;
 * trying again is safe).
 */
export async function waitForUpload(
  upload: Upload,
  deps: UploadDeps = defaultDeps,
  onStatus?: (status: Upload['status']) => void,
): Promise<Upload> {
  const sleep = deps.sleep ?? defaultSleep;
  const { initialMs, maxMs, timeoutMs } = MEDIA_LIMITS.poll;
  let current = upload;
  let delay: number = initialMs;
  let waited = 0;
  while (!isUploadSettled(current.status)) {
    if (waited >= timeoutMs) {
      throw new ApiError({
        status: 504,
        code: 'UPLOAD_PROCESSING_TIMEOUT',
        title: 'The photo is taking too long to process. Try again.',
      });
    }
    await sleep(delay);
    waited += delay;
    delay = Math.min(Math.round(delay * 1.5), maxMs);
    current = uploadSchema.parse(await deps.request(`/v1/uploads/${upload.id}`));
    onStatus?.(current.status);
  }
  if (current.status !== 'ready') {
    throw new ApiError({
      status: 422,
      code: 'UPLOAD_REJECTED',
      title: current.failureMessage ?? 'Upload rejected',
    });
  }
  return current;
}

/**
 * Uploads one file: `POST /v1/uploads/presign`, `PUT` the bytes straight to
 * storage with exactly the signed headers, `POST /v1/uploads/:id/complete`
 * (which checks the stored size and magic bytes and queues the media job), then
 * waits for the job. Returns the ready upload; `onStatus` sees `processing`
 * while it waits, for a progress indicator.
 */
export async function uploadFile(
  file: File,
  input: PresignUploadInput,
  deps: UploadDeps = defaultDeps,
  onStatus?: (status: Upload['status']) => void,
): Promise<Upload> {
  const presigned = presignedUploadSchema.parse(
    await deps.request('/v1/uploads/presign', { method: 'POST', body: input }),
  );

  let response: Response;
  try {
    response = await deps.put(presigned.url, {
      method: presigned.method,
      headers: presigned.headers,
      body: file,
      credentials: 'omit',
    });
  } catch {
    throw new ApiError({ status: 0, code: 'NETWORK_ERROR', title: 'Upload failed' });
  }
  if (!response.ok) {
    throw new ApiError({
      status: response.status,
      code: 'UPLOAD_INCOMPLETE',
      title: 'Upload failed',
    });
  }

  const upload = uploadSchema.parse(
    await deps.request(`/v1/uploads/${presigned.id}/complete`, { method: 'POST' }),
  );
  onStatus?.(upload.status);
  return waitForUpload(upload, deps, onStatus);
}

/** Uploads one public image (avatar, cover, listing or post) and returns its media. */
export async function uploadImage(
  file: File,
  purpose: UploadPurpose,
  deps: UploadDeps = defaultDeps,
): Promise<Media> {
  const input = presignUploadSchema.safeParse({
    purpose,
    contentType: file.type,
    size: file.size,
  });
  if (!input.success) {
    const issue = input.error.issues[0];
    throw new UploadError(
      issue?.path[0] === 'size'
        ? 'That image is too large. Use one under 10 MB.'
        : 'Use a JPEG, PNG or WebP image.',
    );
  }
  const upload = await uploadFile(file, input.data, deps);
  if (!upload.url) {
    throw new ApiError({ status: 422, code: 'UPLOAD_REJECTED', title: 'Upload rejected' });
  }
  return { id: upload.id, url: upload.url };
}

/** Uploads one private verification document (PDF, JPEG or PNG) and returns its upload id. */
export async function uploadKycFile(file: File, deps: UploadDeps = defaultDeps): Promise<string> {
  const input = presignUploadSchema.safeParse({
    purpose: 'kyc',
    contentType: file.type,
    size: file.size,
  });
  if (!input.success) {
    const issue = input.error.issues[0];
    throw new UploadError(
      issue?.path[0] === 'size'
        ? `${file.name} is too large. Use a file under 10 MB.`
        : `${file.name}: use a PDF, JPEG or PNG.`,
    );
  }
  return (await uploadFile(file, input.data, deps)).id;
}
