import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import {
  Camera,
  Image as ImageIcon,
  Trash2,
  LayoutTemplate,
  Smartphone,
} from 'lucide-react-native';
import { colors } from '../../../styles/theme';

export const BUSINESS_PRESET_IMAGES = [
  {
    label: 'Industrial / Factory',
    uri: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&auto=format&fit=crop&q=80',
  },
  {
    label: 'Electronics / Tech',
    uri: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&auto=format&fit=crop&q=80',
  },
  {
    label: 'Textiles & Silk',
    uri: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&auto=format&fit=crop&q=80',
  },
  {
    label: 'Spices & Food',
    uri: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=800&auto=format&fit=crop&q=80',
  },
  {
    label: 'Woodwork & Interior',
    uri: 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?w=800&auto=format&fit=crop&q=80',
  },
];

interface CreateMediaUploaderProps {
  imageUri: string | null;
  aspectRatio: '16:9' | '9:16';
  setAspectRatio: (ratio: '16:9' | '9:16') => void;
  onPickImage: () => void;
  onTakePhoto: () => void;
  onSelectPreset: (uri: string) => void;
  onRemoveImage: () => void;
  isUploading: boolean;
}

export function CreateMediaUploader({
  imageUri,
  aspectRatio,
  setAspectRatio,
  onPickImage,
  onTakePhoto,
  onSelectPreset,
  onRemoveImage,
  isUploading,
}: CreateMediaUploaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Attach Media / Photos</Text>

      {/* Aspect Ratio Selector */}
      <View style={styles.ratioRow}>
        <Text style={styles.ratioLabel}>Orientation:</Text>
        <TouchableOpacity
          style={[styles.ratioBtn, aspectRatio === '16:9' && styles.ratioBtnActive]}
          onPress={() => setAspectRatio('16:9')}
          activeOpacity={0.8}
        >
          <LayoutTemplate size={14} color={aspectRatio === '16:9' ? colors.primary : '#64748B'} />
          <Text style={[styles.ratioBtnText, aspectRatio === '16:9' && styles.ratioBtnTextActive]}>
            Landscape (16:9)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.ratioBtn, aspectRatio === '9:16' && styles.ratioBtnActive]}
          onPress={() => setAspectRatio('9:16')}
          activeOpacity={0.8}
        >
          <Smartphone size={14} color={aspectRatio === '9:16' ? colors.primary : '#64748B'} />
          <Text style={[styles.ratioBtnText, aspectRatio === '9:16' && styles.ratioBtnTextActive]}>
            Story (9:16)
          </Text>
        </TouchableOpacity>
      </View>

      {/* Upload Actions */}
      <View style={styles.uploadActionsRow}>
        <TouchableOpacity
          style={styles.uploadActionBtn}
          onPress={onPickImage}
          disabled={isUploading}
          activeOpacity={0.8}
        >
          <ImageIcon size={18} color={colors.primary} />
          <Text style={styles.uploadActionText}>Gallery</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.uploadActionBtn}
          onPress={onTakePhoto}
          disabled={isUploading}
          activeOpacity={0.8}
        >
          <Camera size={18} color="#0D9488" />
          <Text style={styles.uploadActionText}>Take Photo</Text>
        </TouchableOpacity>
      </View>

      {/* Presets */}
      <Text style={styles.presetLabel}>Or select industry stock asset:</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.presetScroll}
      >
        {BUSINESS_PRESET_IMAGES.map((preset, idx) => (
          <TouchableOpacity
            key={idx}
            style={styles.presetChip}
            onPress={() => onSelectPreset(preset.uri)}
            activeOpacity={0.8}
          >
            <Image source={{ uri: preset.uri }} style={styles.presetThumb} contentFit="cover" />
            <Text style={styles.presetChipText}>{preset.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Image Preview with Remove Button */}
      {imageUri && (
        <View
          style={[
            styles.previewWrapper,
            aspectRatio === '9:16' ? styles.previewVertical : styles.previewHorizontal,
          ]}
        >
          <Image
            source={{ uri: imageUri }}
            style={styles.previewImage}
            contentFit="cover"
            transition={200}
          />
          <TouchableOpacity style={styles.removeBtn} onPress={onRemoveImage} activeOpacity={0.8}>
            <Trash2 size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  ratioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  ratioLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  ratioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
  },
  ratioBtnActive: {
    borderColor: colors.primary,
    backgroundColor: '#EEF0FA',
  },
  ratioBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  ratioBtnTextActive: {
    color: colors.primary,
  },
  uploadActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  uploadActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
  },
  uploadActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  presetLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  presetScroll: {
    gap: 8,
    marginBottom: 12,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 10,
    paddingLeft: 4,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
  },
  presetThumb: {
    width: 28,
    height: 28,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  previewWrapper: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000000',
    marginTop: 8,
  },
  previewHorizontal: {
    width: '100%',
    height: 190,
  },
  previewVertical: {
    width: 170,
    height: 280,
    alignSelf: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  removeBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
