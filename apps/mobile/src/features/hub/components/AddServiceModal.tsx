import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { X } from 'lucide-react-native';
import { colors } from '../../../styles/theme';

export interface AddServiceModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (service: {
    title: string;
    startingPrice: string;
    priceUnit: string;
    category: string;
    description: string;
  }) => void;
}

export function AddServiceModal({ visible, onClose, onSubmit }: AddServiceModalProps) {
  const [title, setTitle] = useState('');
  const [startingPrice, setStartingPrice] = useState('');
  const [priceUnit, setPriceUnit] = useState('per project');
  const [category, setCategory] = useState('Industrial Services');
  const [description, setDescription] = useState('');

  const handleSubmit = () => {
    if (!title.trim() || !startingPrice.trim()) return;
    onSubmit({ title, startingPrice, priceUnit, category, description });
    setTitle('');
    setStartingPrice('');
    setDescription('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add New Service</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Service Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. CNC Precision Turning & Milling"
                placeholderTextColor="#9CA3AF"
                value={title}
                onChangeText={setTitle}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Starting Price (₹) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 5000"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  value={startingPrice}
                  onChangeText={setStartingPrice}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Billing Unit</Text>
                <TextInput
                  style={styles.input}
                  placeholder="per job / per hour / per unit"
                  placeholderTextColor="#9CA3AF"
                  value={priceUnit}
                  onChangeText={setPriceUnit}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Category</Text>
              <TextInput
                style={styles.input}
                placeholder="Category"
                placeholderTextColor="#9CA3AF"
                value={category}
                onChangeText={setCategory}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Service Scope & Capabilities</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe equipment capacity, turnaround times, quality certifications..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
                value={description}
                onChangeText={setDescription}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.submitBtn,
                (!title.trim() || !startingPrice.trim()) && styles.submitBtnDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!title.trim() || !startingPrice.trim()}
            >
              <Text style={styles.submitBtnText}>Save & List Service</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
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
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  closeBtn: {
    padding: 4,
  },
  inputGroup: {
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
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
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
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
