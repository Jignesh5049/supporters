import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X, Send } from 'lucide-react-native';
import { colors } from '../../../styles/theme';
import type { BuyerRequirement } from '../types';

export interface QuoteSubmissionModalProps {
  visible: boolean;
  requirement: BuyerRequirement | null;
  onClose: () => void;
  onSubmit: (data: { pricePerUnit: string; deliveryDays: string; note: string }) => void;
}

export function QuoteSubmissionModal({
  visible,
  requirement,
  onClose,
  onSubmit,
}: QuoteSubmissionModalProps) {
  const [pricePerUnit, setPricePerUnit] = useState('');
  const [deliveryDays, setDeliveryDays] = useState('7');
  const [note, setNote] = useState('');

  if (!requirement) return null;

  const handleSubmit = () => {
    if (!pricePerUnit.trim()) return;
    onSubmit({ pricePerUnit, deliveryDays, note });
    setPricePerUnit('');
    setNote('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Submit Quotation</Text>
              <Text style={styles.headerSub} numberOfLines={1}>
                {requirement.title}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Offered Unit Price (₹) *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 8.50"
              placeholderTextColor="#9CA3AF"
              keyboardType="decimal-pad"
              value={pricePerUnit}
              onChangeText={setPricePerUnit}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Estimated Delivery Time (Days)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 7"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              value={deliveryDays}
              onChangeText={setDeliveryDays}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Proposal Note & Specifications</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Include details regarding GST, logistics terms, and sample test reports..."
              placeholderTextColor="#9CA3AF"
              multiline
              value={note}
              onChangeText={setNote}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, !pricePerUnit.trim() && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!pricePerUnit.trim()}
          >
            <Send size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.submitBtnText}>Send Proposal to Buyer</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  headerSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  formGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textPrimary,
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  submitBtnDisabled: {
    backgroundColor: '#D1D5DB',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
