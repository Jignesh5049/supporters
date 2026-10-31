import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Phone, MessageSquare, Send } from 'lucide-react-native';
import { colors } from '../../../styles/theme';

export interface ServiceBottomBarProps {
  onCall?: () => void;
  onChat: () => void;
  onEnquire: () => void;
}

export function ServiceBottomBar({ onCall, onChat, onEnquire }: ServiceBottomBarProps) {
  return (
    <View style={styles.bottomBar}>
      {onCall ? (
        <TouchableOpacity
          style={styles.actionIconBtn}
          onPress={onCall}
          accessibilityLabel="Call vendor"
        >
          <Phone size={18} color={colors.primary} />
          <Text style={styles.iconBtnLabel}>Call</Text>
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity
        style={styles.actionIconBtn}
        onPress={onChat}
        accessibilityLabel="Chat with vendor"
      >
        <MessageSquare size={18} color={colors.primary} />
        <Text style={styles.iconBtnLabel}>Chat</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.enquireButton}
        onPress={onEnquire}
        accessibilityLabel="Request service quotation"
      >
        <Send size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
        <Text style={styles.enquireButtonText}>Request Quote</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionIconBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  iconBtnLabel: {
    fontSize: 10,
    color: colors.primary,
    marginTop: 2,
    fontWeight: '600',
  },
  enquireButton: {
    flex: 1,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  enquireButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
