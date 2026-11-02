import {
  UploadStatus,
  presignUploadSchema,
  presignedUploadSchema,
  uploadSchema,
  type PresignedUpload,
  type Upload,
  type UploadPurpose,
} from '@supporters/shared';
import type { ApiClient } from './client';
import { ApiError, ApiErrorCode } from './errors';

/** A picked file, read into memory so its exact size is known before presigning. */
export interface UploadFile {
  body: Blob;
  contentType: string;
}

/** PUTs the bytes to the presigned URL with exactly the headers the API signed. */
export type PutFile = (presigned: PresignedUpload, file: UploadFile) => Promise<Response>;

const putToStorage: PutFile = (presigned, file) =>
  globalThis.fetch(presigned.url, {
    method: presigned.method,
    headers: presigned.headers,
    body: file.body,
  });

/** Reads a local `file://` URI from the image picker into a Blob. */
export async function readLocalFile(uri: string, mimeType?: string | null): Promise<UploadFile> {
  const body = await (await globalThis.fetch(uri)).blob();
  return { body, contentType: mimeType || body.type };
}

/**
 * The backend's upload flow: presign, PUT straight to storage, then complete.
 * Resolves the ready upload, whose id goes in `mediaIds` / `logoMediaId` / `coverMediaId`.
 */
export function createUploadsApi(client: ApiClient, putFile: PutFile = putToStorage) {
  return {
    upload: async (purpose: UploadPurpose, file: UploadFile): Promise<Upload> => {
      const input = presignUploadSchema.safeParse({
        purpose,
        contentType: file.contentType,
        size: file.body.size,
      });
      // The same type and size rules the API applies, checked before using any bandwidth.
      if (!input.success) throw new ApiError(0, ApiErrorCode.UploadNotAllowed);

      const presigned = await client.request('/uploads/presign', {
        method: 'POST',
        body: input.data,
        schema: presignedUploadSchema,
      });

      let response: Response;
      try {
        response = await putFile(presigned, file);
      } catch {
        throw new ApiError(0, ApiErrorCode.NetworkError);
      }
      if (!response.ok) throw new ApiError(response.status, ApiErrorCode.UploadIncomplete);

      const upload = await client.request(`/uploads/${presigned.id}/complete`, {
        method: 'POST',
        schema: uploadSchema,
      });
      if (upload.status === UploadStatus.Rejected) {
        throw new ApiError(422, ApiErrorCode.UploadRejected);
      }
      return upload;
    },
  };
}

export type UploadsApi = ReturnType<typeof createUploadsApi>;
