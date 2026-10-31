import {
  presignUploadSchema,
  presignedUploadSchema,
  uploadSchema,
  type PresignUploadInput,
  type PresignedUpload,
  type Upload,
} from '@supporters/shared';
import type { ApiClient } from './client';

export interface UploadsApi {
  presign(data: PresignUploadInput): Promise<PresignedUpload>;
  complete(id: string): Promise<Upload>;
  uploadToStorage(presigned: PresignedUpload, fileUri: string, contentType: string): Promise<void>;
}

export function createUploadsApi(client: ApiClient): UploadsApi {
  return {
    presign: (data) =>
      client.request('/uploads/presign', {
        method: 'POST',
        body: presignUploadSchema.parse(data),
        schema: presignedUploadSchema,
      }),
    complete: (id) =>
      client.request(`/uploads/${encodeURIComponent(id)}/complete`, {
        method: 'POST',
        schema: uploadSchema,
      }),
    uploadToStorage: async (presigned, fileUri, contentType) => {
      const response = await fetch(fileUri);
      const blob = await response.blob();

      const uploadRes = await fetch(presigned.url, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
        },
        body: blob,
      });

      if (!uploadRes.ok) {
        throw new Error(`Upload failed with status ${uploadRes.status}`);
      }
    },
  };
}
