import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Alert } from 'react-native';

export interface CompressedImageResult {
  uri: string;
  width: number;
  height: number;
}

export interface PickedVideoResult {
  uri: string;
  durationSec: number;
  fileSizeBytes?: number;
}

export interface PickedDocumentResult {
  uri: string;
  name: string;
  sizeBytes: number;
  mimeType: string;
}

/**
 * Mobile spec line 136: Resizes so the longest side is 2048 px, compress at quality 0.8.
 */
const MAX_IMAGE_DIMENSION = 2048;
const COMPRESSION_QUALITY = 0.8;

export const MEDIA_LIMITS = {
  maxVideoDurationSec: 60,
  maxVideoSizeBytes: 100 * 1024 * 1024, // 100 MB
  maxDocSizeBytes: 10 * 1024 * 1024, // 10 MB
} as const;

/**
 * Resizes and compresses an image so its longest dimension is <= 2048 px.
 */
export async function compressImageAsync(
  uri: string,
  maxDimension = MAX_IMAGE_DIMENSION,
): Promise<CompressedImageResult> {
  const manipulated = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: maxDimension } }],
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

/**
 * Mobile spec line 137: Video (posts only): pick, check it is 60 s or shorter and 100 MB or smaller.
 */
export async function pickVideoAsync(): Promise<PickedVideoResult | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert('Permission Required', 'Supporters needs access to your gallery to select video.');
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['videos'],
    videoMaxDuration: MEDIA_LIMITS.maxVideoDurationSec,
    quality: 0.8,
  });

  if (result.canceled || !result.assets?.[0]) {
    return null;
  }

  const asset = result.assets[0];
  const durationSec = asset.duration ? Math.round(asset.duration / 1000) : 0;

  if (durationSec > MEDIA_LIMITS.maxVideoDurationSec) {
    Alert.alert(
      'Video Too Long',
      `Videos must be ${MEDIA_LIMITS.maxVideoDurationSec} seconds or shorter. Selected video is ${durationSec}s.`,
    );
    return null;
  }

  if (asset.fileSize && asset.fileSize > MEDIA_LIMITS.maxVideoSizeBytes) {
    Alert.alert('Video Too Large', 'Videos must be 100 MB or smaller in size.');
    return null;
  }

  return {
    uri: asset.uri,
    durationSec,
    fileSizeBytes: asset.fileSize,
  };
}

/**
 * Mobile spec line 138: Documents (chat, KYC): PDF only, up to 10 MB.
 */
export function validateDocument(doc: { name: string; sizeBytes: number; mimeType?: string }): {
  valid: boolean;
  error?: string;
} {
  const isPdf = doc.name.toLowerCase().endsWith('.pdf') || doc.mimeType === 'application/pdf';

  if (!isPdf) {
    return { valid: false, error: 'Only PDF documents are supported.' };
  }

  if (doc.sizeBytes > MEDIA_LIMITS.maxDocSizeBytes) {
    return { valid: false, error: 'Document must be 10 MB or smaller.' };
  }

  return { valid: true };
}
