import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Send } from 'lucide-react-native';
import { colors } from '../../../styles/theme';
import type { PostType } from '../../../../mock';

interface CreateSubmitButtonProps {
  activeTab: PostType;
  onSubmit: () => void;
}

export function CreateSubmitButton({ activeTab, onSubmit }: CreateSubmitButtonProps) {
  const getButtonLabel = () => {
    switch (activeTab) {
      case 'product':
        return 'Publish Product to Catalog';
      case 'service':
        return 'Publish Service Offering';
      case 'offer':
        return 'Broadcast Commercial Offer';
      default:
        return 'Publish Company Dispatch';
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.submitBtn} onPress={onSubmit} activeOpacity={0.85}>
        <Send size={16} color="#FFFFFF" />
        <Text style={styles.submitBtnText}>{getButtonLabel()}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
