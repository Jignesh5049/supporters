import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Upload, FileCheck } from 'lucide-react-native';
import { colors } from '../../../styles/theme';

export interface VerificationUploadCardProps {
  label: string;
  sublabel: string;
  isUploaded: boolean;
  onToggleUpload: () => void;
}

export function VerificationUploadCard({
  label,
  sublabel,
  isUploaded,
  onToggleUpload,
}: VerificationUploadCardProps) {
  return (
    <TouchableOpacity
      style={[styles.uploadBox, isUploaded && styles.uploadBoxSuccess]}
      onPress={onToggleUpload}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {isUploaded ? (
        <FileCheck size={28} color="#16A34A" />
      ) : (
        <Upload size={28} color={colors.primary} />
      )}
      <Text style={[styles.uploadBoxTitle, isUploaded && styles.uploadBoxTitleSuccess]}>
        {isUploaded ? 'Document Attached (PDF/Image)' : label}
      </Text>
      <Text style={styles.uploadBoxSubtitle}>
        {isUploaded ? 'Tap to change or re-upload file' : sublabel}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  uploadBox: {
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    marginBottom: 12,
  },
  uploadBoxSuccess: {
    borderColor: '#16A34A',
    borderStyle: 'solid',
    backgroundColor: '#ECFDF5',
  },
  uploadBoxTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 8,
  },
  uploadBoxTitleSuccess: {
    color: '#16A34A',
  },
  uploadBoxSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 3,
  },
});
