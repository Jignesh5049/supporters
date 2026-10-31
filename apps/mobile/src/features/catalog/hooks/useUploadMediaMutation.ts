import { useMutation } from '@tanstack/react-query';
import type { Upload, UploadPurpose } from '@supporters/shared';
import { uploadsApi } from '../../../lib/api';

export interface UploadMediaParams {
  fileUri: string;
  contentType: string;
  sizeBytes: number;
  purpose?: UploadPurpose;
}

export function useUploadMediaMutation() {
  return useMutation<Upload, Error, UploadMediaParams>({
    mutationFn: async ({ fileUri, contentType, sizeBytes, purpose = 'listing' }) => {
      // Step 1: Presign upload with server
      const presigned = await uploadsApi.presign({
        purpose,
        contentType,
        size: sizeBytes,
      });

      // Step 2: Direct HTTP PUT upload to S3/storage
      await uploadsApi.uploadToStorage(presigned, fileUri, contentType);

      // Step 3: Complete upload record
      return await uploadsApi.complete(presigned.id);
    },
  });
}
