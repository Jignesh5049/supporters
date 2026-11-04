import * as ImagePicker from 'expo-image-picker';
import { MEDIA_LIMITS } from '@supporters/shared';
import { compressForPost, type PickedMedia } from './post-media';

export type ImagePickResult =
  { ok: true; media: PickedMedia[] } | { ok: false; problem: 'permission' | 'too-many-images' };

/** How many more images fit under a cap, never less than zero. */
export function remainingSlots(current: number, max: number): number {
  return Math.max(0, max - current);
}

/**
 * Opens the photo library for listing photos (1 to 10). Photos are resized and
 * recompressed first, which also drops their EXIF data (mobile spec, Media uploads).
 */
export async function pickListingImages(currentCount: number): Promise<ImagePickResult> {
  const remaining = remainingSlots(currentCount, MEDIA_LIMITS.imagesPerListing.max);
  if (remaining === 0) return { ok: false, problem: 'too-many-images' };
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return { ok: false, problem: 'permission' };

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: remaining,
    quality: 1,
  });
  if (result.canceled || result.assets.length === 0) return { ok: true, media: [] };
  const media = await Promise.all(
    result.assets
      .slice(0, remaining)
      .map((asset) => compressForPost(asset.uri, asset.width, asset.height)),
  );
  return { ok: true, media };
}

/** One cropped photo for a logo (square) or cover (16:9). */
export async function pickCroppedImage(aspect: [number, number]): Promise<ImagePickResult> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return { ok: false, problem: 'permission' };
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect,
    quality: 1,
  });
  if (result.canceled || result.assets.length === 0) return { ok: true, media: [] };
  const asset = result.assets[0];
  return { ok: true, media: [await compressForPost(asset.uri, asset.width, asset.height)] };
}
