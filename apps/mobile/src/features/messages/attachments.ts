import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { CHAT_LIMITS, MEDIA_LIMITS, UploadPurpose } from '@supporters/shared';
import type { UploadsApi } from '../../lib/api';
import { compressForPost } from '../hub/post-media';

export interface ChatFile {
  uri: string;
  contentType: string;
  /** Shown on the bubble while it sends. */
  name?: string;
}

export type ChatPick =
  | { ok: true; kind: 'image' | 'file'; files: ChatFile[] }
  | { ok: false; problem: 'permission' | 'too-large' | 'not-pdf' };

export const CHAT_PICK_MESSAGES = {
  permission: 'Allow photo access in Settings to send photos.',
  'too-large': `Files can be up to ${Math.round(MEDIA_LIMITS.documentMaxBytes / (1024 * 1024))} MB.`,
  'not-pdf': 'Only PDF documents can be sent.',
} as const;

/**
 * Up to 5 photos, resized to 2048 px and recompressed as JPEG before upload, which also drops
 * EXIF data (mobile spec, Media uploads). An empty list means the user cancelled.
 */
export async function pickChatImages(): Promise<ChatPick> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return { ok: false, problem: 'permission' };
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: MEDIA_LIMITS.imagesPerMessage.max,
    quality: 1,
  });
  if (result.canceled) return { ok: true, kind: 'image', files: [] };
  const files = await Promise.all(
    result.assets
      .slice(0, MEDIA_LIMITS.imagesPerMessage.max)
      .map((asset) => compressForPost(asset.uri, asset.width, asset.height)),
  );
  return { ok: true, kind: 'image', files };
}

/** One PDF up to 10 MB. */
export async function pickChatDocument(): Promise<ChatPick> {
  const result = await DocumentPicker.getDocumentAsync({
    type: MEDIA_LIMITS.documentTypes[0],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return { ok: true, kind: 'file', files: [] };
  const asset = result.assets[0];
  if (!asset) return { ok: true, kind: 'file', files: [] };
  if (!(MEDIA_LIMITS.documentTypes as readonly string[]).includes(asset.mimeType ?? '')) {
    return { ok: false, problem: 'not-pdf' };
  }
  if (asset.size !== undefined && asset.size > MEDIA_LIMITS.documentMaxBytes) {
    return { ok: false, problem: 'too-large' };
  }
  const files = [
    { uri: asset.uri, contentType: asset.mimeType ?? 'application/pdf', name: asset.name },
  ];
  return { ok: true, kind: 'file', files: files.slice(0, CHAT_LIMITS.documentsPerMessage) };
}

/** Uploads with purpose `chat` (private) and resolves the upload ids to send. */
export async function uploadChatFiles(uploads: UploadsApi, files: ChatFile[]): Promise<string[]> {
  const done = await Promise.all(
    files.map((file) => uploads.uploadFile(file.uri, file.contentType, UploadPurpose.Chat)),
  );
  return done.map((upload) => upload.id);
}
