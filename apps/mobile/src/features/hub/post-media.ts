import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { MEDIA_LIMITS } from '@supporters/shared';

/** Mobile spec, Media uploads: resize so the longest side is 2048 px, JPEG at quality 0.8. */
export const IMAGE_MAX_SIDE = 2048;
export const IMAGE_QUALITY = 0.8;

export interface PickedMedia {
  uri: string;
  kind: 'image' | 'video';
  contentType: string;
}

export type MediaProblem =
  'too-many-images' | 'video-too-long' | 'video-too-large' | 'video-format' | 'mixed';

/** The resize action for an image, or null when it already fits. */
export function resizeFor(
  width: number,
  height: number,
  maxSide = IMAGE_MAX_SIDE,
): { width: number } | { height: number } | null {
  if (Math.max(width, height) <= maxSide) return null;
  return width >= height ? { width: maxSide } : { height: maxSide };
}

/** Checks a video before it is uploaded: 60 s or shorter and 100 MB or smaller. */
export function videoProblem(
  durationMs: number | null | undefined,
  sizeBytes: number | null | undefined,
) {
  if (durationMs != null && durationMs > MEDIA_LIMITS.videoMaxSeconds * 1000) {
    return 'video-too-long' as const;
  }
  if (sizeBytes != null && sizeBytes > MEDIA_LIMITS.videoMaxBytes)
    return 'video-too-large' as const;
  return null;
}

/** A post has 1 to 10 images or one video, never both. */
export function mediaProblem(current: PickedMedia[], adding: PickedMedia[]): MediaProblem | null {
  const all = [...current, ...adding];
  const videos = all.filter((m) => m.kind === 'video').length;
  if (videos > 0 && all.length > videos) return 'mixed';
  if (videos > MEDIA_LIMITS.videosPerPost.max) return 'mixed';
  if (all.length - videos > MEDIA_LIMITS.imagesPerPost.max) return 'too-many-images';
  return null;
}

export const MEDIA_PROBLEM_MESSAGES: Record<MediaProblem, string> = {
  'too-many-images': `A post can have up to ${MEDIA_LIMITS.imagesPerPost.max} photos.`,
  'video-too-long': `Videos can be up to ${MEDIA_LIMITS.videoMaxSeconds} seconds long.`,
  'video-too-large': `Videos can be up to ${Math.round(MEDIA_LIMITS.videoMaxBytes / (1024 * 1024))} MB.`,
  'video-format': 'Videos must be MP4.',
  mixed: 'A post has photos or one video, not both.',
};

/** Resizes and recompresses a photo (this also drops its EXIF data) before upload. */
export async function compressForPost(uri: string, width: number, height: number) {
  const resize = resizeFor(width, height);
  const result = await ImageManipulator.manipulateAsync(uri, resize ? [{ resize }] : [], {
    compress: IMAGE_QUALITY,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  return {
    uri: result.uri,
    kind: 'image',
    contentType: 'image/jpeg',
  } as const satisfies PickedMedia;
}

export type PickResult =
  { ok: true; media: PickedMedia[] } | { ok: false; problem: MediaProblem | 'permission' };

/** Opens the photo library for photos or one video. Photos are compressed; videos are checked. */
export async function pickPostMedia(
  kind: 'image' | 'video',
  current: PickedMedia[],
): Promise<PickResult> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return { ok: false, problem: 'permission' };

  const remaining = MEDIA_LIMITS.imagesPerPost.max - current.length;
  const result = await ImagePicker.launchImageLibraryAsync(
    kind === 'image'
      ? {
          mediaTypes: ['images'],
          allowsMultipleSelection: true,
          selectionLimit: Math.max(1, remaining),
          quality: 1,
        }
      : { mediaTypes: ['videos'], allowsMultipleSelection: false },
  );
  if (result.canceled || result.assets.length === 0) return { ok: true, media: [] };

  if (kind === 'video') {
    const asset = result.assets[0];
    if (asset.mimeType && !MEDIA_LIMITS.videoTypes.includes(asset.mimeType as never)) {
      return { ok: false, problem: 'video-format' };
    }
    const problem = videoProblem(asset.duration, asset.fileSize);
    if (problem) return { ok: false, problem };
    const media: PickedMedia = { uri: asset.uri, kind: 'video', contentType: 'video/mp4' };
    const mixed = mediaProblem(current, [media]);
    return mixed ? { ok: false, problem: mixed } : { ok: true, media: [media] };
  }

  const tooMany = mediaProblem(
    current,
    result.assets.map((a) => ({ uri: a.uri, kind: 'image' as const, contentType: 'image/jpeg' })),
  );
  if (tooMany) return { ok: false, problem: tooMany };
  const media: PickedMedia[] = await Promise.all(
    result.assets.map((asset) => compressForPost(asset.uri, asset.width, asset.height)),
  );
  return { ok: true, media };
}
