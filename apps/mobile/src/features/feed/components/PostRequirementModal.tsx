import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, Alert } from 'react-native';
import { Image } from 'expo-image';
import { X, Camera, CheckCircle2, Trash2, Send } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../../../styles/theme';

interface PostRequirementModalProps {
  visible: boolean;
  onClose: () => void;
  description: string;
  setDescription: (text: string) => void;
  imageUri: string | null;
  setImageUri: (uri: string | null) => void;
  onSubmit: () => void;
}

export function PostRequirementModal({
  visible,
  onClose,
  description,
  setDescription,
  imageUri,
  setImageUri,
  onSubmit,
}: PostRequirementModalProps) {
  const handlePickReqImage = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        setImageUri(res.assets[0].uri);
      }
    } catch {
      Alert.alert('Error', 'Could not open image picker.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Top Bar */}
          <View style={styles.modalTopBar}>
            <View style={styles.modalTitleCol}>
              <Text style={styles.modalTitle}>Post Requirement</Text>
              <Text style={styles.modalSub}>
                Describe what you need. Sellers will see this and contact you.
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeModalBtn}>
              <X size={20} color="#667085" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <Text style={styles.formLabel}>Message Description *</Text>
            <TextInput
              style={[styles.formInput, styles.formTextArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Type what product, material, or service you are looking to buy, quantity needed, delivery city, etc..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />

            {/* Optional Photo Attachment */}
            <TouchableOpacity
              style={styles.uploadBox}
              onPress={handlePickReqImage}
              activeOpacity={0.8}
            >
              {imageUri ? (
                <View style={styles.uploadedImgRow}>
                  <Image
                    source={{ uri: imageUri }}
                    style={styles.previewThumb}
                    contentFit="cover"
                  />
                  <View style={styles.uploadedTextCol}>
                    <View style={styles.uploadedSuccessRow}>
                      <CheckCircle2 size={14} color="#16A34A" />
                      <Text style={styles.uploadedSuccessText}>Photo attached</Text>
                    </View>
                    <Text style={styles.uploadSub}>Tap to change sample image</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.deletePhotoBtn}
                    onPress={(e) => {
                      e.stopPropagation();
                      setImageUri(null);
                    }}
                  >
                    <Trash2 size={16} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <Camera size={20} color={colors.primary} />
                  <Text style={styles.uploadTitle}>Attach Reference Sample Photo (Optional)</Text>
                  <Text style={styles.uploadSub}>PNG, JPG or WEBP up to 5MB</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.8}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.publishBtn} onPress={onSubmit} activeOpacity={0.85}>
                <Send size={15} color="#FFFFFF" />
                <Text style={styles.publishBtnText}>Publish Request</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: 28,
  },
  modalTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitleCol: {
    flex: 1,
    paddingRight: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeModalBtn: {
    padding: 4,
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.textPrimary,
    backgroundColor: '#F8FAFC',
  },
  formTextArea: {
    minHeight: 110,
    marginBottom: 14,
  },
  uploadBox: {
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    backgroundColor: '#F8FAFC',
  },
  uploadedImgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 12,
  },
  previewThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  uploadedTextCol: {
    flex: 1,
  },
  uploadedSuccessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  uploadedSuccessText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#16A34A',
  },
  deletePhotoBtn: {
    padding: 8,
  },
  uploadPlaceholder: {
    alignItems: 'center',
    gap: 4,
  },
  uploadTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 2,
  },
  uploadSub: {
    fontSize: 10,
    color: '#94A3B8',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  publishBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
  },
  publishBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
