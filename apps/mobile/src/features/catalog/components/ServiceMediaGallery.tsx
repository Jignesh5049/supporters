import React from 'react';
import { View, Image, TouchableOpacity, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { colors } from '../../../styles/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface ServiceMediaGalleryProps {
  images: string[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
}

export function ServiceMediaGallery({
  images,
  selectedIndex,
  onSelectIndex,
}: ServiceMediaGalleryProps) {
  return (
    <View style={styles.mediaContainer}>
      <Image
        source={{ uri: images[selectedIndex] || images[0] }}
        style={styles.mainImage}
        resizeMode="cover"
      />

      {images.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.thumbnailRow}
        >
          {images.map((img, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => onSelectIndex(idx)}
              style={[styles.thumbnailWrapper, selectedIndex === idx && styles.thumbnailActive]}
            >
              <Image source={{ uri: img }} style={styles.thumbnailImage} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mediaContainer: {
    width: SCREEN_WIDTH,
    backgroundColor: '#F3F4F6',
  },
  mainImage: {
    width: SCREEN_WIDTH,
    height: 260,
  },
  thumbnailRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  thumbnailWrapper: {
    width: 54,
    height: 54,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbnailActive: {
    borderColor: colors.primary,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
});
