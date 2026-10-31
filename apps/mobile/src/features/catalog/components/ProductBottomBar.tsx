import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Phone, MessageSquare } from 'lucide-react-native';
import { colors } from '../../../styles/theme';

interface ProductBottomBarProps {
  phone?: string;
  onContactSupplier: () => void;
}

export function ProductBottomBar({ phone, onContactSupplier }: ProductBottomBarProps) {
  return (
    <View style={styles.container}>
      {phone ? (
        <TouchableOpacity
          style={styles.callButton}
          onPress={() => Linking.openURL(`tel:${phone}`)}
          activeOpacity={0.8}
          accessibilityLabel="Call supplier"
        >
          <Phone size={18} color="#0D9488" />
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity style={styles.contactBtn} onPress={onContactSupplier} activeOpacity={0.85}>
        <MessageSquare size={16} color="#FFFFFF" />
        <Text style={styles.contactText}>Contact Supplier</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 64,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
  },
  callButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#F0FDFA',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  contactBtn: {
    flex: 1,
    height: 44,
    backgroundColor: colors.primary,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  contactText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
