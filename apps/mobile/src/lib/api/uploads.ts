import {
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
  uploadToStorage(presigned: PresignedUpload, fileUri: string, contentType: string): Promise<void>;
  /** presign, PUT, complete in one go. The size sent to presign is the real size of the file. */
  uploadFile(
    fileUri: string,
    contentType: string,
    purpose: PresignUploadInput['purpose'],
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

  return {
    presign,
    complete,
    uploadToStorage: async (presigned, fileUri, contentType) => {
      await putBlob(presigned, await readBlob(fileUri), contentType);
    },
    uploadFile: async (fileUri, contentType, purpose) => {
      const blob = await readBlob(fileUri);
      const presigned = await presign({ purpose, contentType, size: blob.size });
      await putBlob(presigned, blob, contentType);
      return complete(presigned.id);
    },
  };
}
