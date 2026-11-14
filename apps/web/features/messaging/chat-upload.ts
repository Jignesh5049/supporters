import { CHAT_LIMITS, MEDIA_LIMITS, UploadPurpose, presignUploadSchema } from '@supporters/shared';
import { UploadError, type UploadDeps, uploadFile } from '@/features/business/upload';

/** What one chat message can carry: 1 to 5 images, or exactly one PDF. */
export type ChatFiles = { type: 'image'; files: File[] } | { type: 'file'; files: [File] };

const isImage = (file: File) => (MEDIA_LIMITS.imageTypes as readonly string[]).includes(file.type);
const isDocument = (file: File) =>
  (MEDIA_LIMITS.documentTypes as readonly string[]).includes(file.type);

/** Checks the picked files against the chat rules before anything is uploaded. */
export function pickChatFiles(files: readonly File[]): ChatFiles {
  if (files.length === 0) throw new UploadError('Choose a photo or a PDF.');
  const documents = files.filter(isDocument);
  if (documents.length > 0) {
    if (files.length !== CHAT_LIMITS.documentsPerMessage || !documents[0]) {
      throw new UploadError('Send one PDF at a time, without photos.');
    }
    return { type: 'file', files: [documents[0]] };
  }
  if (!files.every(isImage)) throw new UploadError('Use JPEG, PNG or WebP photos, or a PDF.');
  if (files.length > MEDIA_LIMITS.imagesPerMessage.max) {
    throw new UploadError(`Send up to ${MEDIA_LIMITS.imagesPerMessage.max} photos at a time.`);
  }
  return { type: 'image', files: [...files] };
}

/**
 * Uploads chat files through presign (purpose `chat`), returning the upload
 * ids a message references. Chat files are private: they get no public URL
 * and open only through `/v1/attachments/:id`.
 */
export async function uploadChatFiles(picked: ChatFiles, deps?: UploadDeps): Promise<string[]> {
  const inputs = picked.files.map((file) => {
    const input = presignUploadSchema.safeParse({
      purpose: UploadPurpose.Chat,
      contentType: file.type,
      size: file.size,
    });
    if (!input.success) {
      const maxMb =
        (picked.type === 'file' ? MEDIA_LIMITS.documentMaxBytes : MEDIA_LIMITS.imageMaxBytes) /
        (1024 * 1024);
      throw new UploadError(`${file.name} is too large. Use files under ${maxMb} MB.`);
    }
    return { file, input: input.data };
  });
  const uploads = await Promise.all(inputs.map(({ file, input }) => uploadFile(file, input, deps)));
  return uploads.map((upload) => upload.id);
}
