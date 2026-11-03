import {
  type Media,
  type UploadPurpose,
  presignUploadSchema,
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
}

const defaultDeps: UploadDeps = {
  request: (...args) => api.request(...args),
  put: (...args) => fetch(...args),
};

/**
 * Uploads one image: `POST /v1/uploads/presign`, `PUT` the bytes straight to
 * storage with exactly the signed headers, then `POST /v1/uploads/:id/complete`,
 * which checks the stored size and magic bytes. Returns the ready media.
 */
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
        : 'Use a JPEG, PNG, WebP or HEIC image.',
    );
  }

  const presigned = presignedUploadSchema.parse(
    await deps.request('/v1/uploads/presign', { method: 'POST', body: input.data }),
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
  if (upload.status !== 'ready' || !upload.url) {
    throw new ApiError({ status: 422, code: 'UPLOAD_REJECTED', title: 'Upload rejected' });
  }
  return { id: upload.id, url: upload.url };
}
