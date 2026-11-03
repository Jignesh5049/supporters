import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

export interface CompressedImageResult {
  uri: string;
  width: number;
  height: number;
}

const MAX_IMAGE_DIMENSION = 1200;
const COMPRESSION_QUALITY = 0.8;

/**
 * Resizes and compresses an image before uploading to reduce network bandwidth.
 */
export async function compressImageAsync(
  uri: string,
  maxWidth = MAX_IMAGE_DIMENSION,
): Promise<CompressedImageResult> {
  const manipulated = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: maxWidth } }],
    {
      compress: COMPRESSION_QUALITY,
      format: ImageManipulator.SaveFormat.JPEG,
    },
  );

  return {
    uri: manipulated.uri,
    width: manipulated.width,
    height: manipulated.height,
  };
}

/**
 * Launches the device photo library to select and compress a single image.
 */
export async function pickAndCompressImageAsync(options?: {
  aspect?: [number, number];
  allowsEditing?: boolean;
}): Promise<CompressedImageResult | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: options?.allowsEditing ?? true,
    aspect: options?.aspect ?? [1, 1],
    quality: 0.85,
  });

  if (result.canceled || !result.assets?.[0]?.uri) {
    return null;
  }

  return compressImageAsync(result.assets[0].uri);
}

/**
 * Launches the camera to capture and compress a new photo.
 */
export async function captureAndCompressPhotoAsync(options?: {
  aspect?: [number, number];
  allowsEditing?: boolean;
}): Promise<CompressedImageResult | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    return null;
  }

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: options?.allowsEditing ?? true,
    aspect: options?.aspect ?? [1, 1],
    quality: 0.85,
  });

  if (result.canceled || !result.assets?.[0]?.uri) {
    return null;
  }

  return compressImageAsync(result.assets[0].uri);
}

/**
 * Selects multiple images (e.g. for catalog products, requirements, or post galleries).
 */
export async function pickMultipleImagesAsync(maxSelection = 5): Promise<CompressedImageResult[]> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: maxSelection,
    quality: 0.85,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return [];
  }

  const compressed = await Promise.all(result.assets.map((asset) => compressImageAsync(asset.uri)));

  return compressed;
}
