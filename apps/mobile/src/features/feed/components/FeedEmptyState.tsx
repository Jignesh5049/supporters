import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Inbox } from 'lucide-react-native';
import { colors } from '../../../styles/theme';

interface FeedEmptyStateProps {
  onClearSearch: () => void;
}

export function FeedEmptyState({ onClearSearch }: FeedEmptyStateProps) {
  return (
    <View style={styles.container}>
      <Inbox size={36} color="#9CA3AF" />
      <Text style={styles.title}>No posts found</Text>
      <Text style={styles.subtitle}>
        Try adjusting your search term to see more business updates.
      </Text>
      <TouchableOpacity style={styles.resetButton} onPress={onClearSearch}>
        <Text style={styles.resetButtonText}>Clear Search</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 12,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  resetButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#EEF0FA',
  },
  resetButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
});

