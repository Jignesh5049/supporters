import { useCallback, useState } from 'react';
import type { UploadPurpose } from '@supporters/shared';
import { uploadsApi } from '../../../lib/api';
import type { PickedMedia } from '../post-media';

export interface MediaUpload {
  key: string;
  media: PickedMedia;
  status: 'uploading' | 'ready' | 'failed';
  /** The ready upload's id, passed as mediaIds when the post is saved. */
  uploadId?: string;
  error?: unknown;
}

let counter = 0;

/**
 * Uploads media (post media by default, or listing photos) as it is picked: presign, PUT, complete. Each file has its
 * own status, so one failure can be retried or removed without losing the rest.
 */
export function usePostMediaUploads(purpose: UploadPurpose = 'post', initial: MediaUpload[] = []) {
  const [uploads, setUploads] = useState<MediaUpload[]>(initial);

  const patch = useCallback((key: string, change: Partial<MediaUpload>) => {
    setUploads((current) => current.map((u) => (u.key === key ? { ...u, ...change } : u)));
  }, []);

  const run = useCallback(
    async (key: string, media: PickedMedia) => {
      try {
        const upload = await uploadsApi.uploadFile(media.uri, media.contentType, purpose);
        patch(key, { status: 'ready', uploadId: upload.id, error: undefined });
      } catch (error) {
        patch(key, { status: 'failed', error });
      }
    },
    [patch, purpose],
  );

  const add = useCallback(
    (items: PickedMedia[]) => {
      const added = items.map((media) => ({
        key: `upload-${(counter += 1)}`,
        media,
        status: 'uploading' as const,
      }));
      setUploads((current) => [...current, ...added]);
      added.forEach(({ key, media }) => void run(key, media));
    },
    [run],
  );

  const remove = useCallback((key: string) => {
    setUploads((current) => current.filter((u) => u.key !== key));
  }, []);

  const retry = useCallback(
    (key: string) => {
      const target = uploads.find((u) => u.key === key);
      if (!target) return;
      patch(key, { status: 'uploading', error: undefined });
      void run(key, target.media);
    },
    [patch, run, uploads],
  );

  const reset = useCallback((next: MediaUpload[] = []) => setUploads(next), []);

  return {
    uploads,
    add,
    remove,
    retry,
    reset,
    isUploading: uploads.some((u) => u.status === 'uploading'),
    hasFailed: uploads.some((u) => u.status === 'failed'),
    mediaIds: uploads.flatMap((u) => (u.uploadId ? [u.uploadId] : [])),
  };
}
