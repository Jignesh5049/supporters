import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { colors } from '../styles/theme';

export function Toast() {
  const insets = useSafeAreaInsets();
  const { toast } = useApp();

  if (!toast) return null;

  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';

  return (
    <View style={[styles.container, { top: insets.top + 58 }]}>
      <View
        style={[
          styles.toastBox,
          isSuccess && styles.successBox,
          isError && styles.errorBox,
        ]}
      >
        <Feather
          name={isSuccess ? 'check-circle' : isError ? 'alert-circle' : 'info'}
          size={16}
          color="#FFFFFF"
        />
        <Text style={styles.messageText} numberOfLines={2}>
          {toast.message}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    alignItems: 'center',
  },
  toastBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    gap: 8,
    maxWidth: '100%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  successBox: {
    backgroundColor: '#065F46',
  },
  errorBox: {
    backgroundColor: '#991B1B',
  },
  messageText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },
});
