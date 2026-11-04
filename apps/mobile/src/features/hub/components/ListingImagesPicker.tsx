import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Image } from 'expo-image';
import { ImagePlus, RotateCcw, X } from 'lucide-react-native';
import { MEDIA_LIMITS } from '@supporters/shared';
import { Button } from '@supporters/ui-native/components/button';
import { Icon } from '@supporters/ui-native/components/icon';
import { Text } from '@supporters/ui-native/components/text';
import type { MediaUpload } from '../hooks/use-post-media-uploads';

interface ListingImagesPickerProps {
  uploads: MediaUpload[];
  onAdd: () => void;
  onRemove: (key: string) => void;
  onRetry: (key: string) => void;
}

/** The photos of a listing: 1 to 10, uploaded as they are picked. */
export function ListingImagesPicker({
  uploads,
  onAdd,
  onRemove,
  onRetry,
}: ListingImagesPickerProps) {
  const { max } = MEDIA_LIMITS.imagesPerListing;
  return (
    <View className="gap-3">
      <View className="flex-row flex-wrap gap-2">
        {uploads.map((upload) => (
          <View key={upload.key} className="bg-muted size-24 overflow-hidden rounded-lg">
            <Image
              source={{ uri: upload.media.uri }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              accessibilityLabel="Listing photo"
            />
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
              accessibilityLabel="Remove photo"
            >
              <Icon as={X} size={14} />
            </Button>
          </View>
        ))}
      </View>
      <Button
        variant="outline"
        disabled={uploads.length >= max}
        onPress={onAdd}
        accessibilityLabel="Add photos"
      >
        <Icon as={ImagePlus} size={16} />
        <Text>Add photos</Text>
      </Button>
      <Text variant="muted" className="text-xs">
        {MEDIA_LIMITS.imagesPerListing.min} to {max} photos. The first one is the cover.
      </Text>
    </View>
  );
}
