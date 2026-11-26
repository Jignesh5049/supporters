import {
  MEDIA_LIMITS,
  UPLOAD_FAILURE_MESSAGES,
  isUploadSettled,
  presignUploadSchema,
  presignedUploadSchema,
  uploadSchema,
  type PresignUploadInput,
  type PresignedUpload,
  type Upload,
} from '@supporters/shared';
import type { ApiClient } from './client';
import { ApiError, ApiErrorCode } from './errors';

export interface UploadsApi {
  presign(data: PresignUploadInput): Promise<PresignedUpload>;
  complete(id: string): Promise<Upload>;
  /** One upload's current state, for polling. */
  get(id: string): Promise<Upload>;
  /**
   * Polls `get` while the media job runs (0.5 s, backing off 1.5x to 4 s, up to 90 s) and returns
   * the ready upload. Throws UPLOAD_REJECTED with the reason's text if the job failed, and
   * UPLOAD_PROCESSING_TIMEOUT if it did not finish in time.
   */
  waitUntilReady(upload: Upload, onStatus?: (status: Upload['status']) => void): Promise<Upload>;
  uploadToStorage(presigned: PresignedUpload, fileUri: string, contentType: string): Promise<void>;
  /** presign, PUT, complete in one go. The size sent to presign is the real size of the file. */
  uploadFile(
    fileUri: string,
    contentType: string,
    purpose: PresignUploadInput['purpose'],
    onStatus?: (status: Upload['status']) => void,
  ): Promise<Upload>;
}

async function putBlob(presigned: PresignedUpload, blob: Blob, contentType: string) {
  let response: Response;
  try {
    response = await fetch(presigned.url, {
      method: 'PUT',
      // The signed headers lock the type and size the API approved.
      headers: { ...presigned.headers, 'Content-Type': contentType },
      body: blob,
    });
  } catch {
    throw new ApiError(0, ApiErrorCode.NetworkError);
  }
  if (!response.ok) throw new ApiError(response.status, ApiErrorCode.ServiceUnavailable);
}

async function readBlob(fileUri: string): Promise<Blob> {
  try {
    return await (await fetch(fileUri)).blob();
  } catch {
    throw new ApiError(0, ApiErrorCode.NetworkError);
  }
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function createUploadsApi(client: ApiClient): UploadsApi {
  const presign: UploadsApi['presign'] = (data) =>
    client.request('/uploads/presign', {
      method: 'POST',
      body: presignUploadSchema.parse(data),
      schema: presignedUploadSchema,
    });
  const complete: UploadsApi['complete'] = (id) =>
    client.request(`/uploads/${encodeURIComponent(id)}/complete`, {
      method: 'POST',
      schema: uploadSchema,
    });

  const get: UploadsApi['get'] = (id) =>
    client.request(`/uploads/${encodeURIComponent(id)}`, { method: 'GET', schema: uploadSchema });
  const waitUntilReady: UploadsApi['waitUntilReady'] = async (upload, onStatus) => {
    const { initialMs, maxMs, timeoutMs } = MEDIA_LIMITS.poll;
    let current = upload;
    let delay: number = initialMs;
    let waited = 0;
    while (!isUploadSettled(current.status)) {
      if (waited >= timeoutMs) {
        throw new ApiError(504, ApiErrorCode.UploadProcessingTimeout);
      }
      await sleep(delay);
      waited += delay;
      delay = Math.min(Math.round(delay * 1.5), maxMs);
      current = await get(upload.id);
      onStatus?.(current.status);
    }
    if (current.status !== 'ready') {
      const reason = current.failureReason;
      throw new ApiError(422, ApiErrorCode.UploadRejected, {
        fieldErrors: reason ? [{ path: 'file', message: UPLOAD_FAILURE_MESSAGES[reason] }] : [],
      });
    }
    return current;
  };

  return {
    presign,
    complete,
    get,
    waitUntilReady,
    uploadToStorage: async (presigned, fileUri, contentType) => {
      await putBlob(presigned, await readBlob(fileUri), contentType);
    },
    uploadFile: async (fileUri, contentType, purpose, onStatus) => {
      const blob = await readBlob(fileUri);
      const presigned = await presign({ purpose, contentType, size: blob.size });
      await putBlob(presigned, blob, contentType);
      const upload = await complete(presigned.id);
      onStatus?.(upload.status);
      return waitUntilReady(upload, onStatus);
    },
  };
}
