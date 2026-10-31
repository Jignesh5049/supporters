import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, StyleSheet } from 'react-native';
import { X } from 'lucide-react-native';
import { colors } from '../../../styles/theme';

interface TermsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function TermsModal({ visible, onClose }: TermsModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Terms & Conditions</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#667085" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            <Text style={styles.heading}>1. Acceptance of Terms</Text>
            <Text style={styles.text}>
              By creating an account on Supporters, you agree to comply with and be legally bound by
              these Terms and Conditions, our Privacy Policy, and Community Guidelines.
            </Text>

            <Text style={styles.heading}>2. B2B Commercial Conduct</Text>
            <Text style={styles.text}>
              Supporters is a marketplace for verified commercial entities, manufacturers, and trade
              professionals. You represent that listings and requirements posted represent genuine
              wholesale or commercial offerings.
            </Text>

            <Text style={styles.heading}>3. User Data & Verification</Text>
            <Text style={styles.text}>
              You agree to provide accurate registration details including phone number and
              proprietor details. Misrepresentation may result in suspension.
            </Text>

            <Text style={styles.heading}>4. Referral Rewards</Text>
            <Text style={styles.text}>
              Referral earnings are governed by our fair usage limits (maximum ₹500 per account) and
              require mobile number verification of invited accounts.
            </Text>
          </ScrollView>

          <TouchableOpacity style={styles.acceptBtn} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.acceptBtnText}>I Understand & Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    maxHeight: '80%',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    marginBottom: 16,
  },
  heading: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 10,
    marginBottom: 4,
  },
  text: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  acceptBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  acceptBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
