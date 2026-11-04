import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Image } from 'expo-image';
import { ImagePlus, RotateCcw, Video, X } from 'lucide-react-native';
import { MEDIA_LIMITS } from '@supporters/shared';
import { Button } from '@supporters/ui-native/components/button';
import { Icon } from '@supporters/ui-native/components/icon';
import { Text } from '@supporters/ui-native/components/text';
import type { MediaUpload } from '../hooks/use-post-media-uploads';

interface PostMediaPickerProps {
  uploads: MediaUpload[];
  onAddPhotos: () => void;
  onAddVideo: () => void;
  onRemove: (key: string) => void;
  onRetry: (key: string) => void;
}

export function PostMediaPicker({
  uploads,
  onAddPhotos,
  onAddVideo,
  onRemove,
  onRetry,
}: PostMediaPickerProps) {
  const hasVideo = uploads.some((u) => u.media.kind === 'video');
  const hasPhotos = uploads.some((u) => u.media.kind === 'image');
  const photoCount = uploads.filter((u) => u.media.kind === 'image').length;

  return (
    <View className="gap-3">
      <View className="flex-row flex-wrap gap-2">
        {uploads.map((upload) => (
          <View key={upload.key} className="bg-muted size-24 overflow-hidden rounded-lg">
            {upload.media.kind === 'image' ? (
              <Image
                source={{ uri: upload.media.uri }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
                accessibilityLabel="Selected photo"
              />
            ) : (
              <View className="flex-1 items-center justify-center">
                <Icon as={Video} size={28} className="text-muted-foreground" />
                <Text variant="muted" className="text-xs">
                  Video
                </Text>
              </View>
            )}
            {upload.status === 'uploading' ? (
              <View className="bg-background/70 absolute inset-0 items-center justify-center">
                <ActivityIndicator />
              </View>
            ) : null}
            {upload.status === 'failed' ? (
              <Button
                variant="destructive"
                size="sm"
                className="absolute inset-x-1 bottom-1"
                onPress={() => onRetry(upload.key)}
                accessibilityLabel="Retry upload"
              >
                <Icon as={RotateCcw} size={12} className="text-destructive-foreground" />
                <Text className="text-xs">Retry</Text>
              </Button>
            ) : null}
            <Button
              variant="secondary"
              size="icon"
              className="absolute right-0.5 top-0.5 size-8"
              onPress={() => onRemove(upload.key)}
              accessibilityLabel="Remove file"
            >
              <Icon as={X} size={14} />
            </Button>
          </View>
        ))}
      </View>
      <View className="flex-row gap-2">
        <Button
          variant="outline"
          className="flex-1"
          disabled={hasVideo || photoCount >= MEDIA_LIMITS.imagesPerPost.max}
          onPress={onAddPhotos}
          accessibilityLabel="Add photos"
        >
          <Icon as={ImagePlus} size={16} />
          <Text>Photos</Text>
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          disabled={hasVideo || hasPhotos}
          onPress={onAddVideo}
          accessibilityLabel="Add a video"
        >
          <Icon as={Video} size={16} />
          <Text>Video</Text>
        </Button>
      </View>
      <Text variant="muted" className="text-xs">
        Up to {MEDIA_LIMITS.imagesPerPost.max} photos, or one MP4 video of{' '}
        {MEDIA_LIMITS.videoMaxSeconds} seconds or less.
      </Text>
    </View>
  );
}
