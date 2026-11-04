import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Store, Plus } from 'lucide-react-native';
import { colors } from '../../../styles/theme';

interface HubEmptyStateProps {
  onCreateProfile: () => void;
}

export function HubEmptyState({ onCreateProfile }: HubEmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Store size={38} color={colors.primary} />
      </View>
      <Text style={styles.title}>Create your business</Text>
      <Text style={styles.description}>
        Create your digital B2B storefront to showcase products, connect with wholesale buyers, and
        publish company dispatches.
      </Text>
      <TouchableOpacity style={styles.createBtn} onPress={onCreateProfile} activeOpacity={0.85}>
        <Plus size={16} color="#FFFFFF" />
        <Text style={styles.createBtnText}>Create your business</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EEF0FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
