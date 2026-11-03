import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Image } from 'expo-image';

interface ProductImageGalleryProps {
  images: string[];
  selectedIdx: number;
  onSelectIdx: (idx: number) => void;
  availability: string;
}

export function ProductImageGallery({
  images,
  selectedIdx,
  onSelectIdx,
  availability,
}: ProductImageGalleryProps) {
  const currentImage = images[selectedIdx] || images[0];

  return (
    <View style={styles.container}>
      <View style={styles.mainImageContainer}>
        <Image
          source={{ uri: currentImage }}
          style={styles.mainImage}
          contentFit="cover"
          transition={200}
        />
        <View style={styles.availabilityBadge}>
          <Text style={styles.availabilityText}>{availability}</Text>
        </View>
      </View>

      {images.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.thumbScroll}
        >
          {images.map((img, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => onSelectIdx(idx)}
              style={[styles.thumbWrapper, selectedIdx === idx && styles.thumbWrapperActive]}
              activeOpacity={0.8}
            >
              <Image source={{ uri: img }} style={styles.thumbImg} contentFit="cover" />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 12,
  },
  mainImageContainer: {
    position: 'relative',
    width: '100%',
    height: 300,
    backgroundColor: '#F1F5F9',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  availabilityBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  availabilityText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  thumbScroll: {
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 8,
  },
  thumbWrapper: {
    width: 54,
    height: 54,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  thumbWrapperActive: {
    borderColor: '#2E3192',
  },
  thumbImg: {
    width: '100%',
    height: '100%',
  },
});
